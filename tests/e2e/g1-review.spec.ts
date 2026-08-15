import { expect, test, type Locator, type Page } from '@playwright/test';

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

async function chooseNoExtraFees(page: Page) {
  await page.getByRole('group', { name: '毎月必須の追加費用' }).getByRole('radio', { name: 'ない', exact: true }).check();
  await page.getByRole('group', { name: '年会費・更新料など' }).getByRole('radio', { name: 'ない', exact: true }).check();
}

async function fillBase(page: Page, options: { visits?: string; unknownVisits?: boolean } = {}) {
  await page.getByRole('textbox', { name: /^基本月会費/ }).fill('8000');
  await chooseNoExtraFees(page);
  const visits = page.getByRole('group', { name: '最近の1か月の来館回数' });
  if (options.unknownVisits) {
    await visits.getByRole('radio', { name: '分からない' }).check();
  } else {
    await visits.getByRole('radio', { name: '回数が分かる' }).check();
    await page.getByRole('textbox', { name: /^来館回数/ }).fill(options.visits ?? '4');
  }
}

async function selectPrimary(page: Page, label: string, status = '期待どおり得られた') {
  await page.getByRole('group', { name: '最も重要だったものを1つ選んでください' }).getByRole('radio', { name: label }).check();
  const article = page.getByRole('heading', { name: label, level: 4 }).locator('xpath=ancestor::article[1]');
  await article.getByRole('radio', { name: status }).check();
}

async function selectSecondary(page: Page, label: string, status: string) {
  await page.getByRole('checkbox', { name: label }).check();
  const article = page.getByRole('heading', { name: label, level: 4 }).locator('xpath=ancestor::article[1]');
  await article.getByRole('radio', { name: status }).check();
}

async function tabTo(page: Page, locator: Locator) {
  for (let index = 0; index < 180; index += 1) {
    if (await locator.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error('target was not reached by Tab');
}

test('ホーム、診断、方法、404の導線に通常の概要を表示する', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '今の会費に、払い続ける理由があるか整理' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '料金・利用・期待・負担を、一つの結論へまとめます' })).toBeVisible();
  await expect(page.getByText('4問')).toHaveCount(0);
  await expect(page.getByText('最近1か月の4つだけ')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'よくある質問' })).toHaveCount(0);
  await expect(page.locator('form')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await page.getByRole('link', { name: 'ジム会費を診断する' }).first().click();
  await expect(page).toHaveURL(/\/check$/);
  await expect(page.getByRole('textbox', { name: /^基本月会費/ })).toBeVisible();
  await expect(page.getByRole('group', { name: '毎月必須の追加費用' })).toBeVisible();
  await expect(page.getByRole('group', { name: '年会費・更新料など' })).toBeVisible();
  await expect(page.getByText(/強い痛み|胸の痛み|めまい/)).toHaveCount(0);

  await page.goto('/methodology');
  await expect(page.getByRole('heading', { name: '計算方法と判断の考え方' })).toBeVisible();
  await expect(page.getByText(/実質月額 C ＝ 基本月会費/)).toBeVisible();
  await expect(page.getByRole('heading', { name: '結論に使う代表的な条件' })).toBeVisible();
  await expect(page.getByText(/規則1|規則2|適用した規則/)).toHaveCount(0);

  await page.goto('/not-a-page');
  await expect(page.getByRole('heading', { name: 'ページが見つかりません' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('料金総額、複数の重要な利用、温浴、質の未達、館内時間を統合して表示する', async ({ page }) => {
  await page.goto('/check');
  await page.getByRole('textbox', { name: /^基本月会費/ }).fill('8000');
  const monthly = page.getByRole('group', { name: '毎月必須の追加費用' });
  await monthly.getByRole('radio', { name: 'あり、金額が分かる' }).check();
  await page.getByRole('textbox', { name: /^毎月必須の追加費用/ }).fill('300');
  const annual = page.getByRole('group', { name: '年会費・更新料など' });
  await annual.getByRole('radio', { name: 'あり、金額が分かる' }).check();
  await page.getByRole('textbox', { name: /^年会費・更新料など/ }).fill('3600');
  await page.getByRole('radio', { name: '回数が分かる' }).check();
  await page.getByRole('textbox', { name: /^来館回数/ }).fill('4');
  await page.getByRole('radio', { name: '月の合計時間' }).check();
  await page.getByRole('textbox', { name: /^月の合計館内利用時間/ }).fill('6');
  await selectPrimary(page, 'トレーニング設備・フリーウェイト');
  await selectSecondary(page, '風呂・温泉・サウナ・休憩', '利用したが、内容・質が期待以下だった');
  await selectSecondary(page, 'プール・水中運動', '一部得られた');

  await expect(page.getByText('追加で選択中：2／2件')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: '指導・フォーム確認' })).toBeDisabled();
  await expect(page.getByText('計算済みの実質月額').locator('..')).toContainText('8,600円');
  await page.getByRole('radio', { name: '無理なく払える' }).check();
  await page.getByRole('button', { name: '診断結果を見る' }).click();

  await expect(page.getByRole('heading', { name: 'ジム会費の診断結果' })).toBeFocused();
  await expect(page.getByRole('heading', { name: '今の会費を続ける根拠があります' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '結論を支える根拠' }).locator('..')).toContainText('トレーニング設備・フリーウェイト');
  await expect(page.getByRole('heading', { name: '結論を支える根拠' }).locator('..')).toContainText('プール・水中運動');
  await expect(page.getByRole('heading', { name: '見直す根拠' }).locator('..')).toContainText('風呂・温泉・サウナ・休憩');
  await expect(page.getByRole('heading', { name: '実質月額 8,600円' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '館内利用1時間あたり' }).locator('..')).toContainText('1,433円');
  const order = await page.locator('.result h2, .result h3').allTextContents();
  expect(order.indexOf('結論を支える根拠')).toBeLessThan(order.indexOf('見直す根拠'));
  expect(order.indexOf('見直す根拠')).toBeLessThan(order.indexOf('実質月額 8,600円'));
  expect(order.indexOf('実質月額 8,600円')).toBeLessThan(order.indexOf('次の一行動'));
  await expect(page.getByText(/適用した規則/)).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test('範囲来館と主価値の一部充足から、あと1か月の確認を提案する', async ({ page }) => {
  await page.goto('/check');
  await page.getByRole('textbox', { name: /^基本月会費/ }).fill('8000');
  await chooseNoExtraFees(page);
  const visits = page.getByRole('group', { name: '最近の1か月の来館回数' });
  await visits.getByRole('radio', { name: 'だいたい分かる' }).check();
  await page.getByRole('group', { name: 'だいたいの来館回数' }).getByRole('radio', { name: '週1回前後（月4～6回）' }).check();
  await selectPrimary(page, 'トレーニング設備・フリーウェイト', '一部得られた');
  await page.getByRole('radio', { name: '無理なく払える' }).check();
  await page.getByRole('button', { name: '診断結果を見る' }).click();

  await expect(page.getByRole('heading', { name: 'あと1か月だけ、重要な利用を確認しましょう' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '結論を支える根拠' }).locator('..')).toContainText('トレーニング設備・フリーウェイト');
  await expect(page.getByRole('heading', { name: '結論を支える根拠' }).locator('..')).toContainText('一部得られ、会費を支える材料がある');
  await expect(page.getByRole('heading', { name: '見直す根拠' }).locator('..')).toContainText('トレーニング設備・フリーウェイト');
  await expect(page.getByRole('heading', { name: '見直す根拠' }).locator('..')).toContainText('一部に留まり、満たしていない点が残る');
  await expect(page.getByRole('heading', { name: '来館1回あたり' }).locator('..')).toContainText('1,333円〜2,000円');
  await expectNoHorizontalOverflow(page);
});

test('不明な追加料金を0円扱いせず、回数不明では参考額を示す', async ({ page }) => {
  await page.goto('/check');
  await page.getByRole('textbox', { name: /^基本月会費/ }).fill('8000');
  await page.getByRole('group', { name: '毎月必須の追加費用' }).getByRole('radio', { name: 'あるか金額が分からない' }).check();
  await page.getByRole('group', { name: '年会費・更新料など' }).getByRole('radio', { name: 'ない', exact: true }).check();
  await page.getByRole('group', { name: '最近の1か月の来館回数' }).getByRole('radio', { name: '分からない' }).check();
  await page.getByRole('radio', { name: '1回の平均時間' }).check();
  await page.getByRole('textbox', { name: /^1回の平均館内利用時間/ }).fill('90');
  await selectPrimary(page, '立地・営業時間・通いやすさ');
  await expect(page.getByText('入力済み分の月額').locator('..')).toContainText('毎月の追加費用は未確認');
  await page.getByRole('radio', { name: '無理なく払える' }).check();
  await page.getByRole('button', { name: '診断結果を見る' }).click();

  await expect(page.getByRole('heading', { name: '価値はあります。料金条件を見直しましょう' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '入力済み分の月額 8,000円' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '見直す根拠' }).locator('..')).toContainText('毎月の追加費用が不明');
  const perVisit = page.getByRole('heading', { name: '来館1回あたり' }).locator('..');
  for (const count of [1, 2, 4, 8, 12]) await expect(perVisit).toContainText(`月${count}回なら`);
  const perHour = page.getByRole('heading', { name: '館内利用1時間あたり' }).locator('..');
  await expect(perHour).toContainText('合計1.5時間（90分）');
  await expectNoHorizontalOverflow(page);
});

test('来館0回と重要な利用なしを割り算せず、契約見直しへつなげる', async ({ page }) => {
  await page.goto('/check');
  await fillBase(page, { visits: '0' });
  await expect(page.getByRole('group', { name: '最も重要だったものを1つ選んでください' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '最近の利用' }).locator('..').locator('..')).toContainText('来館0回のため');
  await page.getByRole('radio', { name: '少し負担に感じる' }).check();
  await page.getByRole('button', { name: '診断結果を見る' }).click();

  await expect(page.getByRole('heading', { name: '今の会費は見直し候補です' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '見直す根拠' }).locator('..')).toContainText('会費を払う主な理由になる利用は特にない');
  const perVisit = page.getByRole('heading', { name: '来館1回あたり' }).locator('..');
  await expect(perVisit).toContainText('来館0回では');
  await expect(perVisit).toContainText('8,000円');
  await expectNoHorizontalOverflow(page);
});

test('その他の具体名と期待が未回答なら、エラー要約から先頭入力へ移動する', async ({ page }) => {
  await page.goto('/check');
  await fillBase(page);
  await page.getByRole('radio', { name: 'その他' }).check();
  await page.getByRole('radio', { name: '無理なく払える' }).check();
  await page.getByRole('button', { name: '診断結果を見る' }).click();

  await expect(page.getByRole('alert')).toContainText('その他の内容を1～80文字で入力してください');
  await expect(page.getByRole('alert')).toContainText('この利用が期待どおりだったか選んでください');
  await expect(page.getByRole('textbox', { name: '具体的な利用' })).toBeFocused();
  const statusGroup = page.getByRole('group', { name: '期待していた使い方や内容に対して、どうでしたか' });
  await expect(statusGroup).toHaveAttribute('aria-invalid', 'true');
  await expectNoHorizontalOverflow(page);
});

test('入力を通信・URL・永続領域へ残さず、修正時だけ画面内で保持する', async ({ page, context }) => {
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.hostname !== '127.0.0.1') externalRequests.push(request.url());
  });

  await page.goto('/check');
  await fillBase(page);
  await selectPrimary(page, 'プール・水中運動');
  await page.getByRole('radio', { name: '無理なく払える' }).check();
  await page.getByRole('button', { name: '診断結果を見る' }).click();
  await page.getByRole('button', { name: '入力を修正' }).click();
  await expect(page.getByRole('heading', { name: '今の会費を診断する' })).toBeFocused();
  await expect(page.getByRole('textbox', { name: /^基本月会費/ })).toHaveValue('8000');
  await expect(page.getByRole('radio', { name: 'プール・水中運動' })).toBeChecked();

  expect(externalRequests).toEqual([]);
  expect(new URL(page.url()).search).toBe('');
  expect(new URL(page.url()).hash).toBe('');
  const browserState = await page.evaluate(async () => ({
    localStorage: Object.keys(localStorage),
    sessionStorage: Object.keys(sessionStorage),
    cookie: document.cookie,
    databases: typeof indexedDB.databases === 'function' ? await indexedDB.databases() : [],
    caches: typeof caches === 'undefined' ? [] : await caches.keys(),
  }));
  expect(browserState).toEqual({ localStorage: [], sessionStorage: [], cookie: '', databases: [], caches: [] });
  expect(await context.cookies()).toEqual([]);

  await page.reload();
  await expect(page.getByRole('textbox', { name: /^基本月会費/ })).toHaveValue('');
});

test('キーボードだけで代表診断を完了し、結果見出しへ移動する', async ({ page }) => {
  await page.goto('/');
  const start = page.getByRole('link', { name: 'ジム会費を診断する' }).first();
  await tabTo(page, start);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/check$/);

  const monthlyFee = page.getByRole('textbox', { name: /^基本月会費/ });
  await tabTo(page, monthlyFee);
  await page.keyboard.type('8000');
  const noMonthlyExtra = page.locator('#monthly-additional-none');
  await tabTo(page, noMonthlyExtra); await page.keyboard.press('Space');
  const noAnnualFee = page.locator('#annual-fee-none');
  await tabTo(page, noAnnualFee); await page.keyboard.press('Space');
  const firstVisitMode = page.locator('#visit-mode');
  await tabTo(page, firstVisitMode);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#visit-mode-unknown')).toBeChecked();
  const firstValue = page.locator('#primary-value-training');
  await tabTo(page, firstValue);
  for (let index = 0; index < 8; index += 1) await page.keyboard.press('ArrowRight');
  await expect(page.locator('#no-value-used')).toBeChecked();
  const comfortable = page.getByRole('radio', { name: '無理なく払える' });
  await tabTo(page, comfortable);
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: '少し負担に感じる' })).toBeChecked();
  const submit = page.getByRole('button', { name: '診断結果を見る' });
  await tabTo(page, submit); await page.keyboard.press('Enter');

  await expect(page.getByRole('heading', { name: 'ジム会費の診断結果' })).toBeFocused();
  await expect(page.getByRole('heading', { name: '今の会費は見直し候補です' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
