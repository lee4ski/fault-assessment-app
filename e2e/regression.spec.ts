import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("loads with title, heading, and all workflow steps", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/過失割合計算機/);
    await expect(
      page.getByRole("heading", { name: "ステップ1: 認定基準の検索" })
    ).toBeVisible();

    for (const step of [
      "認定基準の検索",
      "修正要素の適用",
      "車両情報検索",
      "AI報告書作成",
    ]) {
      await expect(page.getByText(step, { exact: true })).toBeVisible();
    }
  });
});

test.describe("Step 1: keyword search", () => {
  test("returns and displays matching criteria", async ({ page }) => {
    await page.goto("/");

    await page.getByPlaceholder("例: 交差点、歩行者、駐車場など").fill("交差点");
    await page.getByRole("button", { name: "検索", exact: true }).click();

    await expect(
      page.getByText("交差点での歩行者と直進車との事故")
    ).toBeVisible();
  });

  test("shows the empty state for a non-matching search", async ({ page }) => {
    await page.goto("/");

    await page
      .getByPlaceholder("例: 交差点、歩行者、駐車場など")
      .fill("該当なしのテストキーワードxyz");
    await page.getByRole("button", { name: "検索", exact: true }).click();

    await expect(
      page.getByText("一致する認定基準が見つかりませんでした")
    ).toBeVisible();
  });
});

test.describe("Step navigation", () => {
  test("next/previous buttons move between steps and disable at the bounds", async ({
    page,
  }) => {
    await page.goto("/");

    const previousButton = page.getByRole("button", { name: "前のステップに戻る" });
    const nextButton = page.getByRole("button", { name: "次のステップへ" });

    await expect(previousButton).toBeDisabled();

    await nextButton.click();
    await expect(previousButton).toBeEnabled();
    await expect(
      page.getByText("ステップ1で認定基準を選択してください")
    ).toBeVisible();

    await previousButton.click();
    await expect(
      page.getByRole("heading", { name: "ステップ1: 認定基準の検索" })
    ).toBeVisible();
    await expect(previousButton).toBeDisabled();
  });
});

test.describe("Chat assistant panel", () => {
  test("opens, shows the greeting, and collapses again", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "アシスタントチャット" })
    ).toBeHidden();

    await page.getByTitle("チャットを開く").click();

    await expect(
      page.getByRole("heading", { name: "アシスタントチャット" })
    ).toBeVisible();
    await expect(page.getByText(/こんにちは/)).toBeVisible();

    await page.getByRole("heading", { name: "アシスタントチャット" }).click();

    await expect(
      page.getByRole("heading", { name: "アシスタントチャット" })
    ).toBeHidden();
  });
});
