function normalizedText(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function referencedText(page, rawIds) {
  return rawIds
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => page.$("[id]").filter((_, element) => page.$(element).attr("id") === id).first().text())
    .map(normalizedText)
    .filter(Boolean)
    .join(" ");
}

export function accessibleName(page, element) {
  const $ = page.$;
  const ariaLabel = normalizedText($(element).attr("aria-label") || "");
  if (ariaLabel) return ariaLabel;

  const ariaLabelledBy = normalizedText($(element).attr("aria-labelledby") || "");
  if (ariaLabelledBy) {
    const labelText = referencedText(page, ariaLabelledBy);
    if (labelText) return labelText;
  }

  const contentText = normalizedText($(element).text());
  if (contentText) return contentText;

  const imageAlt = normalizedText($(element).find("img[alt]").map((_, image) => $(image).attr("alt")).get().join(" "));
  if (imageAlt) return imageAlt;

  const svgTitle = normalizedText($(element).find("svg title").first().text());
  if (svgTitle) return svgTitle;

  return normalizedText($(element).attr("title") || "");
}

export function auditAccessibleNames(pages) {
  const findings = [];
  for (const page of pages) {
    page.$("a[href],button").each((_, element) => {
      if (page.$(element).closest("[aria-hidden='true'],[inert]").length) return;
      if (accessibleName(page, element)) return;
      findings.push({
        rule: "accessibility.name-missing",
        page,
        element,
        message: `Élément interactif sans nom accessible : ${page.$.html(element).slice(0, 160)}`
      });
    });
  }
  return findings;
}
