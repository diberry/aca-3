import { expect, test } from "@playwright/test";

const shellHost = "127.0.0.1:4100";

test("renders the local Author through Auth/Shell with same-origin requests", async ({ page }) => {
  const requests: URL[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (["http:", "https:", "ws:", "wss:"].includes(url.protocol)) {
      requests.push(url);
    }
  });

  await page.goto("/");
  await expect(page.getByRole("link", { name: "ACA Platform" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  await expect(page.getByText("Playwright Local Author", { exact: true })).toBeVisible();
  await expect(page.getByTestId("backend-greeting")).toContainText(
    "Hello, Playwright Local Author.",
  );

  expect(requests.length).toBeGreaterThan(0);
  expect(requests.every((url) => url.host === shellHost)).toBe(true);
  expect(requests.some((url) => url.pathname === "/mfe/author/manifest.json")).toBe(true);
  expect(requests.some((url) => url.pathname === "/api/hello")).toBe(true);
});

test("keeps the shell available when the Author runtime is unavailable", async ({ page }) => {
  await page.route("**/mfe/author/manifest.json", (route) => route.abort());

  await page.goto("/");

  await expect(page.getByRole("link", { name: "ACA Platform" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Author is temporarily unavailable" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry Author" })).toBeVisible();
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
});
