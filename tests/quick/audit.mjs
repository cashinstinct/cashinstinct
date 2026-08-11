import fs from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { HtmlValidate } from "html-validate";
import { parse as parseJavaScript } from "acorn";
import { imageSize } from "image-size";
import htmlValidateConfig from "../../html-validate.config.mjs";
import {
  SITE_ORIGIN,
  expectedXDefault,
  intentionalExceptions,
  referralCodes
} from "../config/site-policy.mjs";
import {
  asLocalUrl,
  canonicalFromRoute,
  discoverPages,
  diskPathForUrl,
  elementLine,
  lineOf,
  readSitemap,
  rootDir,
  valuesOfLink,
  valuesOfMeta,
  walkJson
} from "../lib/site.mjs";
import { auditInternalLinkPolicy } from "../lib/internal-link-policy.mjs";
import { auditStaticExternalLinks } from "../lib/external-link-policy.mjs";
import { auditAccessibleNames } from "../lib/accessibility-policy.mjs";

const startedAt = performance.now();
const findings = [];
const definitionsById = new Map();
const reportedIdConflicts = new Set();
const exactFaqAnswerFailures = new Map();
let exactFaqPageCount = 0;
let exactFaqQuestionCount = 0;
let exactFaqQuestionFailureCount = 0;

function jsonLdContradiction(id, first, second) {
  for (const property of ["url", "contentUrl", "embedUrl"]) {
    if (
      property in first &&
      property in second &&
      JSON.stringify(first[property]) !== JSON.stringify(second[property])
    ) {
      const values = [JSON.stringify(first[property]), JSON.stringify(second[property])].sort();
      return `${property} diffère (${values.join(" / ")})`;
    }
  }

  if (id.endsWith("#organization") || id.endsWith("#website")) {
    const firstTypes = new Set(
      (Array.isArray(first["@type"]) ? first["@type"] : [first["@type"]]).filter(Boolean)
    );
    const secondTypes = new Set(
      (Array.isArray(second["@type"]) ? second["@type"] : [second["@type"]]).filter(Boolean)
    );
    if (
      firstTypes.size &&
      secondTypes.size &&
      ![...firstTypes].some((type) => secondTypes.has(type))
    ) {
      const values = [[...firstTypes].sort().join(", "), [...secondTypes].sort().join(", ")].sort();
      return `@type diffère (${values.join(" / ")})`;
    }
  }

  return null;
}

function add(level, rule, page, message, line = null) {
  findings.push({
    level,
    rule,
    file: page?.relativeFile ?? "site",
    line,
    message
  });
}

const error = (...args) => add("error", ...args);
const warning = (...args) => add("warning", ...args);

function oneRequired(page, values, rule, label) {
  if (values.length !== 1 || !values[0]) {
    error(rule, page, `${label} doit être présent une seule fois et être non vide.`);
    return null;
  }
  return values[0];
}

function sameDateOrEarlier(first, second) {
  return /^\d{4}-\d{2}-\d{2}$/.test(first) &&
    /^\d{4}-\d{2}-\d{2}$/.test(second) &&
    first <= second;
}

function extensionMatchesType(file, type) {
  const extension = path.extname(file).toLowerCase();
  const normalizedType = String(type).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return normalizedType === "jpg";
  return extension === `.${normalizedType}`;
}

function normalizeComparableText(value) {
  return String(value)
    .normalize("NFC")
    .replace(/[\u00a0\u202f]/g, " ")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function hasJsonLdType(node, expectedType) {
  const types = Array.isArray(node?.["@type"]) ? node["@type"] : [node?.["@type"]];
  return types.includes(expectedType);
}

const pages = await discoverPages();
const pagesByCanonical = new Map(pages.map((page) => [page.canonical, page]));
const pagesByRoute = new Map(pages.map((page) => [page.route, page]));
const sitemapEntries = await readSitemap();
const sitemapByUrl = new Map(sitemapEntries.map((entry) => [entry.loc, entry]));
const htmlValidator = new HtmlValidate(htmlValidateConfig);
const now = new Date().toISOString().slice(0, 10);

for (const finding of auditInternalLinkPolicy(pages)) {
  error(
    finding.rule,
    finding.page,
    finding.message,
    finding.element ? elementLine(finding.page, finding.element) : null
  );
}

for (const finding of auditStaticExternalLinks(pages)) {
  error(
    finding.rule,
    finding.page,
    finding.message,
    finding.element ? elementLine(finding.page, finding.element) : null
  );
}

for (const finding of auditAccessibleNames(pages)) {
  error(
    finding.rule,
    finding.page,
    finding.message,
    finding.element ? elementLine(finding.page, finding.element) : null
  );
}

for (const page of pages) {
  const { $, html } = page;

  const htmlReport = await htmlValidator.validateString(html, page.absoluteFile);
  for (const result of htmlReport.results) {
    for (const message of result.messages) {
      add(
        message.severity === 2 ? "error" : "warning",
        `html.${message.ruleId}`,
        page,
        message.message,
        message.line
      );
    }
  }

  const titleElements = $("title");
  const title = oneRequired(
    page,
    titleElements.map((_, element) => $(element).text().trim()).get(),
    "meta.title",
    "<title>"
  );
  if (title && title.length > 70) {
    warning("meta.title-length", page, `Titre long (${title.length} caractères).`, elementLine(page, titleElements[0]));
  }

  const descriptions = valuesOfMeta($, "description");
  const description = oneRequired(page, descriptions, "meta.description", "meta description");
  if (description && description.length > 170) {
    warning("meta.description-length", page, `Meta description longue (${description.length} caractères).`);
  }

  oneRequired(page, valuesOfMeta($, "robots"), "meta.robots", "meta robots");
  const canonical = oneRequired(page, valuesOfLink($, "canonical"), "seo.canonical", "canonical");
  if (canonical && canonical !== page.canonical) {
    error("seo.canonical-path", page, `Canonical attendu ${page.canonical}, reçu ${canonical}.`);
  }

  const ogUrl = oneRequired(page, valuesOfMeta($, "og:url", "property"), "og.url", "og:url");
  if (canonical && ogUrl && ogUrl !== canonical) {
    error("og.url-canonical", page, `og:url (${ogUrl}) diffère du canonical (${canonical}).`);
  }

  for (const property of ["og:type", "og:title", "og:description", "og:locale", "og:image"]) {
    oneRequired(page, valuesOfMeta($, property, "property"), `og.${property.slice(3)}`, property);
  }
  for (const name of ["twitter:card", "twitter:title", "twitter:description", "twitter:image"]) {
    oneRequired(page, valuesOfMeta($, name), `twitter.${name.slice(8)}`, name);
  }

  const h1Elements = $("h1");
  if (h1Elements.length !== 1 || !$(h1Elements[0]).text().trim()) {
    error("headings.h1", page, `Un seul H1 non vide est requis; trouvé : ${h1Elements.length}.`);
  }
  let previousHeading = 0;
  $("h1,h2,h3,h4,h5,h6").each((_, element) => {
    const current = Number(element.tagName.slice(1));
    if (previousHeading && current > previousHeading + 1) {
      error(
        "headings.order",
        page,
        `Saut de H${previousHeading} vers H${current}.`,
        elementLine(page, element)
      );
    }
    previousHeading = current;
  });

  const expectedLanguage = page.route === "/" || page.route.includes("/fr/") ? "fr" : "en";
  const documentLanguage = $("html").attr("lang") ?? "";
  if (!documentLanguage.toLowerCase().startsWith(expectedLanguage)) {
    error("language.html-lang", page, `lang="${documentLanguage}" ne correspond pas à ${expectedLanguage}.`);
  }
  const ogLocale = valuesOfMeta($, "og:locale", "property")[0] ?? "";
  const expectedLocale = expectedLanguage === "fr" ? "fr_CA" : "en_CA";
  if (ogLocale !== expectedLocale) {
    error("language.og-locale", page, `og:locale attendu ${expectedLocale}, reçu ${ogLocale || "absent"}.`);
  }

  const hreflangs = new Map();
  $('link[rel="alternate"][hreflang]').each((_, element) => {
    hreflangs.set($(element).attr("hreflang"), $(element).attr("href"));
  });
  const languageHref = hreflangs.get(expectedLanguage);
  if (languageHref !== page.canonical) {
    error("hreflang.self", page, `hreflang ${expectedLanguage} doit pointer vers ${page.canonical}.`);
  }
  for (const language of ["fr", "en"]) {
    const href = hreflangs.get(language);
    if (!href || !pagesByCanonical.has(href)) {
      error("hreflang.destination", page, `Destination ${language} absente ou inconnue : ${href || "absente"}.`);
    } else {
      const destination = pagesByCanonical.get(href);
      const destinationHreflangs = new Map();
      destination.$('link[rel="alternate"][hreflang]').each((_, element) => {
        destinationHreflangs.set(
          destination.$(element).attr("hreflang"),
          destination.$(element).attr("href")
        );
      });
      const backHref = destinationHreflangs.get(expectedLanguage);
      if (backHref !== page.canonical) {
        error("hreflang.reciprocal", page, `${href} ne renvoie pas vers ${page.canonical}.`);
      }
    }
  }
  const xDefault = hreflangs.get("x-default");
  const expectedDefault = `${SITE_ORIGIN}${expectedXDefault(page.route)}`;
  if (xDefault !== expectedDefault) {
    error("hreflang.x-default", page, `x-default attendu ${expectedDefault}, reçu ${xDefault || "absent"}.`);
  }

  const ids = new Set(
    $("[id]").map((_, element) => $(element).attr("id")).get().filter(Boolean)
  );
  const checkReference = (element, attribute) => {
    const raw = $(element).attr(attribute);
    if (!raw) return;
    for (const id of raw.split(/\s+/).filter(Boolean)) {
      if (!ids.has(id)) {
        error(
          "aria.missing-reference",
          page,
          `${attribute} référence l’ID absent "${id}".`,
          elementLine(page, element)
        );
      }
    }
  };
  $("[aria-labelledby]").each((_, element) => checkReference(element, "aria-labelledby"));
  $("[aria-describedby]").each((_, element) => checkReference(element, "aria-describedby"));

  const internalTargets = [];
  $("a[href]").each((_, element) => {
    const rawHref = $(element).attr("href");
    if (rawHref?.startsWith("file://")) {
      error("links.file-url", page, `Lien file:// interdit : ${rawHref}`, elementLine(page, element));
      return;
    }
    const url = asLocalUrl(rawHref, page.canonical);
    if (url) internalTargets.push({ url, element, kind: "link" });
  });
  $("img[src],script[src],link[rel='stylesheet'][href],link[rel='icon'][href]").each((_, element) => {
    const raw = $(element).attr("src") ?? $(element).attr("href");
    const url = asLocalUrl(raw, page.canonical);
    if (url) internalTargets.push({ url, element, kind: "resource" });
  });
  for (const match of html.matchAll(/url\(\s*(['"]?)(?!data:)([^)'"]+)\1\s*\)/gi)) {
    const url = asLocalUrl(match[2].trim(), page.canonical);
    if (url) internalTargets.push({ url, element: null, kind: "resource" });
  }

  for (const target of internalTargets) {
    const targetFile = diskPathForUrl(target.url);
    try {
      await fs.access(targetFile);
    } catch {
      error(
        target.kind === "link" ? "links.internal-missing" : "resources.local-missing",
        page,
        `${target.url.href} ne correspond à aucun fichier local.`,
        target.element ? elementLine(page, target.element) : null
      );
      continue;
    }
    if (target.kind === "link" && target.url.hash) {
      const targetPage = target.url.pathname.endsWith("/")
        ? pagesByRoute.get(target.url.pathname)
        : null;
      if (targetPage) {
        const id = decodeURIComponent(target.url.hash.slice(1));
        const targetIds = new Set(
          targetPage.$("[id]")
            .map((_, element) => targetPage.$(element).attr("id"))
            .get()
            .filter(Boolean)
        );
        if (id && !targetIds.has(id)) {
          error(
            "links.anchor-missing",
            page,
            `Ancre ${target.url.hash} absente de ${target.url.pathname}.`,
            target.element ? elementLine(page, target.element) : null
          );
        }
      }
    }
  }

  for (const metaName of ["og:image", "twitter:image"]) {
    const attribute = metaName.startsWith("og:") ? "property" : "name";
    const rawUrl = valuesOfMeta($, metaName, attribute)[0];
    const url = asLocalUrl(rawUrl, page.canonical);
    if (!url) continue;
    const file = diskPathForUrl(url);
    try {
      const bytes = await fs.readFile(file);
      const dimensions = imageSize(bytes);
      if (!extensionMatchesType(file, dimensions.type)) {
        error("images.signature", page, `${rawUrl} est de type ${dimensions.type}, incompatible avec son extension.`);
      }
      if (metaName === "og:image") {
        const declaredWidth = Number(valuesOfMeta($, "og:image:width", "property")[0]);
        const declaredHeight = Number(valuesOfMeta($, "og:image:height", "property")[0]);
        if (!declaredWidth || !declaredHeight) {
          error("images.og-dimensions-meta", page, "og:image:width et og:image:height sont requis.");
        } else if (dimensions.width !== declaredWidth || dimensions.height !== declaredHeight) {
          error(
            "images.og-dimensions",
            page,
            `${rawUrl} mesure ${dimensions.width}×${dimensions.height}, métadonnées ${declaredWidth}×${declaredHeight}.`
          );
        }
      }
    } catch (cause) {
      error("images.read", page, `Impossible de lire ${rawUrl} comme image : ${cause.message}`);
    }
  }

  const jsonScripts = $('script[type="application/ld+json"]');
  const jsonLdDocuments = [];
  jsonScripts.each((_, element) => {
    const raw = $(element).text();
    const scriptLine = elementLine(page, element);
    let document;
    try {
      document = JSON.parse(raw);
    } catch (cause) {
      error("jsonld.parse", page, cause.message, scriptLine);
      return;
    }
    jsonLdDocuments.push(document);
    if (!document["@context"]) {
      error("jsonld.context", page, "@context absent du bloc JSON-LD.", scriptLine);
    }
    const roots = document["@graph"] ?? [document];
    for (const root of Array.isArray(roots) ? roots : [roots]) {
      if (!root?.["@type"]) {
        error("jsonld.type", page, "@type absent d’une entité JSON-LD.", scriptLine);
      }
    }

    walkJson(document, (node) => {
      const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
      const forbiddenTypes = types.filter((type) => type === "AggregateRating" || type === "Review");
      const forbiddenProperties = ["reviewRating", "aggregateRating"].filter((property) => property in node);
      if (forbiddenTypes.length || forbiddenProperties.length) {
        const details = [
          forbiddenTypes.length ? `type ${forbiddenTypes.join(", ")}` : null,
          forbiddenProperties.length ? `propriété ${forbiddenProperties.join(", ")}` : null
        ].filter(Boolean).join(" et ");
        error("jsonld.forbidden-review", page, `${details} interdit dans les données structurées.`, scriptLine);
      }
      if (node["@type"] === "Offer" && "price" in node) {
        warning(
          "schema.offer-price-deferred",
          page,
          `Offer.price=${JSON.stringify(node.price)} doit être revu dans le chantier I-01.`,
          scriptLine
        );
      }
      if (node.datePublished && node.dateModified) {
        if (!sameDateOrEarlier(String(node.datePublished), String(node.dateModified))) {
          error("dates.order", page, `datePublished ${node.datePublished} est après dateModified ${node.dateModified}.`, scriptLine);
        }
      }
      if (node.dateModified && String(node.dateModified) > now) {
        error("dates.future", page, `dateModified future : ${node.dateModified}.`, scriptLine);
      }
      if (node["@id"]) {
        const id = String(node["@id"]);
        const previousDefinitions = definitionsById.get(id) ?? [];
        for (const previous of previousDefinitions) {
          const contradiction = jsonLdContradiction(id, previous.node, node);
          if (contradiction) {
            const conflictKey = `${id}\u0000${contradiction}`;
            if (!reportedIdConflicts.has(conflictKey)) {
              error(
                "jsonld.id-conflict",
                page,
                `${id} contredit ${previous.file} : ${contradiction}.`,
                scriptLine
              );
              reportedIdConflicts.add(conflictKey);
            }
            break;
          }
        }
        previousDefinitions.push({ node, file: page.relativeFile });
        definitionsById.set(id, previousDefinitions);
      }
      for (const [key, value] of Object.entries(node)) {
        if (typeof value !== "string") continue;
        if (/^http:\/\/cashinstinct\.ca/i.test(value)) {
          error("jsonld.internal-http", page, `${key} utilise HTTP : ${value}`, scriptLine);
        }
        if (/^https?:\/\//i.test(value)) {
          try {
            const url = new URL(value);
            if (url.hostname.endsWith("cashinstinct.ca") && url.origin !== SITE_ORIGIN) {
              error("jsonld.internal-origin", page, `${key} utilise une origine interne inattendue : ${value}`, scriptLine);
            }
          } catch {
            error("jsonld.url", page, `${key} contient une URL invalide : ${value}`, scriptLine);
          }
        }
      }
    });
  });

  const jsonLdNodes = jsonLdDocuments.flatMap((document) => {
    const roots = document["@graph"] ?? [document];
    return Array.isArray(roots) ? roots : [roots];
  });
  const jsonLdLine = jsonScripts.length ? elementLine(page, jsonScripts[0]) : null;
  const webPage = jsonLdNodes.find((node) => hasJsonLdType(node, "WebPage"));
  if (description && typeof webPage?.description === "string") {
    if (normalizeComparableText(webPage.description) !== normalizeComparableText(description)) {
      error(
        "schema.webpage-description",
        page,
        "WebPage.description doit correspondre à la meta description.",
        jsonLdLine
      );
    }
  }
  if (title && typeof webPage?.name === "string" && normalizeComparableText(webPage.name) !== normalizeComparableText(title)) {
    error(
      "schema.title-surface",
      page,
      "WebPage.name doit correspondre au title.",
      jsonLdLine
    );
  }

  const faqPage = jsonLdNodes.find((node) => hasJsonLdType(node, "FAQPage"));
  if (faqPage) {
    exactFaqPageCount += 1;
    const visibleQuestions = $("#faq summary");
    const schemaQuestions = Array.isArray(faqPage.mainEntity) ? faqPage.mainEntity : [];
    const exactFailuresForPage = [];
    if (visibleQuestions.length !== schemaQuestions.length) {
      error(
        "schema.faq-visible-count",
        page,
        `FAQ visible (${visibleQuestions.length}) et FAQ JSON-LD (${schemaQuestions.length}) doivent avoir le même nombre de questions.`,
        jsonLdLine
      );
    }
    const questionCount = Math.min(visibleQuestions.length, schemaQuestions.length);
    for (let index = 0; index < questionCount; index += 1) {
      exactFaqQuestionCount += 1;
      const visibleName = normalizeComparableText($(visibleQuestions[index]).text());
      const schemaName = normalizeComparableText(schemaQuestions[index]?.name ?? "");
      if (visibleName !== schemaName) {
        error(
          "schema.faq-visible-name",
          page,
          `FAQ Q${index + 1} visible et JSON-LD doivent avoir le même libellé.`,
          elementLine(page, visibleQuestions[index])
        );
      }

      const question = schemaQuestions[index];
      const acceptedAnswer = question?.acceptedAnswer;
      const schemaAnswer = normalizeComparableText(acceptedAnswer?.text ?? "");
      if (!schemaAnswer) {
        error(
          "schema.faq-answer-text",
          page,
          `FAQ Q${index + 1} doit avoir un acceptedAnswer.text non vide.`,
          jsonLdLine
        );
      }

      const questionId = $(visibleQuestions[index]).attr("id") ?? "";
      const linkedAnswer = $("#faq [aria-labelledby]").filter((_, element) =>
        ($(element).attr("aria-labelledby") ?? "").split(/\s+/).includes(questionId)
      ).first();
      const fallbackAnswer = $(visibleQuestions[index]).parent().find(".faq-body").first();
      const answerElement = linkedAnswer.length ? linkedAnswer : fallbackAnswer;
      const visibleAnswer = normalizeComparableText(answerElement.text());
      if (!answerElement.length || !visibleAnswer) {
        error(
          "schema.faq-visible-answer",
          page,
          `FAQ Q${index + 1} doit avoir une réponse HTML visible (liée par aria-labelledby ou présente dans .faq-body).`,
          elementLine(page, visibleQuestions[index])
        );
      }

      if (visibleAnswer !== schemaAnswer) {
        exactFaqQuestionFailureCount += 1;
        exactFailuresForPage.push(index + 1);
      }
    }
    if (visibleQuestions.length !== schemaQuestions.length || exactFailuresForPage.length) {
      exactFaqAnswerFailures.set(page.relativeFile, exactFailuresForPage);
    }
  }

  $("script:not([src]):not([type='application/ld+json'])").each((_, element) => {
    const source = $(element).text();
    if (!source.trim()) return;
    try {
      parseJavaScript(source, { ecmaVersion: "latest", sourceType: "script" });
    } catch (cause) {
      error("javascript.syntax", page, cause.message, elementLine(page, element));
    }
  });

  const modifiedDates = [];
  jsonScripts.each((_, element) => {
    try {
      const document = JSON.parse($(element).text());
      walkJson(document, (node) => {
        if (node.dateModified) modifiedDates.push(String(node.dateModified));
      });
    } catch {}
  });
  const sitemapEntry = sitemapByUrl.get(page.canonical);
  if (!sitemapEntry) {
    error("sitemap.page-missing", page, `${page.canonical} est absent du sitemap.`);
  } else if (modifiedDates.length) {
    for (const modified of new Set(modifiedDates)) {
      if (modified !== sitemapEntry.lastmod) {
        error(
          "dates.sitemap-lastmod",
          page,
          `dateModified ${modified} diffère du lastmod ${sitemapEntry.lastmod}.`
        );
      }
    }
  }
}

for (const entry of sitemapEntries) {
  if (!pagesByCanonical.has(entry.loc)) {
    error("sitemap.orphan", null, `${entry.loc} ne correspond à aucune page découverte.`);
  }
}

for (const [section, code] of referralCodes) {
  const pair = pages.filter((page) => page.route.startsWith(`/${section}/`));
  if (pair.length !== 2) {
    error("language.referral-pair", null, `${section} devrait avoir deux pages, trouvé : ${pair.length}.`);
    continue;
  }
  for (const page of pair) {
    if (!page.html.includes(code)) {
      error("language.referral-code", page, `Le code attendu ${code} est absent.`);
    }
  }
}

for (const exception of intentionalExceptions) {
  add("exception", exception.rule, null, exception.description);
}

const order = { error: 0, warning: 1, exception: 2 };
findings.sort((a, b) =>
  order[a.level] - order[b.level] ||
  a.file.localeCompare(b.file) ||
  (a.line ?? 0) - (b.line ?? 0) ||
  a.rule.localeCompare(b.rule)
);

const labels = {
  error: "ERREUR",
  warning: "AVERTISSEMENT",
  exception: "EXCEPTION INTENTIONNELLE"
};
for (const finding of findings) {
  const location = `${finding.file}${finding.line ? `:${finding.line}` : ""}`;
  console.log(`[${labels[finding.level]}] ${location} — ${finding.rule}`);
  console.log(`  ${finding.message}`);
}

const totals = {
  error: findings.filter((finding) => finding.level === "error").length,
  warning: findings.filter((finding) => finding.level === "warning").length,
  exception: findings.filter((finding) => finding.level === "exception").length
};
const duration = ((performance.now() - startedAt) / 1000).toFixed(2);

console.log("\nAudit rapide Cash Instinct");
console.log(`  Pages découvertes : ${pages.length}`);
console.log(`  Entrées sitemap   : ${sitemapEntries.length}`);
console.log(`  Erreurs bloquantes: ${totals.error}`);
console.log(`  Avertissements    : ${totals.warning}`);
console.log(`  Exceptions voulues: ${totals.exception}`);
const exactFaqPagesWithoutFailure = exactFaqPageCount - exactFaqAnswerFailures.size;
console.log(
  `  FAQ réponses exactes: ${exactFaqPagesWithoutFailure}/${exactFaqPageCount} pages, ` +
  `${exactFaqQuestionCount - exactFaqQuestionFailureCount}/${exactFaqQuestionCount} réponses ` +
  `(rapport informatif)`
);
if (exactFaqAnswerFailures.size) {
  console.log("  Écarts exacts FAQ par page:");
  for (const [file, questions] of exactFaqAnswerFailures) {
    console.log(`    - ${file}: ${questions.length ? `Q${questions.join(", Q")}` : "nombre de questions différent"}`);
  }
}
console.log(`  Durée             : ${duration} s`);

process.exitCode = totals.error > 0 ? 1 : 0;
