import { defineConfig } from "html-validate";

export default defineConfig({
  root: true,
  extends: ["html-validate:recommended"],
  rules: {
    "prefer-native-element": "off",
    "tel-non-breaking": "off",
    "long-title": "off",
    "no-inline-style": "off",
    "no-trailing-whitespace": "off",
    "void-style": "off",
    "aria-label-misuse": "off",
    "no-implicit-button-type": "error",
    "no-dup-id": "error",
    "no-missing-references": "error"
  }
});
