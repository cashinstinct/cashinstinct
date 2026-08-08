export default class FaqReport {
  constructor() {
    this.pages = new Map();
  }

  onTestEnd(test) {
    for (const annotation of test.annotations ?? []) {
      if (annotation.type !== "faq-exact-baseline") continue;
      try {
        const data = JSON.parse(annotation.description ?? "{}");
        if (data.file) this.pages.set(data.file, data);
      } catch {
        // The browser assertion remains the source of truth if reporting metadata is malformed.
      }
    }
  }

  onEnd() {
    if (!this.pages.size) return;
    const entries = [...this.pages.values()].sort((first, second) => first.file.localeCompare(second.file));
    const pageFailures = entries.filter((entry) => entry.pageFailure);
    const questionCount = entries.reduce((total, entry) => total + entry.questionCount, 0);
    const questionFailures = entries.reduce((total, entry) => total + entry.exactMismatches.length, 0);
    console.log(
      `\nFAQ réponses exactes (full): ${entries.length - pageFailures.length}/${entries.length} pages, ` +
      `${questionCount - questionFailures}/${questionCount} réponses (rapport informatif)`
    );
    for (const entry of entries) {
      if (!entry.pageFailure) continue;
      console.log(`  - ${entry.file}: ${entry.exactMismatches.length ? `Q${entry.exactMismatches.join(", Q")}` : "nombre de questions différent"}`);
    }
  }
}
