import { expect, test } from "@playwright/test";

test("should allow user to view an event", async ({ page }) => {
  // Assuming there's a seeded event with slug e2e-test-event
  await page.goto("/event/e2e-test-event");

  await expect(page.locator("h1")).toBeVisible();
});
