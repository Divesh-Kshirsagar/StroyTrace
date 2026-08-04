import { expect, test } from "@playwright/test";

test("should allow user to create an event", async ({ page }) => {
  await page.goto("/dashboard");
  await page.click("text=New Event");

  await page.fill('input[name="title"]', "E2E Test Event");
  await page.click('button:has-text("Create")');

  // Should redirect to event editor
  await expect(page).toHaveURL(/.*editor/);
  await expect(page.locator("h1")).toContainText("E2E Test Event");
});
