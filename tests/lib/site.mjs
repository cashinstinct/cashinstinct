import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import * as cheerio from "cheerio";
import { XMLParser } from "fast-xml-parser";
import { ignoredDirectories, SITE_ORIGIN } from "../config/site-policy.mjs";

export const rootDir = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../.."
);

export function routeFromRelativeFile(relativeFile) {
  const route = relativeFile.replace(/(^|\/)index\.html$/, "$1");
  return `/${route}`.replace(/\/+/g, "/");
}

export function canonicalFromRoute(route) {
  return `${SITE_ORIGIN}${route}`;
}

export async function discoverPages() {
  const ignore = [...ignoredDirectories].map((dir) => `**/${dir}/**`);
  const files = await fg(["**/index.html"], {
    cwd: rootDir,
    onlyFiles: true,
    unique: true,
    ignore
  });

  return Promise.all(
    files.sort().map(async (relativeFile) => {
      const absoluteFile = path.join(rootDir, relativeFile);
      const html = await fs.readFile(absoluteFile, "utf8");
      const $ = cheerio.load(html, { sourceCodeLocationInfo: true });
      const route = routeFromRelativeFile(relativeFile);
      return {
        relativeFile,
        absoluteFile,
        html,
        $,
        route,
        canonical: canonicalFromRoute(route)
      };
    })
  );
}

export async function readSitemap() {
  const xml = await fs.readFile(path.join(rootDir, "sitemap.xml"), "utf8");
  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(xml);
  const rawUrls = parsed?.urlset?.url ?? [];
  const urls = Array.isArray(rawUrls) ? rawUrls : [rawUrls];
  return urls.map((entry) => ({
    loc: String(entry.loc),
    lastmod: entry.lastmod ? String(entry.lastmod) : null
  }));
}

export function lineOf(page, needle) {
  const index = page.html.indexOf(needle);
  if (index < 0) return null;
  return page.html.slice(0, index).split("\n").length;
}

export function elementLine(page, element) {
  return element?.sourceCodeLocation?.startLine ?? lineOf(page, page.$.html(element));
}

export function valuesOfMeta($, key, attribute = "name") {
  return $(`meta[${attribute}="${key}"]`)
    .map((_, element) => $(element).attr("content")?.trim() ?? "")
    .get();
}

export function valuesOfLink($, rel) {
  return $(`link[rel="${rel}"]`)
    .map((_, element) => $(element).attr("href")?.trim() ?? "")
    .get();
}

export function asLocalUrl(rawValue, baseCanonical) {
  if (!rawValue) return null;
  if (/^(mailto:|tel:|javascript:|data:)/i.test(rawValue)) return null;
  try {
    const url = new URL(rawValue, baseCanonical);
    if (url.origin !== SITE_ORIGIN) return null;
    return url;
  } catch {
    return null;
  }
}

export function diskPathForUrl(url) {
  const decoded = decodeURIComponent(url.pathname);
  if (decoded.endsWith("/")) return path.join(rootDir, decoded, "index.html");
  return path.join(rootDir, decoded);
}

export function walkJson(value, visit, parentKey = null) {
  if (Array.isArray(value)) {
    value.forEach((entry) => walkJson(entry, visit, parentKey));
    return;
  }
  if (!value || typeof value !== "object") return;
  visit(value, parentKey);
  for (const [key, child] of Object.entries(value)) {
    walkJson(child, visit, key);
  }
}
