import { test, expect } from "@playwright/test";

async function fillFrenchPlan(page, prefix, values) {
  await page.locator(`#plan-${prefix}-name`).fill(values.name);
  await page.locator(`#plan-${prefix}-promo`).fill(String(values.promo));
  await page.locator(`#plan-${prefix}-promo-months`).fill(String(values.promoMonths));
  await page.locator(`#plan-${prefix}-regular`).fill(String(values.regular));
  await page.locator(`#plan-${prefix}-fees`).fill(String(values.fees));
  await page.locator(`#plan-${prefix}-credits`).fill(String(values.credits));
}

test("le calculateur FR accepte une durée personnalisée avec six champs par forfait", async ({ page }) => {
  await page.goto("/internet-cout-reel/fr/");
  expect(await page.locator("#plan-a-promo").inputValue()).toBe("");
  await expect(page.locator('[data-plan="a"] [data-field]')).toHaveCount(6);
  await expect(page.locator('[data-field="equipmentMonthly"]')).toHaveCount(0);
  await expect(page.locator('[data-field="download"], [data-field="upload"], [data-field="technology"]')).toHaveCount(0);
  await expect(page.locator('label[for="plan-a-fees"]')).toContainText("installation, activation, résiliation");
  await expect(page.locator("#plan-a-credits + .field-note")).toContainText("soustrait une seule fois");

  await page.getByRole("button", { name: "24 mois" }).click();
  await fillFrenchPlan(page, "a", {
    name: "Offre A",
    promo: 50,
    promoMonths: 24,
    regular: 80,
    fees: 60,
    credits: 100
  });
  await fillFrenchPlan(page, "b", {
    name: "Offre B",
    promo: 55,
    promoMonths: 0,
    regular: 55,
    fees: 0,
    credits: 0
  });
  await page.getByRole("button", { name: "Calculer le coût réel" }).click();

  await expect(page.locator("[data-results]")).toBeVisible();
  await expect(page.locator("[data-output='duration']")).toHaveText("24");
  await expect(page.locator("[data-output='a-total']")).toHaveText(/1.*160/);
  await expect(page.locator("[data-output='a-regular']")).toContainText("80");
  await expect(page.locator("[data-output='comparison']")).toContainText("Offre A");
  await expect(page.locator("[data-results]")).not.toContainText("vitesses et la technologie");
});

test("the English calculator exposes the same six-field workflow", async ({ page }) => {
  await page.goto("/internet-real-cost/en/");
  await expect(page.locator('[data-plan="a"] [data-field]')).toHaveCount(6);
  await expect(page.locator('[data-field="equipmentMonthly"]')).toHaveCount(0);
  await expect(page.locator('[data-field="download"], [data-field="upload"], [data-field="technology"]')).toHaveCount(0);
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
  await expect(page.locator("[data-results]")).not.toContainText("Speed and technology");
});
