const MAX_DURATION_MONTHS = 120;

const COPY = {
  fr: {
    invalid: "Entrez un prix mensuel valide pour les deux forfaits. Les frais, crédits et autres champs numériques doivent être positifs ou égaux à zéro.",
    duration: `La durée doit être un nombre entier entre 1 et ${MAX_DURATION_MONTHS} mois.`,
    calculated: "Comparaison mise à jour à partir des valeurs entrées.",
    ready: "Entrez les deux prix mensuels pour commencer.",
    regularNotUsed: "Sans objet lorsque la durée de la promo est de 0 mois.",
    regularPrompt: "Saisissez le tarif régulier s’il est différent.",
    copied: "Résultat copié dans le presse-papiers.",
    copyError: "Impossible de copier le résultat. Sélectionnez et copiez le texte manuellement.",
    breakdownLabel: "Calcul",
    averageLabel: "en moyenne",
    postPromotionLabel: "après promo",
    totalLabel: "total",
    summaryTitle: (duration) => `Comparaison sur ${duration} mois`,
    sameSummary: "Les deux forfaits ont le même coût net.",
    same: "Les deux forfaits reviennent au même coût net sur la durée choisie.",
    cheaper: (name, amount, duration) => `${name} revient à ${amount} de moins sur ${duration} mois, selon les valeurs entrées.`,
    dearer: (name, amount, duration) => `${name} revient à ${amount} de plus sur ${duration} mois, selon les valeurs entrées.`,
    negative: (name) => `Le coût net de ${name} est négatif parce que les crédits entrés dépassent les coûts modélisés sur cette durée. Vérifiez l'admissibilité et la date d'application du crédit.`,
    defaultNameA: "Forfait A",
    defaultNameB: "Forfait B"
  },
  en: {
    invalid: "Enter a valid monthly price for both plans. Fees, credits and other numeric fields must be zero or greater.",
    duration: `The duration must be a whole number between 1 and ${MAX_DURATION_MONTHS} months.`,
    calculated: "Comparison updated from the values entered.",
    ready: "Enter both monthly prices to begin.",
    regularNotUsed: "Not used when promotion length is 0 months.",
    regularPrompt: "Enter the regular rate when it differs.",
    copied: "Result copied to the clipboard.",
    copyError: "Could not copy the result. Select and copy the text manually.",
    breakdownLabel: "Calculation",
    averageLabel: "average",
    postPromotionLabel: "after promotion",
    totalLabel: "total",
    summaryTitle: (duration) => `Comparison over ${duration} months`,
    sameSummary: "Both plans have the same net cost.",
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

  const promoMonthsValue = parseNumber(plan.promoMonths);
  const promoMonths = promoMonthsValue === null ? 0 : nonNegative(promoMonthsValue);

  if (!Number.isInteger(promoMonths)) {
    throw new RangeError("Promotion duration must be a whole number of months.");
  }

  const regularPriceValue = parseNumber(plan.regularPrice);
  const enteredRegularPrice = regularPriceValue === null ? promoPrice : nonNegative(regularPriceValue);
  const regularPrice = promoMonths === 0 ? promoPrice : enteredRegularPrice;

  return {
    name: String(plan.name ?? "").trim(),
    promoPrice,
    regularPrice,
    promoMonths,
    oneTimeFees: nonNegative(plan.oneTimeFees),
    credits: nonNegative(plan.credits)
  };
}

export function calculatePlanCost(plan, durationMonths) {
  const normalizedPlan = normalizePlan(plan);
  const duration = positiveDuration(durationMonths);
  const promoMonths = Math.min(normalizedPlan.promoMonths, duration);
  const remainingMonths = duration - promoMonths;
  const total = promoMonths * normalizedPlan.promoPrice + remainingMonths * normalizedPlan.regularPrice +
    normalizedPlan.oneTimeFees - normalizedPlan.credits;

  return {
    ...normalizedPlan,
    durationMonths: duration,
    promoMonths,
    remainingMonths,
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

export function formatPlanBreakdown(result, locale = "fr-CA", language = locale.startsWith("fr") ? "fr" : "en") {
  const recurringTerms = [];
  if (result.promoMonths > 0) recurringTerms.push(`${result.promoMonths} × ${formatCurrency(result.promoPrice, locale)}`);
  if (result.remainingMonths > 0) recurringTerms.push(`${result.remainingMonths} × ${formatCurrency(result.regularPrice, locale)}`);
  let expression = recurringTerms.join(" + ");
  if (result.oneTimeFees > 0) expression += ` + ${formatCurrency(result.oneTimeFees, locale)}`;
  if (result.credits > 0) expression += ` − ${formatCurrency(result.credits, locale)}`;
  return `${language === "fr" ? "Calcul" : "Calculation"} : ${expression} = ${formatCurrency(result.total, locale)}`;
}

function getPlanInput(root, field) {
  return root.querySelector(`[data-field="${field}"]`)?.value ?? "";
}

function isPermanentPrice(value) {
  const number = parseNumber(value);
  return number === null || number === 0;
}

function readPlan(root) {
  const promoMonths = getPlanInput(root, "promoMonths");
  return {
    name: getPlanInput(root, "name"),
    promoPrice: getPlanInput(root, "promoPrice"),
    promoMonths,
    regularPrice: isPermanentPrice(promoMonths) ? "" : getPlanInput(root, "regularPrice"),
    oneTimeFees: getPlanInput(root, "oneTimeFees"),
    credits: getPlanInput(root, "credits")
  };
}

function syncRegularPriceField(root, copy) {
  const promoMonthsInput = root?.querySelector('[data-field="promoMonths"]');
  const regularPriceInput = root?.querySelector('[data-field="regularPrice"]');
  const regularPriceNote = root?.querySelector("[data-regular-note]");
  if (!promoMonthsInput || !regularPriceInput) return;

  const permanent = isPermanentPrice(promoMonthsInput.value);
  regularPriceInput.disabled = permanent;
  regularPriceInput.setAttribute("aria-disabled", String(permanent));
  regularPriceInput.closest(".field")?.classList.toggle("is-disabled", permanent);
  if (regularPriceNote) regularPriceNote.textContent = permanent ? copy.regularNotUsed : copy.regularPrompt;
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch (error) {
      // Try the legacy path below when the Clipboard API is unavailable or denied.
    }
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.setAttribute("aria-hidden", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard copy failed.");
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
  const copyStatusElement = document.querySelector("[data-copy-status]");
  const copyButton = form.querySelector("[data-copy-result]");
  const resetButton = form.querySelector("[data-reset-calculator]");
  const resultElement = document.querySelector("[data-results]");
  const planRoots = {
    a: form.querySelector('[data-plan="a"]'),
    b: form.querySelector('[data-plan="b"]')
  };
  let hasCalculated = false;
  let lastComparison = null;

  function showError(message) {
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.hidden = false;
    }
    if (resultElement) resultElement.hidden = true;
    if (statusElement) statusElement.textContent = "";
    if (copyButton) copyButton.disabled = true;
    if (copyStatusElement) copyStatusElement.textContent = "";
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
    setText(`[data-output="${key}-regular"]`, formatCurrency(result.regularPrice, locale));
    setText(`[data-output="${key}-breakdown"]`, formatPlanBreakdown(result, locale, language));
  }

  function syncRegularPriceFields() {
    Object.values(planRoots).forEach((root) => syncRegularPriceField(root, copy));
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
      if (copyStatusElement) copyStatusElement.textContent = "";
      if (copyButton) copyButton.disabled = false;
      hasCalculated = true;
      lastComparison = comparison;
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
    syncRegularPriceFields();
    if (hasCalculated) calculate(false);
  });
  resetButton?.addEventListener("click", () => {
    form.reset();
    updatePressedPreset(durationInput?.value);
    syncRegularPriceFields();
    clearError();
    if (resultElement) resultElement.hidden = true;
    if (statusElement) statusElement.textContent = copy.ready;
    if (copyButton) copyButton.disabled = true;
    if (copyStatusElement) copyStatusElement.textContent = "";
    hasCalculated = false;
    lastComparison = null;
  });
  copyButton?.addEventListener("click", async () => {
    if (!lastComparison) return;
    const nameA = lastComparison.a.name || copy.defaultNameA;
    const nameB = lastComparison.b.name || copy.defaultNameB;
    const comparisonLine = lastComparison.difference === 0
      ? copy.sameSummary
      : document.querySelector('[data-output="comparison"]')?.textContent || "";
    const summary = [
      copy.summaryTitle(lastComparison.durationMonths),
      `${nameA} : ${formatCurrency(lastComparison.a.total, locale)} ${copy.totalLabel}; ${formatCurrency(lastComparison.a.effectiveMonthly, locale)} ${copy.averageLabel}; ${formatCurrency(lastComparison.a.regularPrice, locale)} ${copy.postPromotionLabel}.`,
      `${nameB} : ${formatCurrency(lastComparison.b.total, locale)} ${copy.totalLabel}; ${formatCurrency(lastComparison.b.effectiveMonthly, locale)} ${copy.averageLabel}; ${formatCurrency(lastComparison.b.regularPrice, locale)} ${copy.postPromotionLabel}.`,
      comparisonLine,
      `${copy.breakdownLabel} A : ${formatPlanBreakdown(lastComparison.a, locale, language).replace(/^Calcul(ation)?\s:\s/, "")}`,
      `${copy.breakdownLabel} B : ${formatPlanBreakdown(lastComparison.b, locale, language).replace(/^Calcul(ation)?\s:\s/, "")}`
    ].join("\n");
    try {
      await copyText(summary);
      if (copyStatusElement) copyStatusElement.textContent = copy.copied;
    } catch (error) {
      if (copyStatusElement) copyStatusElement.textContent = copy.copyError;
    }
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    calculate(true);
  });
  updatePressedPreset(durationInput?.value);
  syncRegularPriceFields();
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", setupCalculator);
}

export { MAX_DURATION_MONTHS };
