import { expect, test, type Page } from '@playwright/test';

async function expectNoHorizontalOverflow(page: Page) {
  const hasPageOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasPageOverflow).toBe(false);
}

async function chooseCriterion(page: Page, name: string) {
  await page.getByRole('radio', { name }).check();
  await page.getByRole('button', { name: 'この基準で入力へ' }).click();
}

test('回数不明でも1回単価の目安を確認でき、入力を外部へ残さない', async ({ page, context }) => {
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.hostname !== '127.0.0.1') externalRequests.push(request.url());
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'ジム会費を、自分の基準で見直す' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await chooseCriterion(page, '1回あたり料金で見る');
  await page.getByLabel(/^月会費/).fill('8000');
  await page.getByRole('radio', { name: '分からない（回数別の目安を見る）' }).check();
  await page.getByRole('button', { name: '自分の会費の見え方を見る' }).click();

  await expect(page.getByRole('heading', { name: '会費の見え方', exact: true })).toBeFocused();
  await expect(page.getByText('回数不明')).toBeVisible();
  await expect(page.getByRole('row', { name: /月0回 算出不可/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /月20回 400円/ })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  expect(externalRequests).toEqual([]);

  const browserState = await page.evaluate(async () => ({
    localStorage: Object.keys(localStorage),
    sessionStorage: Object.keys(sessionStorage),
    cookie: document.cookie,
    databases: typeof indexedDB.databases === 'function' ? await indexedDB.databases() : [],
    caches: typeof caches === 'undefined' ? [] : await caches.keys(),
  }));
  expect(browserState).toEqual({ localStorage: [], sessionStorage: [], cookie: '', databases: [], caches: [] });
  expect(await context.cookies()).toEqual([]);
  expect(new URL(page.url()).search).toBe('');

  await page.getByRole('button', { name: '入力を修正' }).click();
  await expect(page.getByRole('heading', { name: '必要な項目を入力' })).toBeFocused();
  await expect(page.getByRole('textbox', { name: /^月会費/ })).toHaveValue('8000');
  await expectNoHorizontalOverflow(page);

  await page.reload();
  await expect(page.getByRole('radio', { name: '1回あたり料金で見る' })).not.toBeChecked();
  await expect(page.getByRole('heading', { name: '会費の見え方', exact: true })).toHaveCount(0);
});

test('回数不明と平均滞在時間から時間単価シナリオを表示する', async ({ page }) => {
  await page.goto('/');
  await chooseCriterion(page, '1時間あたり料金で見る');
  await page.getByRole('textbox', { name: /^月会費/ }).fill('8000');
  await page.getByRole('radio', { name: '1回の平均滞在時間' }).check();
  await page.getByRole('textbox', { name: /^1回の平均滞在時間/ }).fill('90');
  await page.getByRole('radio', { name: '分からない（回数別の目安を見る）' }).check();
  await page.getByRole('button', { name: '自分の会費の見え方を見る' }).click();

  await expect(page.getByRole('heading', { name: '1時間あたり' })).toBeVisible();
  await expect(page.getByRole('row', { name: /月0回 0分 算出不可/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /月6回 9時間 889円/ })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('0回を未利用月として安全に表示する', async ({ page }) => {
  await page.goto('/');
  await chooseCriterion(page, '1回あたり料金で見る');
  await page.getByLabel(/^月会費/).fill('8000');
  await page.getByRole('radio', { name: '先月の回数が分かる' }).check();
  await page.getByLabel(/^先月の来館回数/).fill('0');
  await page.getByRole('button', { name: '自分の会費の見え方を見る' }).click();

  await expect(page.getByText('1回あたりは算出できません')).toBeVisible();
  await expect(page.getByText('先月は0回でした。未利用月の月額相当は8,000円です。')).toBeVisible();
});

test('概数と平均滞在時間を範囲のまま表示する', async ({ page }) => {
  await page.goto('/');
  await chooseCriterion(page, '1時間あたり料金で見る');
  await page.getByLabel(/^月会費/).fill('8000');
  await page.getByRole('radio', { name: '1回の平均滞在時間' }).check();
  await page.getByRole('textbox', { name: /^1回の平均滞在時間/ }).fill('90');
  await page.getByRole('radio', { name: 'だいたいの頻度なら分かる' }).check();
  await page.getByRole('radio', { name: '週1回前後（月4～6回）' }).check();
  await page.getByRole('button', { name: '自分の会費の見え方を見る' }).click();

  await expect(page.getByText('概数（月4～6回）')).toBeVisible();
  await expect(page.getByText('約889～1,333円／時間')).toBeVisible();
  await expect(page.getByText('合計滞在時間の目安：6～9時間')).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('設備だけの経路で回数なしに利用と重要性を確認できる', async ({ page }) => {
  await page.goto('/');
  await chooseCriterion(page, '使った設備・プログラムで見る');
  await expect(page.getByRole('group', { name: '回数の分かり方' })).toHaveCount(0);
  await page.getByLabel(/^月会費/).fill('8000');
  await page.getByRole('checkbox', { name: '風呂・サウナを使った' }).check();
  await page.getByLabel('風呂・サウナの利用頻度').selectOption('not-countable');
  await page.getByRole('checkbox', { name: '風呂・サウナは会費を払う理由として重要' }).check();
  await page.getByRole('checkbox', { name: 'プールは会費を払う理由として重要' }).check();
  await page.getByRole('button', { name: '自分の会費の見え方を見る' }).click();

  await expect(page.getByText('風呂・サウナ：回数では表しにくい')).toBeVisible();
  await expect(page.getByText('重要だが、そのひと月は使っていないもの')).toBeVisible();
  await expect(page.getByText('プール', { exact: true })).toHaveCount(2);
  await expect(page.getByText(/総合得点|退会すべき|都度払い/)).toHaveCount(0);
});

test('続けやすさだけを採点せずに確認できる', async ({ page }) => {
  await page.goto('/');
  await chooseCriterion(page, '続けやすさで見る');
  await expect(page.getByRole('group', { name: '回数の分かり方' })).toHaveCount(0);
  await page.getByRole('textbox', { name: /^月会費/ }).fill('8000');
  await page.getByRole('checkbox', { name: '使いたい時間に開いている' }).check();
  await page.getByRole('button', { name: '自分の会費の見え方を見る' }).click();

  await expect(page.getByRole('heading', { name: '料金以外で失いたくない条件' })).toBeVisible();
  await expect(page.getByText('使いたい時間に開いている')).toBeVisible();
  await expect(page.getByRole('heading', { name: '1回あたり' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '1時間あたり' })).toHaveCount(0);
  await expect(page.getByText(/総合得点|お得|損|退会すべき/)).toHaveCount(0);
});

test('エラーを修正し、まとめて確認を完了できる', async ({ page }) => {
  await page.goto('/');
  await chooseCriterion(page, 'まとめて見る');
  await page.getByRole('button', { name: '自分の会費の見え方を見る' }).click();
  await expect(page.getByRole('alert')).toContainText('2件の入力を確認してください');
  await expect(page.getByLabel(/^月会費/)).toBeFocused();

  await page.getByLabel(/^月会費/).fill('8000');
  await page.getByRole('radio', { name: '分からない（回数別の目安を見る）' }).check();
  await page.getByRole('checkbox', { name: '自宅・職場からの近さ' }).check();
  await page.getByRole('button', { name: '自分の会費の見え方を見る' }).click();

  await expect(page.getByRole('heading', { name: '料金以外で失いたくない条件' })).toBeVisible();
  await expect(page.getByText('自宅・職場からの近さ')).toBeVisible();
  await expect(page.getByText(/総合得点|お得|退会すべき/)).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});
