import { expect, test } from "@playwright/test";

test("should allow user to search events", async ({ page }) => {
  await page.goto("/search");

  await page.fill('input[name="q"]', "E2E");
  await page.press('input[name="q"]', "Enter");

  // Wait for results
  await expect(page.locator(".event-card").first()).toBeVisible({
    timeout: 10000,
  });
});
