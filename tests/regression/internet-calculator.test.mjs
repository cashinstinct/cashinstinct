import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_DURATION_MONTHS,
  calculatePlanCost,
  comparePlans,
  formatCurrency
} from "../../internet-cout-reel/calculator.js";

test("calcule un prix permanent avec équipement mensuel", () => {
  const result = calculatePlanCost({ promoPrice: 50, equipmentMonthly: 5 }, 36);

  assert.equal(result.total, 1980);
  assert.equal(result.effectiveMonthly, 55);
  assert.equal(result.regularMonthlyTotal, 55);
  assert.equal(result.promoMonths, 0);
});

test("sépare promo, tarif régulier, frais ponctuels et crédit", () => {
  const result = calculatePlanCost({
    promoPrice: 50,
    promoMonths: 24,
    regularPrice: 80,
    equipmentMonthly: 5,
    oneTimeFees: 60,
    credits: 100
  }, 36);

  assert.equal(result.total, 2300);
  assert.equal(result.effectiveMonthly, 2300 / 36);
  assert.equal(result.remainingMonths, 12);
});

test("compare deux offres sans score arbitraire", () => {
  const comparison = comparePlans(
    { name: "A", promoPrice: 45, promoMonths: 12, regularPrice: 75 },
    { name: "B", promoPrice: 50, promoMonths: 12, regularPrice: 80, credits: 50 },
    24
  );

  assert.equal(comparison.a.total, 1440);
  assert.equal(comparison.b.total, 1510);
  assert.equal(comparison.difference, -70);
  assert.equal(comparison.savings, 70);
  assert.equal("score" in comparison, false);
});

test("accepte une durée personnalisée bornée", () => {
  const result = calculatePlanCost({ promoPrice: 40 }, MAX_DURATION_MONTHS);
  assert.equal(result.durationMonths, 120);
  assert.equal(result.total, 4800);
  assert.throws(() => calculatePlanCost({ promoPrice: 40 }, 0), /Duration/);
  assert.throws(() => calculatePlanCost({ promoPrice: 40 }, 12.5), /Duration/);
});

test("refuse une vitesse négative comme les autres valeurs numériques", () => {
  assert.throws(() => calculatePlanCost({ promoPrice: 40, download: -1 }, 12), /negative/);
});

test("préserve la lisibilité monétaire canadienne", () => {
  assert.match(formatCurrency(1234.5, "fr-CA"), /1.*234,50/);
  assert.match(formatCurrency(1234.5, "en-CA"), /1,234\.50/);
});
