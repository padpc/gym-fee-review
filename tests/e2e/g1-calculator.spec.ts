import { expect, test, type Page } from '@playwright/test';

async function expectNoHorizontalOverflow(page: Page) {
  const hasPageOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasPageOverflow).toBe(false);
}

async function completeCalculation(page: Page) {
  await page.getByLabel('月会費').fill('8000');
  await page.getByLabel(/直近1か月/).fill('4');
  await page.getByLabel(/2か月前/).fill('5');
  await page.getByLabel(/3か月前/).fill('6');
  await page.getByRole('button', { name: '都度払いと比べる' }).click();
  await page.getByLabel('1回料金').fill('1500');
  await page.getByRole('button', { name: '比較結果を見る' }).click();
}

test('代表例を計算し、3つの主要幅で横にはみ出さない', async ({ page }) => {
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.hostname !== '127.0.0.1') externalRequests.push(request.url());
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /ジム会費、\s*元とれてる？/ })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.getByLabel('月会費').fill('8000');
  await page.getByLabel(/直近1か月/).fill('4');
  await page.getByLabel(/2か月前/).fill('5');
  await page.getByLabel(/3か月前/).fill('6');
  await page.getByRole('button', { name: '都度払いと比べる' }).click();
  await expectNoHorizontalOverflow(page);
  await page.getByLabel('1回料金').fill('1500');
  await page.getByRole('button', { name: '比較結果を見る' }).click();

  await expect(page.getByRole('heading', { name: '比較結果' })).toBeFocused();
  await expect(page.getByText('直近3か月は合計15回、平均5.0回／月でした。')).toBeVisible();
  await expect(page.getByText('現在プランの支払額は、1回あたり約1,600円です。')).toBeVisible();
  await expect(
    page.getByText('入力した条件の料金だけなら、候補の方が年間6,000円低い試算です。'),
  ).toBeVisible();
  await expect(page.getByText('月6回から現在プランの料金が低くなります。')).toBeVisible();
  await expect(page.getByText('月0回', { exact: true })).toBeVisible();
  await expect(page.getByText('月20回', { exact: true })).toBeVisible();
  await expect(page.getByText('料金境界', { exact: true })).toBeVisible();
  await expect(page.getByText(/違約金、退会期限は自動判定していません/)).toBeVisible();

  await expectNoHorizontalOverflow(page);
  expect(externalRequests).toEqual([]);
});

test('全月0回でも比較結果を表示する', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('月会費').fill('8000');
  await page.getByLabel(/直近1か月/).fill('0');
  await page.getByLabel(/2か月前/).fill('0');
  await page.getByLabel(/3か月前/).fill('0');
  await page.getByRole('button', { name: '都度払いと比べる' }).click();
  await page.getByLabel('1回料金').fill('1500');
  await page.getByRole('button', { name: '比較結果を見る' }).click();

  await expect(page.getByText('直近3か月の利用は0回でした。')).toBeVisible();
  await expect(
    page.getByText('1回あたり費用は算出できません。利用がなかった3か月の支払額は24,000円です。'),
  ).toBeVisible();
});

test('月20回で初めて同額になる上限境界を表示する', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('月会費').fill('100000');
  await page.getByLabel(/直近1か月/).fill('20');
  await page.getByLabel(/2か月前/).fill('20');
  await page.getByLabel(/3か月前/).fill('20');
  await page.getByRole('button', { name: '都度払いと比べる' }).click();
  await page.getByLabel('1回料金').fill('5000');
  await page.getByRole('button', { name: '比較結果を見る' }).click();

  await expect(page.getByText('月20回で同額です。')).toBeVisible();
  await expect(page.locator('.comparison-table__row--boundary')).toContainText('月20回');
  await expect(page.locator('.comparison-table__row--boundary')).toContainText('料金境界');
});

test('入力エラーを修正して完了できる', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '都度払いと比べる' }).click();
  await expect(page.getByRole('alert')).toContainText('4件の入力を確認してください');
  await expect(page.getByLabel('月会費')).toBeFocused();

  await page.getByLabel('月会費').fill('-1');
  await page.getByLabel(/直近1か月/).fill('1.5');
  await page.getByLabel(/2か月前/).fill('101');
  await page.getByLabel(/3か月前/).fill('6');
  await page.getByRole('button', { name: '都度払いと比べる' }).click();
  await expect(page.locator('#current-monthly-fee-error')).toHaveText(
    '月会費を0～100,000円の整数で入力してください。',
  );

  await page.getByLabel('月会費').fill('8000');
  await page.getByLabel(/直近1か月/).fill('4');
  await page.getByLabel(/2か月前/).fill('5');
  await page.getByRole('button', { name: '都度払いと比べる' }).click();
  await page.getByLabel('1回料金').fill('1500');
  await page.getByRole('button', { name: '比較結果を見る' }).click();
  await expect(page.getByRole('heading', { name: '比較結果' })).toBeVisible();
});

test('入力をURL・ブラウザ保存へ残さず、再読込で初期化する', async ({ page, context }) => {
  await page.goto('/');
  await completeCalculation(page);

  const currentUrl = new URL(page.url());
  expect(currentUrl.pathname).toBe('/');
  expect(currentUrl.search).toBe('');
  expect(currentUrl.hash).toBe('');
  const browserState = await page.evaluate(async () => ({
    localStorage: Object.keys(localStorage),
    sessionStorage: Object.keys(sessionStorage),
    cookie: document.cookie,
    databases: typeof indexedDB.databases === 'function' ? await indexedDB.databases() : [],
  }));
  expect(browserState.localStorage).toEqual([]);
  expect(browserState.sessionStorage).toEqual([]);
  expect(browserState.cookie).toBe('');
  expect(browserState.databases).toEqual([]);
  expect(await context.cookies()).toEqual([]);

  await page.reload();
  await expect(page.getByLabel('月会費')).toHaveValue('');
  await expect(page.getByRole('heading', { name: '比較結果' })).toHaveCount(0);
});
