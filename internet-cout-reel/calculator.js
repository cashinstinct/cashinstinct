const MAX_DURATION_MONTHS = 120;

const COPY = {
  fr: {
    invalid: "Entrez un prix mensuel valide pour les deux forfaits. Les champs numériques facultatifs doivent être positifs ou égaux à zéro.",
    duration: `La durée doit être un nombre entier entre 1 et ${MAX_DURATION_MONTHS} mois.`,
    calculated: "Comparaison mise à jour à partir des valeurs entrées.",
    notProvided: "Non indiqué",
    same: "Les deux forfaits reviennent au même coût net sur la durée choisie.",
    cheaper: (name, amount, duration) => `${name} revient à ${amount} de moins sur ${duration} mois, selon les valeurs entrées.`,
    dearer: (name, amount, duration) => `${name} revient à ${amount} de plus sur ${duration} mois, selon les valeurs entrées.`,
    negative: (name) => `Le coût net de ${name} est négatif parce que les crédits entrés dépassent les coûts modélisés sur cette durée. Vérifiez l'admissibilité et la date d'application du crédit.`,
    defaultNameA: "Forfait A",
    defaultNameB: "Forfait B"
  },
  en: {
    invalid: "Enter a valid monthly price for both plans. Optional numeric fields must be zero or greater.",
    duration: `The duration must be a whole number between 1 and ${MAX_DURATION_MONTHS} months.`,
    calculated: "Comparison updated from the values entered.",
    notProvided: "Not entered",
    same: "Both plans have the same net cost over the selected period.",
    cheaper: (name, amount, duration) => `${name} costs ${amount} less over ${duration} months, based on the values entered.`,
    dearer: (name, amount, duration) => `${name} costs ${amount} more over ${duration} months, based on the values entered.`,
    negative: (name) => `${name} has a negative net cost because the credits entered exceed the modeled costs over this period. Check eligibility and when the credit is applied.`,
    defaultNameA: "Plan A",
    defaultNameB: "Plan B"
  }
};

function parseNumber(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  let normalized = String(value).trim().replace(/[\s$]/g, "");
  if (normalized.includes(",") && !normalized.includes(".")) normalized = normalized.replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function nonNegative(value, fallback = 0) {
  const number = parseNumber(value);
  if (number === null) return fallback;
  if (number < 0) throw new RangeError("Numeric values cannot be negative.");
  return number;
}

function positiveDuration(value) {
  const number = parseNumber(value);
  if (!Number.isInteger(number) || number < 1 || number > MAX_DURATION_MONTHS) {
    throw new RangeError(`Duration must be an integer from 1 to ${MAX_DURATION_MONTHS}.`);
  }
  return number;
}

export function normalizePlan(plan = {}) {
  const promoPrice = parseNumber(plan.promoPrice);
  if (promoPrice === null || promoPrice < 0) {
    throw new TypeError("A valid promotional or current monthly price is required.");
  }

  const regularPriceValue = parseNumber(plan.regularPrice);
  const regularPrice = regularPriceValue === null ? promoPrice : nonNegative(regularPriceValue);
  const promoMonthsValue = parseNumber(plan.promoMonths);
  const promoMonths = promoMonthsValue === null ? 0 : nonNegative(promoMonthsValue);

  if (!Number.isInteger(promoMonths)) {
    throw new RangeError("Promotion duration must be a whole number of months.");
  }

  return {
    name: String(plan.name ?? "").trim(),
    promoPrice,
    regularPrice,
    promoMonths,
    equipmentMonthly: nonNegative(plan.equipmentMonthly),
    oneTimeFees: nonNegative(plan.oneTimeFees),
    credits: nonNegative(plan.credits),
    download: nonNegative(plan.download, null),
    upload: nonNegative(plan.upload, null),
    technology: String(plan.technology ?? "").trim()
  };
}

export function calculatePlanCost(plan, durationMonths) {
  const normalizedPlan = normalizePlan(plan);
  const duration = positiveDuration(durationMonths);
  const promoMonths = Math.min(normalizedPlan.promoMonths, duration);
  const remainingMonths = duration - promoMonths;
  const promoMonthlyTotal = normalizedPlan.promoPrice + normalizedPlan.equipmentMonthly;
  const regularMonthlyTotal = normalizedPlan.regularPrice + normalizedPlan.equipmentMonthly;
  const total = promoMonths * promoMonthlyTotal + remainingMonths * regularMonthlyTotal +
    normalizedPlan.oneTimeFees - normalizedPlan.credits;

  return {
    ...normalizedPlan,
    durationMonths: duration,
    promoMonths,
    remainingMonths,
    promoMonthlyTotal,
    regularMonthlyTotal,
    total,
    effectiveMonthly: total / duration
  };
}

export function comparePlans(planA, planB, durationMonths) {
  const a = calculatePlanCost(planA, durationMonths);
  const b = calculatePlanCost(planB, durationMonths);
  return {
    durationMonths: a.durationMonths,
    a,
    b,
    difference: a.total - b.total,
    savings: Math.abs(a.total - b.total)
  };
}

export function formatCurrency(value, locale = "fr-CA") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function formatSpeed(value, language, locale) {
  if (value === null || value === undefined || Number.isNaN(value)) return COPY[language].notProvided;
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
}

function getPlanInput(root, field) {
  return root.querySelector(`[data-field="${field}"]`)?.value ?? "";
}

function readPlan(root) {
  return {
    name: getPlanInput(root, "name"),
    promoPrice: getPlanInput(root, "promoPrice"),
    promoMonths: getPlanInput(root, "promoMonths"),
    regularPrice: getPlanInput(root, "regularPrice"),
    equipmentMonthly: getPlanInput(root, "equipmentMonthly"),
    oneTimeFees: getPlanInput(root, "oneTimeFees"),
    credits: getPlanInput(root, "credits"),
    download: getPlanInput(root, "download"),
    upload: getPlanInput(root, "upload"),
    technology: getPlanInput(root, "technology")
  };
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function updatePressedPreset(months) {
  document.querySelectorAll("[data-duration]").forEach((button) => {
    const selected = Number(button.dataset.duration) === Number(months);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function setupCalculator() {
  const form = document.querySelector(".calculator-form");
  if (!form) return;

  const language = document.documentElement.lang.startsWith("fr") ? "fr" : "en";
  const copy = COPY[language];
  const locale = language === "fr" ? "fr-CA" : "en-CA";
  const durationInput = form.querySelector("[data-duration-input]");
  const errorElement = document.querySelector("[data-calculator-error]");
  const statusElement = document.querySelector("[data-calculator-status]");
  const resultElement = document.querySelector("[data-results]");
  const planRoots = {
    a: form.querySelector('[data-plan="a"]'),
    b: form.querySelector('[data-plan="b"]')
  };
  let hasCalculated = false;

  function showError(message) {
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.hidden = false;
    }
    if (resultElement) resultElement.hidden = true;
    if (statusElement) statusElement.textContent = "";
  }

  function clearError() {
    if (errorElement) {
      errorElement.textContent = "";
      errorElement.hidden = true;
    }
  }

  function updatePlanOutput(key, result) {
    const name = result.name || (key === "a" ? copy.defaultNameA : copy.defaultNameB);
    setText(`[data-output="${key}-name"]`, name);
    setText(`[data-output="${key}-total"]`, formatCurrency(result.total, locale));
    setText(`[data-output="${key}-monthly"]`, formatCurrency(result.effectiveMonthly, locale));
    setText(`[data-output="${key}-regular"]`, formatCurrency(result.regularMonthlyTotal, locale));
    setText(`[data-output="${key}-speed"]`, `${formatSpeed(result.download, language, locale)} / ${formatSpeed(result.upload, language, locale)} Mbps`);
    setText(`[data-output="${key}-technology"]`, result.technology || copy.notProvided);
  }

  function calculate(showValidation = true) {
    try {
      const duration = positiveDuration(durationInput?.value);
      const comparison = comparePlans(readPlan(planRoots.a), readPlan(planRoots.b), duration);
      updatePlanOutput("a", comparison.a);
      updatePlanOutput("b", comparison.b);

      const nameA = comparison.a.name || copy.defaultNameA;
      const nameB = comparison.b.name || copy.defaultNameB;
      let narrative = copy.same;
      if (comparison.difference < 0) {
        narrative = copy.cheaper(nameA, formatCurrency(comparison.savings, locale), duration);
      } else if (comparison.difference > 0) {
        narrative = copy.cheaper(nameB, formatCurrency(comparison.savings, locale), duration);
      }
      if (comparison.a.total < 0) narrative += ` ${copy.negative(nameA)}`;
      if (comparison.b.total < 0) narrative += ` ${copy.negative(nameB)}`;

      setText('[data-output="comparison"]', narrative);
      setText('[data-output="duration"]', String(duration));
      clearError();
      if (resultElement) resultElement.hidden = false;
      if (statusElement) statusElement.textContent = copy.calculated;
      hasCalculated = true;
      return comparison;
    } catch (error) {
      if (showValidation || hasCalculated) {
        const message = error instanceof RangeError && String(error.message).includes("Duration") ? copy.duration : copy.invalid;
        showError(message);
      }
      return null;
    }
  }

  form.querySelectorAll("[data-duration]").forEach((button) => {
    button.addEventListener("click", () => {
      if (durationInput) durationInput.value = button.dataset.duration;
      updatePressedPreset(durationInput?.value);
      if (hasCalculated) calculate(false);
    });
  });

  durationInput?.addEventListener("input", () => {
    updatePressedPreset(durationInput.value);
    if (hasCalculated) calculate(false);
  });

  form.addEventListener("input", () => {
    if (hasCalculated) calculate(false);
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    calculate(true);
  });
  updatePressedPreset(durationInput?.value);
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", setupCalculator);
}

export { MAX_DURATION_MONTHS };
