import { expect, test } from "@playwright/test";

const shellHost = "127.0.0.1:4100";

test.use({ video: "on" });

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
  await expect(page).toHaveScreenshot("20261004T1305-auth-shell-happy-path.png", {
    fullPage: true,
  });

  expect(requests.length).toBeGreaterThan(0);
  expect(requests.every((url) => url.host === shellHost)).toBe(true);
  expect(requests.some((url) => url.pathname === "/mfe/author/manifest.json")).toBe(true);
  expect(requests.some((url) => url.pathname === "/api/hello")).toBe(true);
});
