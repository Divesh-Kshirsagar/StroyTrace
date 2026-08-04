import { expect, test } from "@playwright/test";

test("should allow user to login", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', "test@example.com");
  await page.fill('input[name="password"]', "testpass123");
  await page.click('button[type="submit"]');

  // Ideally this redirects to dashboard
  await expect(page).toHaveURL(/.*dashboard/);
});
