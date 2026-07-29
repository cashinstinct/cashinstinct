import { defineConfig } from "@playwright/test";

const widths = [402, 768, 1280];

export default defineConfig({
  testDir: "./tests/browser",
  outputDir: "./test-results",
  fullyParallel: true,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  forbidOnly: true,
  retries: 0,
  reporter: [
    ["line"],
    ["html", { outputFolder: "playwright-report", open: "never" }]
  ],
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off"
  },
  projects: widths.map((width) => ({
    name: `chromium-${width}`,
    use: { viewport: { width, height: 900 } }
  })),
  webServer: {
    command: "npm run serve:test -- --silent",
    url: "http://127.0.0.1:4173/",
    reuseExistingServer: false,
    stdout: "ignore",
    stderr: "pipe",
    timeout: 30_000
  }
});
