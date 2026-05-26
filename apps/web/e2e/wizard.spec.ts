import { test, expect } from "@playwright/test";

test.describe("Reels Factory wizard", () => {
  test("landing has CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Создать ролик" })).toBeVisible();
  });

  test("create page loads steps", async ({ page }) => {
    await page.goto("/create");
    await expect(
      page.getByText("Какой товар рекламируем?")
    ).toBeVisible();
  });
});
