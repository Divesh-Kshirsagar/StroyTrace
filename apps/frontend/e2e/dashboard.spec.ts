import { test, expect } from '@playwright/test';

test('should display dashboard for authenticated user', async ({ page }) => {
  await page.goto('/dashboard');
  
  // Check that the dashboard loaded
  await expect(page.locator('text=Dashboard')).toBeVisible();
});
