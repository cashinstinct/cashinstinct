import assert from "node:assert/strict";
import test from "node:test";
import * as cheerio from "cheerio";
import { auditInternalLinkPolicy } from "../lib/internal-link-policy.mjs";

const origin = "https://cashinstinct.ca";

function makePage({ route, lang, alternateRoute = null, body = "" }) {
  const canonical = `${origin}${route}`;
  const otherLanguage = lang === "fr" ? "en" : "fr";
  const alternate = alternateRoute ? `${origin}${alternateRoute}` : null;
  const html = `<!doctype html>
    <html lang="${lang}-CA">
      <head>
        <link rel="canonical" href="${canonical}">
        <link rel="alternate" hreflang="${lang}" href="${canonical}">
        ${alternate ? `<link rel="alternate" hreflang="${otherLanguage}" href="${alternate}">` : ""}
      </head>
      <body>${body}</body>
    </html>`;
  return {
    relativeFile: route === "/" ? "index.html" : `${route.slice(1)}index.html`,
    route,
    canonical,
    html,
    $: cheerio.load(html, { sourceCodeLocationInfo: true })
  };
}

function localizedBody(language, { main = "", navExtra = "", footer = null } = {}) {
  const home = language === "fr" ? `${origin}/` : `${origin}/en/`;
  const homeLabel = language === "fr" ? "Accueil" : "Home";
  return `
    <nav><a href="${home}">${homeLabel}</a>${navExtra}</nav>
    <main>${main}</main>
    ${footer ?? `<footer><a href="${home}">${homeLabel}</a></footer>`}`;
}

function fixturePages({ offerFr = {}, offerEn = {}, extraPages = [] } = {}) {
  return [
    makePage({ route: "/", lang: "fr", alternateRoute: "/en/", body: localizedBody("fr") }),
    makePage({ route: "/en/", lang: "en", alternateRoute: "/", body: localizedBody("en") }),
    makePage({ route: "/guide/fr/", lang: "fr", alternateRoute: "/guide/en/", body: localizedBody("fr") }),
    makePage({ route: "/guide/en/", lang: "en", alternateRoute: "/guide/fr/", body: localizedBody("en") }),
    makePage({
      route: "/offer/fr/",
      lang: "fr",
      alternateRoute: "/offer/en/",
      body: localizedBody("fr", offerFr)
    }),
    makePage({
      route: "/offer/en/",
      lang: "en",
      alternateRoute: "/offer/fr/",
      body: localizedBody("en", offerEn)
    }),
    ...extraPages
  ];
}

function findingsFor(rule, pages) {
  return auditInternalLinkPolicy(pages).filter((finding) => finding.rule === rule);
}

test("détecte tout lien interne de page qui n'utilise pas l'URL absolue du projet", () => {
  const pages = fixturePages({
    offerEn: {
      main: '<a href="/guide/en/">Guide</a><a href="#details">Details</a>'
    }
  });
  const findings = findingsFor("links.internal-absolute", pages);
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /\/guide\/en\//);
});

test("détecte une page EN qui envoie inutilement vers l'accueil FR", () => {
  const pages = fixturePages({
    offerEn: { main: `<a href="${origin}/">Cash Instinct</a>` }
  });
  const findings = findingsFor("links.internal-language-crossing", pages);
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /équivalent EN disponible.*\/en\//);
});

test("détecte un lien FR vers une page EN lorsqu'un équivalent FR existe", () => {
  const pages = fixturePages({
    offerFr: { main: `<a href="${origin}/guide/en/">Guide</a>` }
  });
  const findings = findingsFor("links.internal-language-crossing", pages);
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /équivalent FR disponible.*\/guide\/fr\//);
});

test("applique symétriquement la règle à un lien EN vers une autre page FR", () => {
  const pages = fixturePages({
    offerEn: { main: `<a href="${origin}/guide/fr/">Guide</a>` }
  });
  const findings = findingsFor("links.internal-language-crossing", pages);
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /équivalent EN disponible.*\/guide\/en\//);
});

test("autorise le sélecteur de langue direct et une cible sans traduction disponible", () => {
  const legacyEnglish = makePage({
    route: "/legacy/en/",
    lang: "en",
    body: localizedBody("en")
  });
  const pages = fixturePages({
    offerFr: {
      main:
        `<a href="${origin}/offer/en/">English version</a>` +
        `<a href="${origin}/legacy/en/">English-only source</a>`
    },
    extraPages: [legacyEnglish]
  });
  assert.deepEqual(findingsFor("links.internal-language-crossing", pages), []);
});

test("détecte l'absence du retour accueil dans un seul footer de la paire", () => {
  const pages = fixturePages({
    offerEn: {
      footer: `<footer><a href="${origin}/offer/en/">English guide</a></footer>`
    }
  });
  const findings = findingsFor("navigation.footer-language-parity", pages);
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /Asymétrie de footer/);
});

test("détecte une destination essentielle présente dans une seule navigation principale", () => {
  const pages = fixturePages({
    offerFr: { navExtra: `<a href="${origin}/guide/fr/">Guide</a>` }
  });
  const findings = findingsFor("navigation.primary-language-parity", pages);
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /Asymétrie de navigation principale/);
});

test("une paire cohérente ne produit aucun constat", () => {
  assert.deepEqual(auditInternalLinkPolicy(fixturePages()), []);
});

test("détecte les alias d'origine internes www et HTTP", () => {
  const pages = fixturePages({
    offerFr: {
      main:
        `<a href="https://www.cashinstinct.ca/guide/fr/">Alias www</a>` +
        `<a href="http://cashinstinct.ca/guide/fr/">Alias HTTP</a>`
    }
  });
  const findings = findingsFor("links.internal-origin-alias", pages);
  assert.equal(findings.length, 2);
  assert.match(findings[0].message, /Origine interne inattendue/);
});
