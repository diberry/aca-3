import { expect, test } from "@playwright/test";

test("keeps the shell available when the Author runtime is unavailable", async ({ page }) => {
  await page.route("**/mfe/author/manifest.json", (route) => route.abort());

  await page.goto("/");

  await expect(page.getByRole("link", { name: "ACA Platform" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Author is temporarily unavailable" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry Author" })).toBeVisible();
  await expect(page).toHaveScreenshot("20261004T1305-author-unavailable.png", {
    fullPage: true,
  });
});

test("keeps Author available and offers a retry when Backend is unavailable", async ({ page }) => {
  await page.route("**/api/hello", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "unavailable" }),
    }),
  );

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Author" })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText(/backend greeting is unavailable/i);
  await expect(page.getByRole("button", { name: "Retry backend" })).toBeVisible();
  await expect(page).toHaveScreenshot("20261004T1305-backend-unavailable.png", {
    fullPage: true,
  });
});
