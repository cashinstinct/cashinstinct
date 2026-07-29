import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { performance } from "node:perf_hooks";
import fg from "fast-glob";
import { parse as parseJavaScript } from "acorn";
import postcss from "postcss";
import selectorParser from "postcss-selector-parser";
import {
  discoverPages,
  elementLine,
  rootDir
} from "../lib/site.mjs";
import { ignoredDirectories } from "../config/site-policy.mjs";

const startedAt = performance.now();
const findings = [];
const duplicateJavaScriptGroups = [];
const potentialCssSelectors = new Map();
const locallyUnreferencedImages = new Set();
const selectorIssues = [];
const orphanIdRecords = [];

const EBOX_COUNTDOWN_SELECTORS = new Set([
  "cd-days",
  "cd-hours",
  "cd-mins",
  "cd-secs",
  "countdown-bar",
  "hero-expired-notice"
]);

const EBOX_COUNTDOWN_CSS = new Set([
  ".countdown-label",
  ".countdown-units",
  ".countdown-unit",
  ".promo-expired-notice"
]);

const LEVEL = {
  certain: { order: 0, label: "ERREUR CERTAINE" },
  strong: { order: 1, label: "AVERTISSEMENT FORT" },
  manual: { order: 2, label: "ÉLÉMENT FACULTATIF" },
  exception: { order: 3, label: "EXCEPTION INTENTIONNELLE" },
  info: { order: 4, label: "INFORMATION" }
};

function isEboxPair(pair) {
  return pair === "ebox/{lang}/index.html";
}

function add(level, rule, file, line, explanation, evidence, suggestion) {
  findings.push({
    level,
    rule,
    file: file || "site",
    line: line || null,
    explanation,
    evidence,
    suggestion
  });
}

function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function lineFromIndex(source, index) {
  return source.slice(0, Math.max(0, index)).split("\n").length;
}

function walkAst(node, visit, parent = null) {
  if (!node || typeof node !== "object") return;
  if (typeof node.type === "string") visit(node, parent);
  for (const [key, value] of Object.entries(node)) {
    if (["start", "end", "loc", "range"].includes(key)) continue;
    if (Array.isArray(value)) {
      for (const child of value) walkAst(child, visit, node);
    } else if (value && typeof value === "object") {
      walkAst(value, visit, node);
    }
  }
}

function literalString(node) {
  if (node?.type === "Literal" && typeof node.value === "string") return node.value;
  if (node?.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0]?.value?.cooked ?? "";
  }
  return null;
}

function memberName(node) {
  if (node?.type !== "MemberExpression") return null;
  if (!node.computed && node.property?.type === "Identifier") return node.property.name;
  return literalString(node.property);
}

function normalizeJavaScript(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g, "<string>")
    .replace(/\b\d+(?:\.\d+)?\b/g, "<number>")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDataLiteral(source) {
  return source
    .replace(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g, "<string>")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDeclarations(rule) {
  return rule.nodes
    .filter((node) => node.type === "decl")
    .map((decl) => `${decl.prop.trim().toLowerCase()}:${decl.value.trim()}${decl.important ? "!important" : ""}`)
    .sort()
    .join(";");
}

function languagePairKey(relativeFile) {
  return relativeFile.replace(/\/(?:fr|en)\/index\.html$/, "/{lang}/index.html");
}

function isOnlyLanguagePair(files) {
  if (files.length !== 2) return false;
  return languagePairKey(files[0]) === languagePairKey(files[1]) &&
    files.some((file) => file.includes("/fr/")) &&
    files.some((file) => file.includes("/en/"));
}

function selectorTokens(selector) {
  const classes = new Set();
  const ids = new Set();
  const attributes = new Set();
  let hasPseudo = false;
  let hasCombinator = false;
  const ast = selectorParser().astSync(selector);
  ast.walk((node) => {
    if (node.type === "class") classes.add(node.value);
    if (node.type === "id") ids.add(node.value);
    if (node.type === "attribute") attributes.add(node.attribute);
    if (node.type === "pseudo") hasPseudo = true;
    if (node.type === "combinator") hasCombinator = true;
  });
  return { classes, ids, attributes, hasPseudo, hasCombinator };
}

function selectorMatches($, selector) {
  try {
    return $(selector).length > 0;
  } catch {
    return false;
  }
}

function staticSelectorCandidate(selector, tokens) {
  if (tokens.hasPseudo || tokens.hasCombinator || tokens.attributes.size) return false;
  return tokens.classes.size + tokens.ids.size > 0;
}

function collectMarkupEvidence(value, dynamicClasses, dynamicIds, dynamicAttributes) {
  if (!value) return;
  for (const match of value.matchAll(/\bclass\s*=\s*["']([^"']+)["']/gi)) {
    match[1].split(/\s+/).filter(Boolean).forEach((name) => dynamicClasses.add(name));
  }
  for (const match of value.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)) {
    dynamicIds.add(match[1]);
  }
  for (const match of value.matchAll(/\b(data-[\w-]+)\s*=/gi)) {
    dynamicAttributes.add(match[1]);
  }
  const trimmed = value.trim();
  if (/^[a-z_][\w-]*$/i.test(trimmed)) dynamicClasses.add(trimmed);
  for (const match of value.matchAll(/\b[a-z][a-z0-9_]*-[a-z0-9_-]+\b/gi)) {
    dynamicClasses.add(match[0]);
  }
}

const pages = await discoverPages();
const pageByPair = new Map();
for (const page of pages) {
  const key = languagePairKey(page.relativeFile);
  if (!pageByPair.has(key)) pageByPair.set(key, []);
  pageByPair.get(key).push(page);
}

const scriptRecords = [];
const dataLiteralRecords = [];
const cssBlockRecords = [];
const allSourceText = [];

for (const page of pages) {
  const { $, html } = page;
  allSourceText.push(html);

  const ids = new Map();
  $("[id]").each((_, element) => {
    const id = $(element).attr("id");
    if (!id) return;
    const entries = ids.get(id) ?? [];
    entries.push(elementLine(page, element));
    ids.set(id, entries);
  });
  for (const [id, lines] of ids) {
    if (lines.length > 1) {
      add(
        "certain",
        "html.duplicate-id",
        page.relativeFile,
        lines[0],
        `L’ID "${id}" apparaît plusieurs fois dans la même page.`,
        `Lignes : ${lines.join(", ")}.`,
        "Attribuer un ID unique à chaque élément après vérification des références associées."
      );
    }
  }

  const htmlHandlers = $("[onclick],[onchange],[oninput],[onkeydown],[onkeyup],[onsubmit]")
    .map((_, element) =>
      Object.entries(element.attribs)
        .filter(([name]) => /^on/i.test(name))
        .map(([, value]) => value)
        .join("\n")
    )
    .get()
    .join("\n");

  const dynamicClasses = new Set();
  const dynamicIds = new Set();
  const dynamicAttributes = new Set();
  const selectorCalls = [];
  const listenerBindings = new Set();
  const functionDeclarations = [];
  const identifierCounts = new Map();

  $("script:not([src]):not([type='application/ld+json'])").each((index, element) => {
    const source = $(element).text();
    if (!source.trim()) return;
    const scriptLine = elementLine(page, element) ?? 1;
    let ast;
    try {
      ast = parseJavaScript(source, {
        ecmaVersion: "latest",
        sourceType: "script",
        locations: true,
        allowReturnOutsideFunction: true
      });
    } catch {
      return;
    }

    const normalized = normalizeJavaScript(source);
    if (normalized.length >= 100) {
      scriptRecords.push({
        file: page.relativeFile,
        line: scriptLine,
        index,
        source,
        normalized,
        signature: hash(normalized)
      });
    }

    walkAst(ast, (node, parent) => {
      if (node.type === "Literal" && typeof node.value === "string") {
        collectMarkupEvidence(node.value, dynamicClasses, dynamicIds, dynamicAttributes);
      }
      if (node.type === "TemplateElement") {
        collectMarkupEvidence(node.value?.raw, dynamicClasses, dynamicIds, dynamicAttributes);
      }

      if (node.type === "Identifier") {
        identifierCounts.set(node.name, (identifierCounts.get(node.name) ?? 0) + 1);
      }

      if (node.type === "FunctionDeclaration" && node.id?.name) {
        functionDeclarations.push({
          name: node.id.name,
          line: scriptLine + node.loc.start.line - 1
        });
      }
      if (
        node.type === "VariableDeclarator" &&
        node.id?.type === "Identifier" &&
        ["FunctionExpression", "ArrowFunctionExpression"].includes(node.init?.type)
      ) {
        functionDeclarations.push({
          name: node.id.name,
          line: scriptLine + node.loc.start.line - 1
        });
      }

      if (
        node.type === "VariableDeclarator" &&
        ["ArrayExpression", "ObjectExpression"].includes(node.init?.type)
      ) {
        const literalSource = source.slice(node.init.start, node.init.end).replace(/\s+/g, " ").trim();
        if (literalSource.length >= 120) {
          const normalizedLiteral = normalizeDataLiteral(literalSource);
          dataLiteralRecords.push({
            file: page.relativeFile,
            line: scriptLine + node.loc.start.line - 1,
            name: node.id?.name ?? "(anonyme)",
            normalized: normalizedLiteral,
            signature: hash(normalizedLiteral)
          });
        }
      }

      if (node.type === "CallExpression" && node.callee?.type === "MemberExpression") {
        const method = memberName(node.callee);
        const first = literalString(node.arguments[0]);
        if (["getElementById", "querySelector", "querySelectorAll"].includes(method) && first) {
          selectorCalls.push({
            method,
            selector: method === "getElementById" ? `#${first}` : first,
            raw: first,
            line: scriptLine + node.loc.start.line - 1,
            binding: parent?.type === "VariableDeclarator" && parent.id?.type === "Identifier"
              ? parent.id.name
              : null
          });
        }
        if (
          method === "addEventListener" &&
          node.callee.object?.type === "Identifier"
        ) {
          listenerBindings.add(node.callee.object.name);
        }
        if (["add", "remove", "toggle", "replace"].includes(method)) {
          for (const argument of node.arguments) {
            const value = literalString(argument);
            if (value) dynamicClasses.add(value);
          }
        }
        if (method === "setAttribute") {
          const attribute = literalString(node.arguments[0]);
          const value = literalString(node.arguments[1]);
          if (attribute) dynamicAttributes.add(attribute);
          if (attribute === "id" && value) dynamicIds.add(value);
          if (attribute === "class" && value) {
            value.split(/\s+/).filter(Boolean).forEach((item) => dynamicClasses.add(item));
          }
        }
      }

      if (node.type === "AssignmentExpression" && node.left?.type === "MemberExpression") {
        const property = memberName(node.left);
        const value = literalString(node.right);
        if (property === "id" && value) dynamicIds.add(value);
        if (property === "className" && value) {
          value.split(/\s+/).filter(Boolean).forEach((item) => dynamicClasses.add(item));
        }
      }

      if (
        node.type === "MemberExpression" &&
        node.object?.type === "MemberExpression" &&
        memberName(node.object) === "dataset"
      ) {
        const property = memberName(node);
        if (property) {
          dynamicAttributes.add(`data-${property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`);
        }
      }
    });
  });

  for (const declaration of functionDeclarations) {
    const references = identifierCounts.get(declaration.name) ?? 0;
    const usedByHtml = new RegExp(`\\b${declaration.name}\\s*\\(`).test(htmlHandlers);
    if (references === 1 && !usedByHtml) {
      add(
        "manual",
        "javascript.possibly-unused-function",
        page.relativeFile,
        declaration.line,
        `La fonction "${declaration.name}" est déclarée, mais aucun appel statique n’a été trouvé.`,
        "Une seule occurrence de son identifiant dans l’AST de la page; aucun gestionnaire HTML ne l’appelle.",
        "Vérifier les appels indirects, les API externes et l’exécution dynamique avant toute suppression."
      );
    }
  }

  for (const call of selectorCalls) {
    let matches = false;
    try {
      matches = selectorMatches($, call.selector);
    } catch {}
    if (matches) continue;

    let dynamicMatch = false;
    try {
      const tokens = selectorTokens(call.selector);
      dynamicMatch = [...tokens.classes].some((name) => dynamicClasses.has(name)) ||
        [...tokens.ids].some((name) => dynamicIds.has(name)) ||
        [...tokens.attributes].some((name) => dynamicAttributes.has(name));
    } catch {}
    selectorIssues.push({
      level: dynamicMatch ? "manual" : "strong",
      pair: languagePairKey(page.relativeFile),
      file: page.relativeFile,
      line: call.line,
      method: call.method,
      selector: call.selector,
      raw: call.raw,
      dynamicMatch,
      listenerAttached: Boolean(call.binding && listenerBindings.has(call.binding))
    });
  }

  const referencedIds = new Set();
  $("a[href^='#'],[aria-labelledby],[aria-describedby],label[for]").each((_, element) => {
    for (const attribute of ["href", "aria-labelledby", "aria-describedby", "for"]) {
      const raw = $(element).attr(attribute);
      if (!raw) continue;
      raw.replace(/^#/, "").split(/\s+/).filter(Boolean).forEach((id) => referencedIds.add(id));
    }
  });
  selectorCalls
    .filter((call) => call.method === "getElementById")
    .forEach((call) => referencedIds.add(call.raw));
  dynamicIds.forEach((id) => referencedIds.add(id));
  $("[data-target],[data-copy-target],[data-status],[data-copy-status]").each((_, element) => {
    for (const attribute of ["data-target", "data-copy-target", "data-status", "data-copy-status"]) {
      const value = $(element).attr(attribute);
      if (value) referencedIds.add(value.replace(/^#/, ""));
    }
  });

  const styleText = $("style").map((_, element) => $(element).text()).get().join("\n");
  const functionalOrphanIds = [];
  $("[id]").each((_, element) => {
    const id = $(element).attr("id");
    if (!id || referencedIds.has(id) || styleText.includes(`#${id}`)) return;
    const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const nonDeclarationReference = new RegExp(
      `(?:#${escapedId}\\b|["']${escapedId}["'])`
    ).test(
      html
        .replace(new RegExp(`\\bid\\s*=\\s*["']${escapedId}["']`, "g"), "")
    );
    if (nonDeclarationReference || htmlHandlers.includes(id)) return;
    if (/^(h[1-6]|section|article|main|nav|aside)$/i.test(element.tagName)) return;
    functionalOrphanIds.push({ id, line: elementLine(page, element), tag: element.tagName });
  });
  if (functionalOrphanIds.length) {
    orphanIdRecords.push({
      pair: languagePairKey(page.relativeFile),
      file: page.relativeFile,
      entries: functionalOrphanIds
    });
  }

  $("style").each((index, element) => {
    const source = $(element).text();
    const styleLine = elementLine(page, element) ?? 1;
    let root;
    try {
      root = postcss.parse(source, { from: page.relativeFile });
    } catch (cause) {
      add(
        "certain",
        "css.parse",
        page.relativeFile,
        styleLine + (cause.line ?? 1) - 1,
        "Le bloc CSS ne peut pas être analysé.",
        cause.reason || cause.message,
        "Corriger la syntaxe CSS après inspection du bloc signalé."
      );
      return;
    }

    const normalizedBlock = root.toString().replace(/\s+/g, " ").trim();
    cssBlockRecords.push({
      file: page.relativeFile,
      line: styleLine,
      index,
      normalized: normalizedBlock,
      signature: hash(normalizedBlock)
    });

    const rulesByScope = new Map();
    root.walkRules((rule) => {
      const context = [];
      let parent = rule.parent;
      while (parent && parent.type !== "root") {
        if (parent.type === "atrule") context.unshift(`@${parent.name} ${parent.params}`);
        parent = parent.parent;
      }
      const scopeKey = `${context.join(" > ")}\u0000${rule.selector.trim()}`;
      const entries = rulesByScope.get(scopeKey) ?? [];
      entries.push({
        rule,
        line: styleLine + (rule.source?.start?.line ?? 1) - 1,
        declarations: normalizeDeclarations(rule)
      });
      rulesByScope.set(scopeKey, entries);

      for (const selector of rule.selectors) {
        let tokens;
        try {
          tokens = selectorTokens(selector);
        } catch (cause) {
          add(
            "certain",
            "css.invalid-selector",
            page.relativeFile,
            styleLine + (rule.source?.start?.line ?? 1) - 1,
            `Sélecteur CSS invalide : ${selector}`,
            cause.message,
            "Corriger le sélecteur; aucun navigateur ne peut l’appliquer de manière fiable."
          );
          continue;
        }

        const pairPages = pageByPair.get(languagePairKey(page.relativeFile)) ?? [page];
        const matchesStatic = pairPages.some((candidate) => selectorMatches(candidate.$, selector));
        const matchesDynamic = [...tokens.classes].some((name) => dynamicClasses.has(name)) ||
          [...tokens.ids].some((name) => dynamicIds.has(name)) ||
          [...tokens.attributes].some((name) => dynamicAttributes.has(name));
        if (!matchesStatic && !matchesDynamic && staticSelectorCandidate(selector, tokens)) {
          const key = `${languagePairKey(page.relativeFile)}\u0000${selector}`;
          const records = potentialCssSelectors.get(key) ?? [];
          records.push({
            file: page.relativeFile,
            line: styleLine + (rule.source?.start?.line ?? 1) - 1
          });
          potentialCssSelectors.set(key, records);
        }
      }

      const declarations = new Map();
      for (const declaration of rule.nodes.filter((node) => node.type === "decl")) {
        const key = `${declaration.prop.toLowerCase()}\u0000${declaration.value.trim()}\u0000${declaration.important}`;
        const prior = declarations.get(key);
        if (prior) {
          add(
            "strong",
            "css.duplicate-declaration",
            page.relativeFile,
            styleLine + (declaration.source?.start?.line ?? 1) - 1,
            `Déclaration identique répétée dans "${rule.selector}".`,
            `${declaration.prop}: ${declaration.value} apparaît aussi ligne ${prior}.`,
            "Retirer une occurrence seulement après avoir confirmé qu’aucun outil de génération ne dépend de cette forme."
          );
        } else {
          declarations.set(key, styleLine + (declaration.source?.start?.line ?? 1) - 1);
        }
      }
    });

    for (const [scope, entries] of rulesByScope) {
      if (entries.length < 2) continue;
      const exactGroups = new Map();
      for (const entry of entries) {
        const group = exactGroups.get(entry.declarations) ?? [];
        group.push(entry);
        exactGroups.set(entry.declarations, group);
      }
      for (const group of exactGroups.values()) {
        if (group.length < 2 || !group[0].declarations) continue;
        const selector = scope.split("\u0000").at(-1);
        add(
          "strong",
          "css.duplicate-rule",
          page.relativeFile,
          group[0].line,
          `La même règle CSS "${selector}" est répétée dans le même contexte.`,
          `Occurrences aux lignes ${group.map((entry) => entry.line).join(", ")} avec les mêmes déclarations.`,
          "Vérifier la cascade, puis regrouper les occurrences si elles sont réellement équivalentes."
        );
      }

      const distinctEntries = entries.filter((entry, index) =>
        entries.findIndex((candidate) => candidate.declarations === entry.declarations) === index
      );
      for (let index = 0; index < distinctEntries.length - 1; index += 1) {
        const earlier = distinctEntries[index];
        const later = distinctEntries[index + 1];
        const earlierProperties = new Map(
          earlier.rule.nodes
            .filter((node) => node.type === "decl")
            .map((decl) => [`${decl.prop.toLowerCase()}\u0000${decl.important}`, decl.value.trim()])
        );
        const laterProperties = new Map(
          later.rule.nodes
            .filter((node) => node.type === "decl")
            .map((decl) => [`${decl.prop.toLowerCase()}\u0000${decl.important}`, decl.value.trim()])
        );
        if (
          earlierProperties.size >= 2 &&
          [...earlierProperties.keys()].every((property) => laterProperties.has(property))
        ) {
          const selector = scope.split("\u0000").at(-1);
          add(
            "strong",
            "css.fully-shadowed-rule",
            page.relativeFile,
            earlier.line,
            `Une règle antérieure pour "${selector}" semble entièrement masquée plus bas dans le même contexte.`,
            `Règle initiale ligne ${earlier.line}; règle suivante ligne ${later.line}; toutes les propriétés initiales sont redéfinies.`,
            "Vérifier l’intention de cascade et la compatibilité navigateur avant de fusionner ou retirer la règle initiale."
          );
        }
      }
    }
  });
}

const orphanIdsByPair = new Map();
for (const record of orphanIdRecords) {
  const group = orphanIdsByPair.get(record.pair) ?? [];
  group.push(record);
  orphanIdsByPair.set(record.pair, group);
}
for (const group of orphanIdsByPair.values()) {
  const total = group.reduce((sum, record) => sum + record.entries.length, 0);
  const evidence = group.flatMap((record) =>
    record.entries.map((entry) => `${record.file}:${entry.line} ${entry.tag}#${entry.id}`)
  );
  add(
    "manual",
    "html.possibly-orphan-id",
    group[0].file,
    group[0].entries[0]?.line,
    `${total} ID fonctionnel(s) sans référence statique détectée dans ${group.length} version(s).`,
    evidence.slice(0, 16).join(", ") + (evidence.length > 16 ? `, +${evidence.length - 16} autre(s)` : ""),
    "Conserver les IDs servant aux liens externes, au suivi ou à des scripts injectés; vérifier les autres manuellement."
  );
}

const groupedSelectorIssues = new Map();
for (const issue of selectorIssues) {
  const key = `${issue.pair}\u0000${issue.method}\u0000${issue.selector}`;
  const group = groupedSelectorIssues.get(key) ?? [];
  group.push(issue);
  groupedSelectorIssues.set(key, group);
}
for (const group of groupedSelectorIssues.values()) {
  const dynamicMatch = group.some((issue) => issue.dynamicMatch);
  const listenerAttached = group.some((issue) => issue.listenerAttached);
  const eboxCountdown = isEboxPair(group[0].pair) &&
    EBOX_COUNTDOWN_SELECTORS.has(group[0].raw);
  add(
    eboxCountdown ? "exception" : dynamicMatch ? "manual" : "strong",
    listenerAttached
      ? "javascript.listener-target-no-static-match"
      : "javascript.selector-no-static-match",
    group[0].file,
    group[0].line,
    `${group[0].method}("${group[0].raw}") ne correspond à aucun élément statique de la paire linguistique${listenerAttached ? " et sa variable reçoit un écouteur" : ""}.`,
    group.map((issue) => `${issue.file}:${issue.line}`).join(", ") +
      (dynamicMatch
        ? "; une correspondance a toutefois été trouvée dans du balisage généré ou une mutation JavaScript."
        : "; aucune création dynamique correspondante n’a été détectée."),
    eboxCountdown
      ? "Conserver ce code dormant : il est volontairement prêt à réactiver une future promotion EBOX."
      : "Confirmer l’ordre d’exécution et la création dynamique avant de retirer le sélecteur ou son écouteur."
  );
}

const jsGroups = new Map();
for (const record of scriptRecords) {
  const group = jsGroups.get(record.signature) ?? [];
  group.push(record);
  jsGroups.set(record.signature, group);
}
for (const group of jsGroups.values()) {
  if (group.length < 2) continue;
  const files = [...new Set(group.map((record) => record.file))];
  const sameFile = files.length === 1;
  const languagePair = isOnlyLanguagePair(files);
  const level = sameFile ? "strong" : languagePair ? "info" : "manual";
  duplicateJavaScriptGroups.push(group);
  add(
    level,
    "javascript.duplicate-logic",
    group[0].file,
    group[0].line,
    `Bloc JavaScript structurellement identique trouvé ${group.length} fois.`,
    group.slice(0, 10).map((record) => `${record.file}:${record.line}`).join(", ") +
      (group.length > 10 ? `, +${group.length - 10} autre(s)` : ""),
    sameFile
      ? "Comparer les blocs et mutualiser seulement si leur ordre d’exécution reste identique."
      : "La duplication FR/EN ou entre pages autonomes peut être volontaire; envisager une mutualisation uniquement si elle simplifie réellement la maintenance."
  );
}

const dataGroups = new Map();
for (const record of dataLiteralRecords) {
  const group = dataGroups.get(record.signature) ?? [];
  group.push(record);
  dataGroups.set(record.signature, group);
}
for (const group of dataGroups.values()) {
  if (group.length < 2) continue;
  const files = [...new Set(group.map((record) => record.file))];
  add(
    isOnlyLanguagePair(files) ? "info" : "manual",
    "javascript.duplicate-data",
    group[0].file,
    group[0].line,
    `Structure de données "${group[0].name}" dupliquée ${group.length} fois.`,
    group.slice(0, 10).map((record) => `${record.file}:${record.line} (${record.name})`).join(", "),
    "Comparer la sémantique et la fréquence de mise à jour avant d’envisager une source commune."
  );
}

const cssGroups = new Map();
for (const record of cssBlockRecords) {
  const group = cssGroups.get(record.signature) ?? [];
  group.push(record);
  cssGroups.set(record.signature, group);
}
for (const group of cssGroups.values()) {
  if (group.length < 2) continue;
  const files = [...new Set(group.map((record) => record.file))];
  if (!isOnlyLanguagePair(files)) continue;
  add(
    "info",
    "css.intentional-language-parity",
    group[0].file,
    group[0].line,
    "Bloc CSS identique dans une paire FR/EN.",
    files.join(", "),
    "Duplication intentionnelle probable; une feuille commune est facultative et aucune suppression n’est recommandée."
  );
}

const unusedSelectorsByFile = new Map();
for (const [entry, records] of potentialCssSelectors) {
  const [pair, selector] = entry.split("\u0000");
  const list = unusedSelectorsByFile.get(pair) ?? [];
  list.push({ selector, records });
  unusedSelectorsByFile.set(pair, list);
}
for (const [pair, selectors] of unusedSelectorsByFile) {
  const records = selectors.flatMap((entry) => entry.records);
  const files = [...new Set(records.map((record) => record.file))];
  const eboxCountdownSelectors = selectors.filter((entry) =>
    EBOX_COUNTDOWN_CSS.has(entry.selector)
  );
  const ordinarySelectors = selectors.filter((entry) =>
    !EBOX_COUNTDOWN_CSS.has(entry.selector)
  );
  if (isEboxPair(pair) && eboxCountdownSelectors.length) {
    const countdownRecords = eboxCountdownSelectors.flatMap((entry) => entry.records);
    add(
      "exception",
      "css.ebox-countdown-dormant",
      countdownRecords[0].file,
      countdownRecords[0].line,
      `${eboxCountdownSelectors.length} sélecteur(s) du compte à rebours EBOX sont conservés volontairement.`,
      eboxCountdownSelectors.map((entry) => entry.selector).join(", "),
      "Conserver ces règles dormantes : elles sont prêtes à réactiver une future promotion EBOX."
    );
  }
  if (!ordinarySelectors.length) continue;
  add(
    "info",
    "css.no-static-or-dynamic-match",
    records[0].file,
    records[0].line,
    `${ordinarySelectors.length} sélecteur(s) simple(s) sans correspondance HTML ou JavaScript dans la paire linguistique.`,
    ordinarySelectors.slice(0, 20)
      .map((entry) =>
        `${entry.selector} (${entry.records.map((record) => `${record.file}:${record.line}`).join(", ")})`
      )
      .join("; ") +
      (ordinarySelectors.length > 20 ? `; +${ordinarySelectors.length - 20} autre(s)` : "") +
      `; paire : ${pair}; fichiers : ${files.join(", ")}`,
    "Aucune action requise; cette information ne démontre pas que les règles sont inutiles."
  );
}

const ignoreGlobs = [
  ...[...ignoredDirectories].map((directory) => `**/${directory}/**`),
  "tests/**",
  "coverage/**",
  "**/.DS_Store"
];
const resourceFiles = await fg(["**/*.{png,jpg,jpeg,webp,gif,avif,svg}"], {
  cwd: rootDir,
  onlyFiles: true,
  ignore: ignoreGlobs
});
const nonTestSourceFiles = await fg(["**/*.{html,md,txt,xml,json,css,js,mjs}"], {
  cwd: rootDir,
  onlyFiles: true,
  ignore: [...ignoreGlobs, "package-lock.json", "package.json", "playwright.config.mjs", "html-validate.config.mjs"]
});
for (const file of nonTestSourceFiles) {
  allSourceText.push(await fs.readFile(path.join(rootDir, file), "utf8"));
}
const sourceCorpus = allSourceText.join("\n");

const unreferencedImagesByDirectory = new Map();
for (const file of resourceFiles) {
  if (file === "favicon.svg" || file === "logo.png" || file === "logo.svg" || file === "og.png") continue;
  if (/(^|\/)og\.svg$/i.test(file)) continue;
  const basename = path.basename(file);
  const encodedBasename = encodeURIComponent(basename);
  if (sourceCorpus.includes(file) || sourceCorpus.includes(basename) || sourceCorpus.includes(encodedBasename)) continue;

  const directory = path.dirname(file);
  const entries = unreferencedImagesByDirectory.get(directory) ?? [];
  entries.push(file);
  unreferencedImagesByDirectory.set(directory, entries);
  locallyUnreferencedImages.add(file);
}
for (const [directory, files] of unreferencedImagesByDirectory) {
  add(
    "info",
    "resources.no-local-page-reference",
    files[0],
    null,
    `${files.length} image(s) sans référence locale détectée dans les 28 pages HTML, dans ${directory}.`,
    files.slice(0, 20).join(", ") + (files.length > 20 ? `, +${files.length - 20} autre(s)` : ""),
    "Aucune action requise : ces images peuvent servir à Reddit, à des publications externes, à des preuves ou à des archives."
  );
}

findings.sort((left, right) =>
  LEVEL[left.level].order - LEVEL[right.level].order ||
  left.file.localeCompare(right.file) ||
  (left.line ?? 0) - (right.line ?? 0) ||
  left.rule.localeCompare(right.rule)
);

for (const finding of findings) {
  console.log(`\n[${LEVEL[finding.level].label}] ${finding.file}${finding.line ? `:${finding.line}` : ""}`);
  console.log(`  Règle      : ${finding.rule}`);
  console.log(`  Explication: ${finding.explanation}`);
  console.log(`  Preuve     : ${finding.evidence}`);
  console.log(`  Suggestion : ${finding.suggestion}`);
}

const totals = {
  certain: findings.filter((finding) => finding.level === "certain").length,
  strong: findings.filter((finding) => finding.level === "strong").length,
  manual: findings.filter((finding) => finding.level === "manual").length,
  exception: findings.filter((finding) => finding.level === "exception").length,
  info: findings.filter((finding) => finding.level === "info").length
};
const duration = ((performance.now() - startedAt) / 1000).toFixed(2);

console.log("\nAudit de maintenabilité Cash Instinct");
console.log(`  Pages analysées                 : ${pages.length}`);
console.log(`  Erreurs certaines               : ${totals.certain}`);
console.log(`  Avertissements forts            : ${totals.strong}`);
console.log(`  Éléments facultatifs            : ${totals.manual}`);
console.log(`  Exceptions intentionnelles      : ${totals.exception}`);
console.log(`  Informations                    : ${totals.info}`);
console.log(`  Duplications JavaScript         : ${duplicateJavaScriptGroups.length} groupes`);
console.log(`  Sélecteurs CSS informatifs      : ${potentialCssSelectors.size}`);
console.log(`  Images sans référence locale    : ${locallyUnreferencedImages.size}`);
console.log(`  Durée                           : ${duration} s`);

process.exitCode = totals.certain > 0 ? 1 : 0;
