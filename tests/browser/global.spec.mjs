import { test, expect } from "@playwright/test";
import { discoverPages } from "../lib/site.mjs";

const pages = await discoverPages();

function isLocal(url) {
  return new URL(url).origin === "http://127.0.0.1:4173";
}

for (const sitePage of pages) {
  test(`${sitePage.route} — rendu global`, async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];
    const failedLocalRequests = [];
    const failedLocalResponses = [];

    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (exception) => pageErrors.push(exception.message));
    page.on("requestfailed", (request) => {
      if (isLocal(request.url())) {
        failedLocalRequests.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText}`);
      }
    });
    page.on("response", (response) => {
      if (isLocal(response.url()) && response.status() >= 400) {
        failedLocalResponses.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.addInitScript(() => {
      try {
        localStorage.setItem("theme", "light");
      } catch {}
    });

    const response = await page.goto(sitePage.route, { waitUntil: "domcontentloaded" });
    expect(response, "La navigation doit produire une réponse.").not.toBeNull();
    expect(response.status(), "La page doit charger avec un statut réussi.").toBeLessThan(400);
    await page.waitForTimeout(100);

    const schemaState = await page.evaluate(() => {
      const normalize = (value) => String(value)
        .normalize("NFC")
        .replace(/[\u00a0\u202f]/g, " ")
        .replace(/[‘’]/g, "'")
        .replace(/[“”]/g, '"')
        .replace(/\s+/g, " ")
        .trim();
      const nodes = [];
      for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
        try {
          const documentValue = JSON.parse(script.textContent || "");
          const roots = documentValue["@graph"] ?? [documentValue];
          nodes.push(...(Array.isArray(roots) ? roots : [roots]));
        } catch {}
      }
      const hasType = (node, expectedType) => {
        const types = Array.isArray(node?.["@type"]) ? node["@type"] : [node?.["@type"]];
        return types.includes(expectedType);
      };
      const failures = [];
      const webPage = nodes.find((node) => hasType(node, "WebPage"));
      const metaDescription = document.querySelector('meta[name="description"]')?.content || "";
      if (webPage && metaDescription && normalize(webPage.description || "") !== normalize(metaDescription)) {
        failures.push("WebPage.description ne correspond pas à la meta description.");
      }
      if (webPage?.name && document.title && normalize(webPage.name) !== normalize(document.title)) {
        failures.push("WebPage.name ne correspond pas au title.");
      }

      const faqPage = nodes.find((node) => hasType(node, "FAQPage"));
      if (!faqPage) return { failures, faq: null };
      const visibleQuestions = [...document.querySelectorAll("#faq summary")];
      const schemaQuestions = Array.isArray(faqPage.mainEntity) ? faqPage.mainEntity : [];
      const exactMismatches = [];
      if (visibleQuestions.length !== schemaQuestions.length) {
        failures.push(`FAQ visible (${visibleQuestions.length}) et JSON-LD (${schemaQuestions.length}) ont des nombres différents.`);
      }
      for (let index = 0; index < Math.min(visibleQuestions.length, schemaQuestions.length); index += 1) {
        const summary = visibleQuestions[index];
        const schemaQuestion = schemaQuestions[index];
        if (normalize(summary.textContent || "") !== normalize(schemaQuestion?.name || "")) {
          failures.push(`FAQ Q${index + 1} visible/schema différente.`);
        }
        const acceptedAnswer = normalize(schemaQuestion?.acceptedAnswer?.text || "");
        if (!acceptedAnswer) failures.push(`FAQ Q${index + 1} acceptedAnswer.text vide.`);
        const id = summary.getAttribute("id") || "";
        const linkedAnswer = [...document.querySelectorAll("#faq [aria-labelledby]")]
          .find((element) => (element.getAttribute("aria-labelledby") || "").split(/\s+/).includes(id));
        const fallbackAnswer = summary.parentElement?.querySelector(".faq-body");
        const answerElement = linkedAnswer || fallbackAnswer;
        const visibleAnswer = normalize(answerElement?.textContent || "");
        if (!visibleAnswer) failures.push(`FAQ Q${index + 1} réponse HTML visible absente.`);
        if (visibleAnswer !== acceptedAnswer) exactMismatches.push(index + 1);
      }
      return {
        failures,
        faq: {
          pageFailure: visibleQuestions.length !== schemaQuestions.length || exactMismatches.length > 0,
          questionCount: Math.min(visibleQuestions.length, schemaQuestions.length),
          exactMismatches
        }
      };
    });

    expect(schemaState.failures, JSON.stringify(schemaState, null, 2)).toEqual([]);
    if (schemaState.faq) {
      test.info().annotations.push({
        type: "faq-exact-baseline",
        description: JSON.stringify({
          file: sitePage.relativeFile,
          questionCount: schemaState.faq.questionCount,
          exactMismatches: schemaState.faq.exactMismatches,
          pageFailure: schemaState.faq.pageFailure
        })
      });
    }

    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toBeVisible();

    const navigation = page.locator("nav").first();
    await expect(navigation, "Une navigation est attendue sur chaque page.").toBeVisible();

    const inspectLayout = async (theme) =>
      page.evaluate((currentTheme) => {
        const root = document.documentElement;
        const clientWidth = root.clientWidth;
        const overflow = root.scrollWidth > clientWidth + 1;
        const offenders = [...document.querySelectorAll("body *")]
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              selector:
                element.id ? `#${element.id}` :
                element.classList.length ? `${element.tagName.toLowerCase()}.${[...element.classList].join(".")}` :
                element.tagName.toLowerCase(),
              left: Math.round(rect.left),
              right: Math.round(rect.right)
            };
          })
          .filter((item) => item.left < -1 || item.right > clientWidth + 1)
          .slice(0, 12);

        const nativeColorLinks = [...document.querySelectorAll("a")].filter((link) => {
          const color = getComputedStyle(link).color;
          return color === "rgb(0, 0, 238)" || color === "rgb(85, 26, 139)";
        }).map((link) => link.textContent.trim().slice(0, 80));

        const hiddenFocusable = [];
        for (const container of document.querySelectorAll('[aria-hidden="true"]')) {
          for (const element of container.querySelectorAll(
            'a[href],button,input,select,textarea,[tabindex]'
          )) {
            const style = getComputedStyle(element);
            const rendered = element.getClientRects().length > 0 &&
              style.display !== "none" &&
              style.visibility !== "hidden";
            if (
              rendered &&
              element.tabIndex >= 0 &&
              !element.closest("[inert]")
            ) {
              hiddenFocusable.push(
                `${element.tagName.toLowerCase()}#${element.id || ""}.${element.className || ""}`
              );
            }
          }
        }

        const explicitlyHiddenInteractive = [
          ...document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')
        ].filter((element) => {
          if (element.closest("[inert]")) return false;
          if (element.tabIndex < 0 || element.getClientRects().length === 0) return false;
          let current = element;
          while (current && current !== document.documentElement) {
            const style = getComputedStyle(current);
            if (style.visibility === "hidden" || Number(style.opacity) === 0) return true;
            current = current.parentElement;
          }
          return false;
        }).map((element) =>
          `${element.tagName.toLowerCase()}#${element.id || ""}.${element.className || ""}`
        );

        return {
          theme: currentTheme,
          overflow,
          scrollWidth: root.scrollWidth,
          clientWidth,
          offenders,
          nativeColorLinks,
          hiddenFocusable,
          explicitlyHiddenInteractive
        };
      }, theme);

    const lightState = await inspectLayout("light");
    expect(lightState.overflow, JSON.stringify(lightState, null, 2)).toBe(false);
    expect(lightState.nativeColorLinks, JSON.stringify(lightState, null, 2)).toEqual([]);
    expect(lightState.hiddenFocusable, JSON.stringify(lightState, null, 2)).toEqual([]);
    expect(lightState.explicitlyHiddenInteractive, JSON.stringify(lightState, null, 2)).toEqual([]);

    const themeToggle = page.locator("#theme-toggle");
    await expect(themeToggle).toBeVisible();
    const initialPressed = await themeToggle.getAttribute("aria-pressed");
    await themeToggle.click();
    await expect(themeToggle).not.toHaveAttribute("aria-pressed", initialPressed ?? "");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    const darkState = await inspectLayout("dark");
    expect(darkState.overflow, JSON.stringify(darkState, null, 2)).toBe(false);
    expect(darkState.nativeColorLinks, JSON.stringify(darkState, null, 2)).toEqual([]);
    expect(darkState.hiddenFocusable, JSON.stringify(darkState, null, 2)).toEqual([]);
    expect(darkState.explicitlyHiddenInteractive, JSON.stringify(darkState, null, 2)).toEqual([]);

    await themeToggle.click();
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
    await expect(themeToggle).toHaveAttribute("aria-pressed", initialPressed ?? "false");

    const skipLink = page.locator('a[href="#main-content"]').first();
    if (await skipLink.count()) {
      await skipLink.focus();
      const skipState = await skipLink.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          visible:
            rect.right > 0 &&
            rect.left < innerWidth &&
            rect.bottom > 0 &&
            rect.top < innerHeight &&
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            Number(style.opacity) > 0
        };
      });
      expect(skipState.visible, "La skip link doit devenir visible au focus.").toBe(true);
      await skipLink.blur();
    }

    expect(pageErrors, pageErrors.join("\n")).toEqual([]);
    expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
    expect(failedLocalRequests, failedLocalRequests.join("\n")).toEqual([]);
    expect(failedLocalResponses, failedLocalResponses.join("\n")).toEqual([]);
  });
}
