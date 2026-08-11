import { SITE_ORIGIN } from "../config/site-policy.mjs";

function normalizedPageUrl(rawValue, base = SITE_ORIGIN) {
  try {
    const url = new URL(rawValue, base);
    url.hash = "";
    url.search = "";
    return url.href;
  } catch {
    return null;
  }
}

function pageLanguage(page) {
  return (page.$("html").attr("lang") || "").trim().toLowerCase().split("-")[0];
}

function languageAlternate(page, language) {
  const matches = page.$('link[rel="alternate"][hreflang]').map((_, element) => {
    const hreflang = (page.$(element).attr("hreflang") || "").trim().toLowerCase();
    const href = page.$(element).attr("href") || "";
    return { hreflang, href };
  }).get().filter(({ hreflang, href }) => href && hreflang.split("-")[0] === language);

  const preferred = matches.find(({ hreflang }) => hreflang === language) || matches[0];
  return preferred ? normalizedPageUrl(preferred.href, page.canonical) : null;
}

function bilingualIdentity(page, pagesByCanonical) {
  const language = pageLanguage(page);
  const otherLanguage = language === "fr" ? "en" : language === "en" ? "fr" : null;
  const alternate = otherLanguage ? languageAlternate(page, otherLanguage) : null;
  const canonical = normalizedPageUrl(page.canonical);
  if (alternate && pagesByCanonical.has(alternate)) return [canonical, alternate].sort().join(" ↔ ");
  return canonical;
}

function internalTarget(rawHref, page, pagesByCanonical, siteOrigin) {
  if (!rawHref || /^(#|mailto:|tel:|javascript:|data:)/i.test(rawHref)) return null;
  try {
    const url = new URL(rawHref, page.canonical);
    if (url.origin !== siteOrigin) return null;
    return {
      url,
      page: pagesByCanonical.get(normalizedPageUrl(url.href)) || null
    };
  } catch {
    return null;
  }
}

function isProjectHost(rawHref, page, siteOrigin) {
  try {
    const url = new URL(rawHref, page.canonical);
    const siteHostname = new URL(siteOrigin).hostname.replace(/^www\./, "");
    return url.hostname === siteHostname || url.hostname === `www.${siteHostname}`;
  } catch {
    return false;
  }
}

function navigationIdentities(page, surface, pagesByCanonical, siteOrigin) {
  const identities = new Set();
  const anchors = surface === "primary"
    ? page.$("nav").first().find("a[href]")
    : page.$("footer a[href]");
  anchors.each((_, element) => {
    const href = page.$(element).attr("href") || "";
    const target = internalTarget(href, page, pagesByCanonical, siteOrigin);
    if (target?.page) identities.add(bilingualIdentity(target.page, pagesByCanonical));
  });
  return identities;
}

function setDifference(first, second) {
  return [...first].filter((value) => !second.has(value)).sort();
}

export function auditInternalLinkPolicy(pages, { siteOrigin = SITE_ORIGIN } = {}) {
  const findings = [];
  const pagesByCanonical = new Map(
    pages.map((page) => [normalizedPageUrl(page.canonical), page])
  );

  for (const page of pages) {
    const sourceLanguage = pageLanguage(page);
    page.$("a[href]").each((_, element) => {
      const rawHref = (page.$(element).attr("href") || "").trim();
      if (isProjectHost(rawHref, page, siteOrigin)) {
        try {
          const url = new URL(rawHref, page.canonical);
          if (url.origin !== siteOrigin) {
            findings.push({
              rule: "links.internal-origin-alias",
              page,
              element,
              message: `Origine interne inattendue : ${url.origin}; utiliser ${siteOrigin}.`
            });
          }
        } catch {}
      }
      const target = internalTarget(rawHref, page, pagesByCanonical, siteOrigin);
      if (!target) return;

      if (!rawHref.startsWith(`${siteOrigin}/`) && rawHref !== siteOrigin) {
        findings.push({
          rule: "links.internal-absolute",
          page,
          element,
          message: `Lien interne non absolu : ${rawHref}`
        });
      }

      if (!target.page || !sourceLanguage) return;
      const targetLanguage = pageLanguage(target.page);
      if (!targetLanguage || targetLanguage === sourceLanguage) return;

      const directLanguageSwitch = languageAlternate(page, targetLanguage);
      if (directLanguageSwitch === normalizedPageUrl(target.url.href)) return;

      const sameLanguageTarget = languageAlternate(target.page, sourceLanguage);
      if (!sameLanguageTarget || !pagesByCanonical.has(sameLanguageTarget)) return;

      findings.push({
        rule: "links.internal-language-crossing",
        page,
        element,
        message:
          `Lien ${sourceLanguage.toUpperCase()} vers ${targetLanguage.toUpperCase()} inutile : ` +
          `${target.url.href}; équivalent ${sourceLanguage.toUpperCase()} disponible : ${sameLanguageTarget}`
      });
    });
  }

  const visitedPairs = new Set();
  for (const page of pages) {
    const language = pageLanguage(page);
    const otherLanguage = language === "fr" ? "en" : language === "en" ? "fr" : null;
    if (!otherLanguage) continue;
    const alternateCanonical = languageAlternate(page, otherLanguage);
    const counterpart = alternateCanonical ? pagesByCanonical.get(alternateCanonical) : null;
    if (!counterpart) continue;

    const pairKey = [normalizedPageUrl(page.canonical), alternateCanonical].sort().join(" ↔ ");
    if (visitedPairs.has(pairKey)) continue;
    visitedPairs.add(pairKey);

    for (const surface of [
      { rule: "navigation.primary-language-parity", key: "primary", label: "navigation principale" },
      { rule: "navigation.footer-language-parity", key: "footer", label: "footer" }
    ]) {
      const firstLinks = navigationIdentities(page, surface.key, pagesByCanonical, siteOrigin);
      const secondLinks = navigationIdentities(counterpart, surface.key, pagesByCanonical, siteOrigin);
      const onlyFirst = setDifference(firstLinks, secondLinks);
      const onlySecond = setDifference(secondLinks, firstLinks);
      if (!onlyFirst.length && !onlySecond.length) continue;

      findings.push({
        rule: surface.rule,
        page,
        element: null,
        message:
          `Asymétrie de ${surface.label} pour ${pairKey}. ` +
          `Seulement ${language.toUpperCase()} : ${onlyFirst.join(", ") || "aucun"}; ` +
          `seulement ${otherLanguage.toUpperCase()} : ${onlySecond.join(", ") || "aucun"}.`
      });
    }
  }

  return findings;
}
