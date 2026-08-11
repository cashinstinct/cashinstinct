import assert from "node:assert/strict";
import test from "node:test";
import * as cheerio from "cheerio";
import { accessibleName, auditAccessibleNames } from "../lib/accessibility-policy.mjs";

function makePage(body) {
  const html = `<!doctype html><html lang="fr-CA"><body>${body}</body></html>`;
  return {
    relativeFile: "fixture/index.html",
    html,
    $: cheerio.load(html, { sourceCodeLocationInfo: true })
  };
}

test("calcule le nom accessible d'un lien image avec alt", () => {
  const page = makePage(`<a href="https://provider.example"><img src="proof.png" alt="Preuve officielle"></a>`);
  const link = page.$("a")[0];
  assert.equal(accessibleName(page, link), "Preuve officielle");
  assert.deepEqual(auditAccessibleNames([page]), []);
});

test("accepte aria-label, aria-labelledby et titre SVG", () => {
  const page = makePage(`
    <a href="#one" aria-label="Ouvrir le guide"></a>
    <span id="label">Voir les détails</span><a href="#two" aria-labelledby="label"></a>
    <a href="#three"><svg><title>Changer le thème</title></svg></a>
  `);
  assert.equal(auditAccessibleNames([page]).length, 0);
});

test("signale un lien réellement dépourvu de nom accessible", () => {
  const page = makePage(`<a href="#missing"><svg aria-hidden="true"></svg></a>`);
  const findings = auditAccessibleNames([page]);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, "accessibility.name-missing");
});
