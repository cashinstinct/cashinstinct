import assert from "node:assert/strict";
import test from "node:test";
import * as cheerio from "cheerio";
import {
  auditStaticExternalLinks,
  checkExternalUrl,
  clearExternalLinkCache,
  collectDynamicExternalUrls,
  collectExternalUrls
} from "../lib/external-link-policy.mjs";

const origin = "https://cashinstinct.ca";

function makePage(html) {
  return {
    relativeFile: "fixture/index.html",
    canonical: `${origin}/fixture/`,
    html,
    $: cheerio.load(html, { sourceCodeLocationInfo: true })
  };
}

function fakeRequest(sequence) {
  const responses = [...sequence];
  const calls = [];
  const request = async ({ method, url }) => {
    calls.push({ method, url });
    const responseIndex = responses.findIndex((candidate) =>
      candidate.method === method && (!candidate.url || candidate.url === url)
    );
    if (responseIndex < 0) throw new Error(`fixture response missing for ${method} ${url}`);
    const [response] = responses.splice(responseIndex, 1);
    if (response.error) throw Object.assign(new Error(response.error), { code: response.error });
    return response;
  };
  return { request, calls };
}

async function check(sequence, url = "https://provider.example/source", options = {}) {
  clearExternalLinkCache();
  const fake = fakeRequest(sequence);
  const result = await checkExternalUrl(url, {
    request: fake.request,
    cache: false,
    retries: 0,
    retryDelayMs: 0,
    ...options
  });
  return { result, calls: fake.calls };
}

test("collecte une seule fois une URL externe répétée", () => {
  const pages = [
    makePage(`<a href="https://provider.example/source">Source 1</a>`),
    { ...makePage(`<a href="https://provider.example/source#section">Source 2</a>`), relativeFile: "other/index.html" }
  ];
  const entries = collectExternalUrls(pages);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].sources.length, 2);
});

test("retient les hrefs externes apparus après hydratation", () => {
  const knownUrls = new Set(["https://provider.example/static"]);
  const dynamicUrls = collectDynamicExternalUrls([
    "https://provider.example/static#section",
    "https://provider.example/runtime",
    "https://cashinstinct.ca/guide/fr/"
  ], "https://cashinstinct.ca/offer/fr/", knownUrls);
  assert.deepEqual(dynamicUrls, ["https://provider.example/runtime"]);
});

test("classe une réponse 200 comme OK", async () => {
  const { result, calls } = await check([{ method: "HEAD", status: 200 }]);
  assert.equal(result.level, "ok");
  assert.equal(result.status, 200);
  assert.equal(result.usedFallback, false);
  assert.deepEqual(calls, [{ method: "HEAD", url: "https://provider.example/source" }]);
});

test("classe 404 comme erreur certaine après confirmation GET", async () => {
  const { result, calls } = await check([
    { method: "HEAD", status: 404 },
    { method: "GET", status: 404 }
  ]);
  assert.equal(result.level, "error");
  assert.equal(result.code, "not-found");
  assert.deepEqual(calls.map(({ method }) => method), ["HEAD", "GET"]);
});

test("classe 403 comme avertissement indéterminé", async () => {
  const { result } = await check([
    { method: "HEAD", status: 403 },
    { method: "GET", status: 403 }
  ]);
  assert.equal(result.level, "warning");
  assert.equal(result.code, "access-uncertain");
});

test("accepte HEAD 403 puis GET 200 comme lien valide", async () => {
  const { result } = await check([
    { method: "HEAD", status: 403 },
    { method: "GET", status: 200 }
  ]);
  assert.equal(result.level, "ok");
  assert.equal(result.method, "GET");
});

test("accepte HEAD 405 puis GET 206 comme lien valide", async () => {
  const { result } = await check([
    { method: "HEAD", status: 405 },
    { method: "GET", status: 206 }
  ]);
  assert.equal(result.level, "ok");
  assert.equal(result.status, 206);
});

test("utilise GET limité quand HEAD échoue puis retrouve une réponse 2xx", async () => {
  const { result, calls } = await check([
    { method: "HEAD", error: "ETIMEDOUT" },
    { method: "GET", status: 206 }
  ]);
  assert.equal(result.level, "ok");
  assert.equal(result.status, 206);
  assert.equal(result.method, "GET");
  assert.equal(result.usedFallback, true);
  assert.deepEqual(calls.map(({ method }) => method), ["HEAD", "GET"]);
});

test("suit une redirection et la signale sans la classer comme erreur", async () => {
  const { result } = await check([
    { method: "HEAD", status: 301, location: "https://provider.example/new-source" },
    { method: "HEAD", url: "https://provider.example/new-source", status: 200 }
  ]);
  assert.equal(result.level, "info");
  assert.equal(result.code, "redirected");
  assert.equal(result.finalUrl, "https://provider.example/new-source");
  assert.equal(result.redirects.length, 1);
});

test("classe une redirection finale vers 404 comme erreur certaine", async () => {
  const { result } = await check([
    { method: "HEAD", status: 301, location: "https://provider.example/missing" },
    { method: "HEAD", url: "https://provider.example/missing", status: 404 },
    { method: "GET", status: 301, location: "https://provider.example/missing" },
    { method: "GET", url: "https://provider.example/missing", status: 404 }
  ]);
  assert.equal(result.level, "error");
  assert.equal(result.code, "not-found");
  assert.equal(result.finalUrl, "https://provider.example/missing");
});

test("classe une boucle de redirections comme avertissement", async () => {
  const sequence = [
    { method: "HEAD", status: 301, location: "https://provider.example/loop" },
    { method: "HEAD", url: "https://provider.example/loop", status: 302, location: "https://provider.example/loop" },
    { method: "GET", status: 301, location: "https://provider.example/loop" },
    { method: "GET", url: "https://provider.example/loop", status: 302, location: "https://provider.example/loop" }
  ];
  const { result } = await check(sequence, "https://provider.example/start", { maxRedirects: 1 });
  assert.equal(result.level, "warning");
  assert.equal(result.code, "network-uncertain");
});

test("classe une redirection sans Location comme avertissement", async () => {
  const { result } = await check([
    { method: "HEAD", status: 301 },
    { method: "GET", status: 301 }
  ]);
  assert.equal(result.level, "warning");
  assert.equal(result.code, "network-uncertain");
});

test("classe 410 comme erreur certaine", async () => {
  const { result } = await check([
    { method: "HEAD", status: 410 },
    { method: "GET", status: 410 }
  ]);
  assert.equal(result.level, "error");
  assert.equal(result.code, "not-found");
});

test("classe timeout comme avertissement avec le retry désactivé de la fixture", async () => {
  const { result } = await check([
    { method: "HEAD", error: "ETIMEDOUT" },
    { method: "GET", error: "ETIMEDOUT" }
  ]);
  assert.equal(result.level, "warning");
  assert.equal(result.code, "network-uncertain");
});

test("réessaie les erreurs 5xx puis les conserve comme avertissement", async () => {
  const { result, calls } = await check([
    { method: "HEAD", status: 503 },
    { method: "HEAD", status: 503 },
    { method: "GET", status: 503 },
    { method: "GET", status: 503 }
  ], "https://provider.example/unavailable", { retries: 1 });
  assert.equal(result.level, "warning");
  assert.equal(result.code, "server-uncertain");
  assert.deepEqual(calls.map(({ method }) => method), ["HEAD", "HEAD", "GET", "GET"]);
});

test("les contrôles statiques restent hors réseau et vérifient HTTPS et rel", () => {
  const page = makePage(`
    <a href="http://provider.example/insecure">HTTP</a>
    <a href="https://provider.example/new" target="_blank" rel="noopener noreferrer">OK</a>
    <a href="https://provider.example/missing-rel" target="_blank">Missing rel</a>
  `);
  const findings = auditStaticExternalLinks([page]);
  assert.equal(findings.filter((finding) => finding.rule === "links.external-https").length, 1);
  assert.equal(findings.filter((finding) => finding.rule === "links.external-blank-rel").length, 2);
});
