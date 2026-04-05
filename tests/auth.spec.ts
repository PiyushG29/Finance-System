import { expect, test } from "@playwright/test";

test.describe("Auth page", () => {
  test("renders sign in mode and can switch to sign up", async ({ page }) => {
    await page.goto("/auth");

    await expect(page.getByRole("heading", { name: "Finance Dashboard" })).toBeVisible();
    await expect(page.getByLabel("Username or Email")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();

    await page.getByRole("button", { name: "Don't have an account? Sign up" }).click();

    await expect(page.getByLabel("Username")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign Up" })).toBeVisible();
  });
});
