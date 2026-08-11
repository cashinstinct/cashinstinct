import { performance } from "node:perf_hooks";
import { checkExternalUrls, collectExternalUrls } from "../lib/external-link-policy.mjs";
import { discoverPages } from "../lib/site.mjs";

const startedAt = performance.now();
const pages = await discoverPages();
const entries = collectExternalUrls(pages);
const results = await checkExternalUrls(entries, { concurrency: 6 });
const errors = results.filter((result) => result.level === "error");
const warnings = results.filter((result) => result.level === "warning");
const redirects = results.filter((result) => result.level === "info");
const ok = results.filter((result) => result.level === "ok");
const successful = results.filter((result) => result.status >= 200 && result.status <= 299);

for (const result of results.filter((entry) => entry.level !== "ok")) {
  const source = result.sources
    .map((entry) => `${entry.file}${entry.line ? `:${entry.line}` : ""}`)
    .join(", ");
  const label = result.level === "error"
    ? "ERREUR"
    : result.level === "info"
      ? "REDIRECTION"
      : "AVERTISSEMENT";
  console.log(`[${label}] ${result.url}`);
  console.log(`  ${result.message} Méthode: ${result.method || "inconnue"}; final: ${result.finalUrl}.`);
  console.log(`  Sources: ${source || "inconnue"}.`);
}

const duration = ((performance.now() - startedAt) / 1000).toFixed(2);
console.log("\nAudit réseau externe Cash Instinct");
console.log(`  Pages analysées       : ${pages.length}`);
console.log(`  URLs externes uniques : ${entries.length}`);
console.log(`  Réponses 2xx          : ${successful.length} (${ok.length} directes, ${redirects.length} après redirection)`);
console.log(`  Redirections suivies  : ${redirects.length}`);
console.log(`  Avertissements        : ${warnings.length}`);
console.log(`  Erreurs 404/410       : ${errors.length}`);
console.log(`  Durée                 : ${duration} s`);

process.exitCode = errors.length > 0 ? 1 : 0;
