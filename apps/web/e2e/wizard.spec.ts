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

  test("wizard step 2 uses reel type dropdown", async ({ page }) => {
    await page.route("**/api/products/parse", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          product: {
            title: "Тестовый товар",
            price: 9990,
            currency: "RUB",
            images: ["https://example.com/img.jpg"],
            sourceUrl: "https://example.com/product",
          },
        }),
      });
    });

    await page.goto("/create");
    await page.fill('input[type="url"]', "https://example.com/product");
    await page.getByRole("button", { name: "Далее" }).click();
    await expect(page.getByLabel("Тип ролика")).toBeVisible();
  });
});
