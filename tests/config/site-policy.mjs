export const SITE_ORIGIN = "https://cashinstinct.ca";
export const LOCAL_ORIGIN = "http://127.0.0.1:4173";

export const ignoredDirectories = new Set([
  ".git",
  ".claude",
  "node_modules",
  "playwright-report",
  "test-results"
]);

export const referralCodes = new Map([
  ["achieva", "V381566198"],
  ["ebox", "GE911"],
  ["hp-instant-ink", "SVdn7"],
  ["stickermule", "CASHINSTINCT"],
  ["tangerine", "28709877S1"]
]);

const englishDefaults = new Set([
  "achieva",
  "chexy",
  "hp-instant-ink",
  "rakuten-canada",
  "stickermule",
  "swagbucks"
]);

const xDefaultOverrides = new Map([
  ["internet-cout-reel", "/internet-cout-reel/fr/"],
  ["internet-real-cost", "/internet-cout-reel/fr/"],
  ["real-value-canadian-promotion", "/valeur-reelle-promotion-canada/fr/"]
]);

export function expectedXDefault(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0 || parts[0] === "en" && parts.length === 1) return "/";

  const section = parts[0];
  if (xDefaultOverrides.has(section)) return xDefaultOverrides.get(section);
  if (section === "about") return "/about/fr/";
  if (englishDefaults.has(section)) return `/${section}/en/`;
  return `/${section}/fr/`;
}

export const intentionalExceptions = [
  {
    rule: "html.style-preferences",
    description:
      "prefer-native-element, tel-non-breaking et les préférences de formatage ne bloquent pas les audits."
  },
  {
    rule: "language.documented-asymmetries",
    description:
      "Les vidéos, VideoObject, devises et statuts documentés peuvent différer entre FR et EN."
  }
];
