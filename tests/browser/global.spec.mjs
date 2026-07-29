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
