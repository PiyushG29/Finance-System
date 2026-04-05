import { expect, test } from "@playwright/test";

test.describe("Route protection", () => {
  test("redirects unauthenticated users from dashboard to auth", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/auth$/);
    await expect(page.getByRole("heading", { name: "Finance Dashboard" })).toBeVisible();
  });
});
