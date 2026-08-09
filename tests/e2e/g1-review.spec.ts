import { expect, test, type Page } from '@playwright/test';

async function expectNoHorizontalOverflow(page: Page) {
  const hasPageOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasPageOverflow).toBe(false);
}

async function fillValueAxis(
  page: Page,
  options: {
    purpose?: string;
    progress?: string;
    replaceability?: string;
  } = {},
) {
  await page.getByRole('radio', { name: options.purpose ?? '運動習慣を保つ場所', exact: true }).check();
  await page.getByRole('radio', { name: options.progress ?? 'できた', exact: true }).check();
  await page.getByRole('radio', { name: options.replaceability ?? '代替しにくい', exact: true }).check();
}

async function submitAssessment(page: Page) {
  await page.getByRole('button', { name: '2つの軸で判定する' }).click();
}

test('縮小ヘッダーの初期表示で月会費入力をスクロール前に操作できる', async ({ page }) => {
  await page.goto('/');

  const header = page.locator('.site-header');
  const headerBox = await header.boundingBox();
  expect(headerBox).not.toBeNull();
  expect(headerBox?.height).toBeGreaterThanOrEqual(52);
  expect(headerBox?.height).toBeLessThanOrEqual(64);
  await expect(header).toHaveText('ジム会費、元とれてる？');
  await expect(header.getByRole('button')).toHaveCount(0);

  const monthlyFee = page.getByRole('textbox', { name: /^月会費/ });
  const inputBox = await monthlyFee.boundingBox();
  expect(inputBox).not.toBeNull();
  const viewport = page.viewportSize();
  expect((inputBox?.y ?? Infinity) + (inputBox?.height ?? Infinity)).toBeLessThanOrEqual(viewport?.height ?? 0);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await expectNoHorizontalOverflow(page);
});

test('本人の月額上限内で利用価値が強い結果を表示し、修正時に値を保持する', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: /^月会費/ }).fill('8000');
  await page.getByRole('radio', { name: '月会費は月いくらまでなら納得できるか', exact: true }).check();
  await page.getByRole('textbox', { name: /^納得できる月額上限/ }).fill('9000');
  await fillValueAxis(page);
  await submitAssessment(page);

  await expect(page.getByRole('heading', { name: '会費の見直し結果' })).toBeFocused();
  await expect(page.getByRole('heading', { name: 'あなたの基準では、料金にも利用価値にも納得しやすい状態です' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '料金の判定' }).locator('..')).toContainText('あなたの基準内');
  await expect(page.getByRole('heading', { name: '月額相当に含めた費用' }).locator('..')).toContainText('月会費8,000円');
  await expect(page.getByRole('heading', { name: '利用価値の判定' }).locator('..')).toContainText('通う価値の根拠が強い');
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: '入力を修正' }).click();
  await expect(page.getByRole('heading', { name: '料金と利用価値を入力' })).toBeFocused();
  await expect(page.getByRole('textbox', { name: /^月会費/ })).toHaveValue('8000');
  await expect(page.getByRole('radio', { name: '月会費は月いくらまでなら納得できるか', exact: true })).toBeChecked();
});

test('実在代替案より現在が高く、利用価値も弱い結果を明示する', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: /^月会費/ }).fill('8000');
  await page.getByRole('radio', { name: '実際に検討できる代替案はいくらか', exact: true }).check();
  await page.getByRole('textbox', { name: /^実在する代替案の月額相当/ }).fill('7000');
  await fillValueAxis(page, {
    purpose: '風呂・サウナ',
    progress: 'ほとんどできなかった',
    replaceability: '代替しやすい',
  });
  await submitAssessment(page);

  await expect(page.getByRole('heading', { name: '料金は基準を超え、この入力では通う価値の根拠も弱い状態です' })).toBeVisible();
  await expect(page.getByText(/入力した代替案の方が低い/)).toBeVisible();
  await expect(page.getByText(/設備、距離、営業時間、違約金等が同等とは判定していません/)).toBeVisible();
  await expect(page.getByText(/総合得点|退会すべき|来館すべき|健康になる/)).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test('回数範囲で1回上限を跨ぐ場合は片軸を隠さず表示する', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: /^月会費/ }).fill('8000');
  await page.getByRole('radio', { name: '1回あたりいくらまでなら納得できるか', exact: true }).check();
  await page.getByRole('textbox', { name: /^納得できる1回あたり上限/ }).fill('1500');
  const visitGroup = page.getByRole('group', { name: '先月の回数は分かりますか' });
  await visitGroup.getByRole('radio', { name: 'だいたい分かる', exact: true }).check();
  await page.getByRole('radio', { name: '週1回前後（月4～6回）', exact: true }).check();
  await fillValueAxis(page);
  await submitAssessment(page);

  await expect(page.getByRole('heading', { name: '料金は利用回数によって基準内か超過かが変わります。通う価値の根拠は強い状態です' })).toBeVisible();
  await expect(page.getByText('回数によって変わる', { exact: true })).toBeVisible();
  await expect(page.getByText('料金上は月6回で、1回上限以下になる計算です')).toBeVisible();
  await expect(page.getByText(/その回数まで来館するよう勧めるものではありません/)).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('回数不明でも必要回数とシナリオを示し、入力を端末へ残さない', async ({ page, context }) => {
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.hostname !== '127.0.0.1') externalRequests.push(request.url());
  });

  await page.goto('/');
  await page.getByRole('textbox', { name: /^月会費/ }).fill('8000');
  await page.getByRole('radio', { name: '1回あたりいくらまでなら納得できるか', exact: true }).check();
  await page.getByRole('textbox', { name: /^納得できる1回あたり上限/ }).fill('1000');
  const visitGroup = page.getByRole('group', { name: '先月の回数は分かりますか' });
  await visitGroup.getByRole('radio', { name: '分からない', exact: true }).check();
  await fillValueAxis(page);
  await submitAssessment(page);

  await expect(page.getByRole('heading', { name: '料金は判断材料が不足しています。通う価値の根拠は強い状態です' })).toBeVisible();
  await expect(page.getByText('料金上は月8回で、1回上限以下になる計算です')).toBeVisible();
  await expect(page.getByRole('row', { name: /月0回 算出不可/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /月20回 400円/ })).toBeVisible();
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

  await page.reload();
  await expect(page.getByRole('textbox', { name: /^月会費/ })).toHaveValue('');
  await expect(page.getByRole('heading', { name: '会費の見直し結果' })).toHaveCount(0);
});

test('0回と価値の材料不足を安全に分けて表示する', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: /^月会費/ }).fill('8000');
  await page.getByRole('radio', { name: '1回あたりいくらまでなら納得できるか', exact: true }).check();
  await page.getByRole('textbox', { name: /^納得できる1回あたり上限/ }).fill('2000');
  const visitGroup = page.getByRole('group', { name: '先月の回数は分かりますか' });
  await visitGroup.getByRole('radio', { name: '回数が分かる', exact: true }).check();
  await page.getByRole('textbox', { name: /^先月の来館回数/ }).fill('0');
  await page.getByRole('radio', { name: 'プール', exact: true }).check();
  await page.getByRole('group', { name: '先月、その目的を実現できましたか' }).getByRole('radio', { name: '分からない', exact: true }).check();
  await page.getByRole('radio', { name: '代替しにくい', exact: true }).check();
  await submitAssessment(page);

  await expect(page.getByRole('heading', { name: '料金はあなたの基準を超えています。通う価値は判断材料が不足しています' })).toBeVisible();
  await expect(page.getByText('先月0回のため、1回あたりは算出できません')).toBeVisible();
  await expect(page.getByText('先月は0回で1回あたりを算出できず、本人上限を満たす利用実績ではありません。')).toBeVisible();
  await expect(page.getByText('未利用月の月額相当は8,000円です。')).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('入力エラーをまとめ、基準変更後の非表示エラーを残さない', async ({ page }) => {
  await page.goto('/');
  await submitAssessment(page);
  await expect(page.getByRole('alert')).toContainText('5件の入力を確認してください');
  await expect(page.getByRole('textbox', { name: /^月会費/ })).toBeFocused();

  await page.getByRole('textbox', { name: /^月会費/ }).fill('8000');
  await page.getByRole('radio', { name: '1回あたりいくらまでなら納得できるか', exact: true }).check();
  await page.getByRole('textbox', { name: /^納得できる1回あたり上限/ }).fill('1000');
  await fillValueAxis(page);
  await submitAssessment(page);
  await expect(page.getByRole('alert')).toContainText('回数の分かり方を選んでください');

  await page.getByRole('radio', { name: '月会費は月いくらまでなら納得できるか', exact: true }).check();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('group', { name: '先月の回数は分かりますか' })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});
