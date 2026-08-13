import { test, expect } from "@playwright/test";

async function fillFrenchPlan(page, prefix, values) {
  await page.locator(`#plan-${prefix}-name`).fill(values.name);
  await page.locator(`#plan-${prefix}-promo`).fill(String(values.promo));
  await page.locator(`#plan-${prefix}-promo-months`).fill(String(values.promoMonths));
  await page.locator(`#plan-${prefix}-regular`).fill(String(values.regular));
  await page.locator(`#plan-${prefix}-equipment`).fill(String(values.equipment));
  await page.locator(`#plan-${prefix}-fees`).fill(String(values.fees));
  await page.locator(`#plan-${prefix}-credits`).fill(String(values.credits));
  await page.locator(`#plan-${prefix}-download`).fill(String(values.download));
  await page.locator(`#plan-${prefix}-upload`).fill(String(values.upload));
  await page.locator(`#plan-${prefix}-technology`).fill(values.technology);
}

test("le calculateur FR accepte une durée personnalisée et sépare le crédit", async ({ page }) => {
  await page.goto("/internet-cout-reel/fr/");
  expect(await page.locator("#plan-a-promo").inputValue()).toBe("");
  await expect(page.locator('label[for="plan-a-fees"]')).toContainText("installation, activation, résiliation");
  await expect(page.locator("#plan-a-credits + .field-note")).toContainText("soustrait une seule fois");

  await page.getByRole("button", { name: "24 mois" }).click();
  await fillFrenchPlan(page, "a", {
    name: "Offre A",
    promo: 50,
    promoMonths: 24,
    regular: 80,
    equipment: 5,
    fees: 60,
    credits: 100,
    download: 500,
    upload: 500,
    technology: "FTTH"
  });
  await fillFrenchPlan(page, "b", {
    name: "Offre B",
    promo: 55,
    promoMonths: 0,
    regular: 55,
    equipment: 0,
    fees: 0,
    credits: 0,
    download: 500,
    upload: 50,
    technology: "HFC"
  });
  await page.getByRole("button", { name: "Calculer le coût réel" }).click();

  await expect(page.locator("[data-results]")).toBeVisible();
  await expect(page.locator("[data-output='duration']")).toHaveText("24");
  await expect(page.locator("[data-output='a-total']")).toContainText("2");
  await expect(page.locator("[data-output='a-speed']")).toContainText("500");
  await expect(page.locator("[data-output='a-technology']")).toHaveText("FTTH");
  await expect(page.locator("[data-output='comparison']")).toContainText("Offre A");
  await expect(page.locator("[data-results]")).toContainText("vitesses et la technologie");
});

test("the English calculator exposes the same custom-period workflow", async ({ page }) => {
  await page.goto("/internet-real-cost/en/");
  await expect(page.locator('label[for="plan-a-fees"]')).toContainText("installation, activation, early termination");
  await expect(page.locator("#plan-a-credits + .field-note")).toContainText("subtracted once");
  await page.getByRole("button", { name: "36 months" }).click();
  await page.locator("#plan-a-promo").fill("45");
  await page.locator("#plan-a-promo-months").fill("12");
  await page.locator("#plan-a-regular").fill("75");
  await page.locator("#plan-b-promo").fill("50");
  await page.locator("#plan-b-promo-months").fill("0");
  await page.getByRole("button", { name: "Calculate real cost" }).click();

  await expect(page.locator("[data-results]")).toBeVisible();
  await expect(page.locator("[data-output='duration']")).toHaveText("36");
  await expect(page.locator("[data-output='a-total']")).toContainText("2,340");
  await expect(page.locator("[data-output='b-total']")).toContainText("1,800");
  await expect(page.locator("[data-results]")).toContainText("Speed and technology");
});
