import { SITE_ORIGIN } from "../config/site-policy.mjs";

export const DEFAULT_EXTERNAL_LINK_OPTIONS = Object.freeze({
  concurrency: 6,
  timeoutMs: 12_000,
  retries: 1,
  retryDelayMs: 250,
  maxRedirects: 5,
  cacheTtlMs: 60_000
});

const responseCache = new Map();

function normalizedExternalUrl(rawHref, base, siteOrigin) {
  try {
    const url = new URL(rawHref, base);
    if (!/^https?:$/.test(url.protocol) || url.origin === siteOrigin) return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function locationFromResponse(response) {
  if (response?.location) return response.location;
  if (typeof response?.headers?.get === "function") return response.headers.get("location");
  return null;
}

function errorCode(error) {
  return error?.cause?.code || error?.code || error?.name || String(error);
}

function isRedirect(status) {
  return Number.isInteger(status) && status >= 300 && status <= 399;
}

function isSuccessful(status) {
  return Number.isInteger(status) && status >= 200 && status <= 299;
}

function shouldRetry(result) {
  return Boolean(result.error) || (result.status >= 500 && result.status <= 599) || result.status === 429;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function defaultRequest({ url, method, timeoutMs }) {
  const headers = { "user-agent": "CashInstinct-Link-Audit/1.0" };
  if (method === "GET") headers.range = "bytes=0-0";
  const response = await fetch(url, {
    method,
    redirect: "manual",
    headers,
    signal: AbortSignal.timeout(timeoutMs)
  });
  const location = response.headers.get("location");
  await response.body?.cancel().catch(() => {});
  return { status: response.status, location };
}

export function clearExternalLinkCache() {
  responseCache.clear();
}

export function collectExternalUrls(pages, { siteOrigin = SITE_ORIGIN } = {}) {
  const entries = new Map();
  for (const page of pages) {
    page.$("a[href]").each((_, element) => {
      const rawHref = (page.$(element).attr("href") || "").trim();
      const url = normalizedExternalUrl(rawHref, page.canonical, siteOrigin);
      if (!url) return;
      const entry = entries.get(url) || { url, sources: [] };
      entry.sources.push({
        file: page.relativeFile,
        line: element.sourceCodeLocation?.startLine ?? null,
        text: page.$(element).text().replace(/\s+/g, " ").trim().slice(0, 100)
      });
      entries.set(url, entry);
    });
  }
  return [...entries.values()].sort((first, second) => first.url.localeCompare(second.url));
}

export function auditStaticExternalLinks(pages, { siteOrigin = SITE_ORIGIN } = {}) {
  const findings = [];
  for (const page of pages) {
    page.$("a[href]").each((_, element) => {
      const rawHref = (page.$(element).attr("href") || "").trim();
      if (!/^https?:\/\//i.test(rawHref)) return;

      let url;
      try {
        url = new URL(rawHref);
      } catch {
        findings.push({
          rule: "links.external-invalid-url",
          page,
          element,
          message: `URL externe syntaxiquement invalide : ${rawHref}`
        });
        return;
      }
      if (url.origin === siteOrigin) return;

      if (url.protocol !== "https:") {
        findings.push({
          rule: "links.external-https",
          page,
          element,
          message: `Lien externe non HTTPS : ${rawHref}`
        });
      }

      if ((page.$(element).attr("target") || "").toLowerCase() === "_blank") {
        const rel = new Set(
          (page.$(element).attr("rel") || "").toLowerCase().split(/\s+/).filter(Boolean)
        );
        for (const required of ["noopener", "noreferrer"]) {
          if (!rel.has(required)) {
            findings.push({
              rule: "links.external-blank-rel",
              page,
              element,
              message: `Lien externe target="_blank" sans rel="${required}" : ${rawHref}`
            });
          }
        }
      }
    });
  }
  return findings;
}

export async function followExternalRedirects(
  url,
  {
    method,
    request = defaultRequest,
    timeoutMs = DEFAULT_EXTERNAL_LINK_OPTIONS.timeoutMs,
    maxRedirects = DEFAULT_EXTERNAL_LINK_OPTIONS.maxRedirects
  }
) {
  const redirects = [];
  let currentUrl = url;
  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    let response;
    try {
      response = await request({ url: currentUrl, method, timeoutMs });
    } catch (error) {
      return {
        method,
        status: null,
        finalUrl: currentUrl,
        redirects,
        error: errorCode(error)
      };
    }

    const status = Number(response?.status);
    if (!Number.isInteger(status)) {
      return {
        method,
        status: null,
        finalUrl: currentUrl,
        redirects,
        error: "invalid-status"
      };
    }
    if (!isRedirect(status)) return { method, status, finalUrl: currentUrl, redirects };

    const location = locationFromResponse(response);
    if (!location) {
      return {
        method,
        status,
        finalUrl: currentUrl,
        redirects,
        error: "redirect-without-location"
      };
    }
    const nextUrl = new URL(location, currentUrl).href;
    redirects.push({ from: currentUrl, status, to: nextUrl });
    currentUrl = nextUrl;
  }

  return {
    method,
    status: null,
    finalUrl: currentUrl,
    redirects,
    error: "redirect-limit"
  };
}

async function requestWithRetries(url, options) {
  const retries = options.retries ?? DEFAULT_EXTERNAL_LINK_OPTIONS.retries;
  let result = null;
  let attempts = 0;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    attempts += 1;
    result = await followExternalRedirects(url, options);
    if (!shouldRetry(result) || attempt === retries) break;
    await delay(options.retryDelayMs ?? DEFAULT_EXTERNAL_LINK_OPTIONS.retryDelayMs);
  }
  return { ...result, attempts };
}

function classify(url, selected, { head, get, usedFallback }) {
  if (selected.error) {
    return {
      url,
      finalUrl: selected.finalUrl,
      status: selected.status,
      method: selected.method,
      redirects: selected.redirects,
      attempts: { head: head.attempts, get: get?.attempts ?? 0 },
      usedFallback,
      level: "warning",
      code: "network-uncertain",
      message: `${selected.error} après ${selected.attempts} tentative(s).`
    };
  }
  if (selected.status === 404 || selected.status === 410) {
    return {
      url,
      finalUrl: selected.finalUrl,
      status: selected.status,
      method: selected.method,
      redirects: selected.redirects,
      attempts: { head: head.attempts, get: get?.attempts ?? 0 },
      usedFallback,
      level: "error",
      code: "not-found",
      message: `Réponse HTTP ${selected.status}.`
    };
  }
  if (isSuccessful(selected.status)) {
    return {
      url,
      finalUrl: selected.finalUrl,
      status: selected.status,
      method: selected.method,
      redirects: selected.redirects,
      attempts: { head: head.attempts, get: get?.attempts ?? 0 },
      usedFallback,
      level: selected.redirects.length ? "info" : "ok",
      code: selected.redirects.length ? "redirected" : "ok",
      message: selected.redirects.length
        ? `${selected.redirects.length} redirection(s) suivie(s).`
        : "Réponse 2xx."
    };
  }
  if ([401, 403, 429].includes(selected.status)) {
    return {
      url,
      finalUrl: selected.finalUrl,
      status: selected.status,
      method: selected.method,
      redirects: selected.redirects,
      attempts: { head: head.attempts, get: get?.attempts ?? 0 },
      usedFallback,
      level: "warning",
      code: "access-uncertain",
      message: `Réponse HTTP ${selected.status}; le lien n'est pas classé comme cassé.`
    };
  }
  return {
    url,
    finalUrl: selected.finalUrl,
    status: selected.status,
    method: selected.method,
    redirects: selected.redirects,
    attempts: { head: head.attempts, get: get?.attempts ?? 0 },
    usedFallback,
    level: "warning",
    code: selected.status >= 500 ? "server-uncertain" : "unexpected-status",
    message: `Réponse HTTP ${selected.status}; le lien n'est pas classé comme cassé.`
  };
}

export async function checkExternalUrl(
  url,
  {
    cache = true,
    cacheTtlMs = DEFAULT_EXTERNAL_LINK_OPTIONS.cacheTtlMs,
    ...options
  } = {}
) {
  const cacheEntry = responseCache.get(url);
  if (cache && cacheEntry && cacheEntry.expiresAt > Date.now()) return cacheEntry.result;

  const head = await requestWithRetries(url, {
    ...DEFAULT_EXTERNAL_LINK_OPTIONS,
    ...options,
    method: "HEAD"
  });
  let get = null;
  let selected = head;
  let usedFallback = false;
  if (head.error || !isSuccessful(head.status)) {
    usedFallback = true;
    get = await requestWithRetries(url, {
      ...DEFAULT_EXTERNAL_LINK_OPTIONS,
      ...options,
      method: "GET"
    });
    selected = get;
  }

  const result = classify(url, selected, { head, get, usedFallback });
  if (cache) responseCache.set(url, { expiresAt: Date.now() + cacheTtlMs, result });
  return result;
}

export async function checkExternalUrls(
  entries,
  { concurrency = DEFAULT_EXTERNAL_LINK_OPTIONS.concurrency, ...options } = {}
) {
  const results = new Array(entries.length);
  let cursor = 0;
  async function worker() {
    while (cursor < entries.length) {
      const index = cursor;
      cursor += 1;
      const entry = entries[index];
      results[index] = {
        ...await checkExternalUrl(entry.url, options),
        sources: entry.sources
      };
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, entries.length) }, () => worker()));
  return results;
}
