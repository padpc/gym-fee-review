import { expect, test, type Locator, type Page } from '@playwright/test';

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

async function fillFeesAndVisits(page: Page, options: { visits?: string; unknownVisits?: boolean } = {}) {
  await page.getByRole('textbox', { name: /^月会費/ }).fill('8000');
  await page.getByRole('radio', { name: '月会費以外はない' }).check();
  const visits = page.getByRole('group', { name: '最近の典型的な1か月の来館回数' });
  if (options.unknownVisits) {
    await visits.getByRole('radio', { name: '分からない' }).check();
  } else {
    await visits.getByRole('radio', { name: '回数が分かる' }).check();
    await page.getByRole('textbox', { name: /^来館回数/ }).fill(options.visits ?? '4');
  }
}

async function answerValue(
  page: Page,
  valueLabel: string,
  options: { frequency?: string; fulfillment?: string; payReason?: string; customLabel?: string } = {},
) {
  await page.getByRole('checkbox', { name: valueLabel }).check();
  const article = page.getByRole('heading', { name: valueLabel, level: 4 }).locator('xpath=ancestor::article[1]');
  if (options.customLabel) await article.getByRole('textbox', { name: '具体的な価値' }).fill(options.customLabel);
  await article.getByRole('group', { name: 'どの程度使いましたか' }).getByRole('radio', { name: options.frequency ?? '複数回' }).check();
  await article.getByRole('group', { name: '期待どおり使えましたか' }).getByRole('radio', { name: options.fulfillment ?? '期待どおりだった', exact: true }).check();
  await article.getByRole('group', { name: 'これは会費を払って残したい価値ですか' }).getByRole('radio', { name: options.payReason ?? '会費を払ってでも残したい' }).check();
}

async function answerDecision(
  page: Page,
  options: { continuation?: string; burden?: string; barrier?: string } = {},
) {
  await page.getByRole('radio', { name: options.continuation ?? '同じ条件でも来月また選ぶ' }).check();
  await page.getByRole('radio', { name: options.burden ?? '無理なく払える' }).check();
  if (options.barrier) await page.getByRole('radio', { name: options.barrier }).check();
}

async function tabTo(page: Page, locator: Locator) {
  for (let index = 0; index < 120; index += 1) {
    if (await locator.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error('target was not reached by Tab');
}

test('ホーム、診断、計算方法、404の導線とR5概要を表示する', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '回数だけでは見えない、あなたが残したい価値まで確認' })).toBeVisible();
  await expect(page.getByText(/風呂・サウナ、交流、通いやすさも同じ価値/)).toBeVisible();
  await expect(page.getByText(/入力はブラウザ内だけで計算し、外部へ送りません/)).toBeVisible();
  await expect(page.locator('form')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await page.getByRole('link', { name: 'ジム会費を診断する' }).first().click();
  await expect(page).toHaveURL(/\/check$/);
  await expect(page.getByRole('heading', { name: '今の会費を払って続ける理由を確認' })).toBeVisible();
  await expect(page.getByRole('group', { name: '今月、ジムで使ったものをすべて選んでください' })).toBeVisible();
  await expect(page.getByText('主な目的')).toHaveCount(0);
  await expect(page.getByText('候補1件を比較する')).toHaveCount(0);
  await expect(page.getByRole('group', { name: /強い痛み|胸の痛み|めまい/ })).toHaveCount(0);
  await expect(page.getByText(/運動中に強い痛み、胸の痛み、めまい等がある場合/)).toBeVisible();

  await page.goto('/methodology');
  await expect(page.getByRole('heading', { name: '計算方法と判断の限界' })).toBeVisible();
  await expect(page.getByText(/館内利用1時間あたり ＝ C ÷ 月の館内利用時間/)).toBeVisible();
  await expect(page.getByRole('heading', { name: '結論を決める規則' })).toBeVisible();

  await page.goto('/not-a-page');
  await expect(page.getByRole('heading', { name: 'ページが見つかりません' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('複数の利用価値と館内時間から、残したい価値と料金の見え方を示す', async ({ page }) => {
  await page.goto('/check');
  await fillFeesAndVisits(page);
  await page.getByRole('radio', { name: '月の合計時間' }).check();
  await page.getByRole('textbox', { name: /^月の合計館内利用時間/ }).fill('6');
  await answerValue(page, 'トレーニング設備', { frequency: '多くの来館・日常で役立った' });
  await answerValue(page, '風呂・温泉・サウナ・休憩', { fulfillment: '一部は期待どおりだった', payReason: 'まだ判断できない' });
  await answerDecision(page);
  await page.getByRole('button', { name: '診断結果を見る' }).click();

  await expect(page.getByRole('heading', { name: 'ジム会費の診断結果' })).toBeFocused();
  await expect(page.getByRole('heading', { name: 'あなたには、この会費を払って続ける理由があります' })).toBeVisible();
  await expect(page.locator('.decision-rule')).toContainText('適用した規則：規則6');
  await expect(page.getByRole('heading', { name: '会費を払って残したい価値' }).locator('..')).toContainText('トレーニング設備');
  await expect(page.getByRole('heading', { name: '次の利用で確かめたい価値' }).locator('..')).toContainText('風呂・温泉・サウナ・休憩');
  await expect(page.getByRole('heading', { name: '館内利用1時間あたり' }).locator('..')).toContainText('1,333円');
  await expect(page.getByRole('heading', { name: '期待どおり使えたかの件数' }).locator('..')).toContainText('期待どおり1件');
  await expect(page.getByText(/時間が長いほど高価値とは判定していません/)).toBeVisible();
  const resultHeadingOrder = await page.locator('.result h2, .result h3').allTextContents();
  expect(resultHeadingOrder.indexOf('会費を払って残したい価値')).toBeLessThan(resultHeadingOrder.indexOf('実質月額 8,000円'));
  expect(resultHeadingOrder.indexOf('実質月額 8,000円')).toBeLessThan(resultHeadingOrder.indexOf('次の一行動'));
  expect(resultHeadingOrder.indexOf('次の一行動')).toBeLessThan(resultHeadingOrder.indexOf('結論が変わる条件'));
  await expectNoHorizontalOverflow(page);
});

test('風呂・サウナだけの低頻度利用でも、本人の強い価値を回数だけで否定しない', async ({ page }) => {
  await page.goto('/check');
  await fillFeesAndVisits(page, { visits: '1' });
  await answerValue(page, '風呂・温泉・サウナ・休憩', { frequency: '1回程度' });
  await answerDecision(page);
  await page.getByRole('button', { name: '診断結果を見る' }).click();

  await expect(page.getByRole('heading', { name: 'あなたには、この会費を払って続ける理由があります' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '来館1回あたり' }).locator('..')).toContainText('8,000円');
  await expect(page.getByRole('heading', { name: '会費を払って残したい価値' }).locator('..')).toContainText('風呂・温泉・サウナ・休憩');
  await expect(page.getByRole('heading', { name: '次の一行動' }).locator('..')).toContainText('同じ頻度でも会費を払う理由になるか');
  await expectNoHorizontalOverflow(page);
});

test('回数不明でも価値結論と1・2・4・8・12回の参考単価を表示する', async ({ page }) => {
  await page.goto('/check');
  await fillFeesAndVisits(page, { unknownVisits: true });
  await answerValue(page, '立地・営業時間・通いやすさ', { frequency: '覚えていない' });
  await answerDecision(page);
  await page.getByRole('button', { name: '診断結果を見る' }).click();

  await expect(page.getByRole('heading', { name: 'あなたには、この会費を払って続ける理由があります' })).toBeVisible();
  const perVisit = page.getByRole('heading', { name: '来館1回あたり' }).locator('..');
  await expect(perVisit).toContainText('来館回数が不明');
  for (const count of [1, 2, 4, 8, 12]) await expect(perVisit).toContainText(`月${count}回なら`);
  await expect(page.getByRole('heading', { name: '館内利用1時間あたり' }).locator('..')).toContainText('館内利用時間を入力していないため');
  await expectNoHorizontalOverflow(page);
});

test('回数不明で1回平均時間を入力した場合も、回数別の時間単価を表示する', async ({ page }) => {
  await page.goto('/check');
  await fillFeesAndVisits(page, { unknownVisits: true });
  await page.getByRole('radio', { name: '1回の平均時間' }).check();
  await page.getByRole('textbox', { name: /^1回の平均館内利用時間/ }).fill('90');
  await answerValue(page, '風呂・温泉・サウナ・休憩');
  await answerDecision(page);
  await page.getByRole('button', { name: '診断結果を見る' }).click();

  const perHour = page.getByRole('heading', { name: '館内利用1時間あたり' }).locator('..');
  await expect(perHour).toContainText('来館回数が不明');
  for (const count of [1, 2, 4, 8, 12]) await expect(perHour).toContainText(`月${count}回`);
  await expect(perHour).toContainText('合計1.5時間（90分）');
  await expectNoHorizontalOverflow(page);
});

test('利用なしでは阻害要因を尋ね、強い価値ができると非表示・破棄する', async ({ page }) => {
  await page.goto('/check');
  await fillFeesAndVisits(page, { visits: '0' });
  await page.getByRole('checkbox', { name: '今月は特に利用していない' }).check();
  await answerDecision(page, { continuation: '迷っている', burden: '少し負担に感じる', barrier: '一時的に利用できなかった' });
  await expect(page.getByRole('group', { name: '継続を迷わせる主な要因は何ですか' })).toBeVisible();

  await page.getByRole('checkbox', { name: 'トレーニング設備' }).check();
  const article = page.getByRole('heading', { name: 'トレーニング設備', level: 4 }).locator('xpath=ancestor::article[1]');
  await article.getByRole('radio', { name: '1回程度' }).check();
  await article.getByRole('radio', { name: '期待どおりだった', exact: true }).check();
  await article.getByRole('radio', { name: '会費を払ってでも残したい' }).check();
  await page.getByRole('radio', { name: '同じ条件でも来月また選ぶ' }).check();
  await page.getByRole('radio', { name: '無理なく払える' }).check();
  await expect(page.getByRole('group', { name: '継続を迷わせる主な要因は何ですか' })).toHaveCount(0);

  await page.getByRole('radio', { name: '迷っている' }).check();
  await expect(page.getByRole('radio', { name: '一時的に利用できなかった' })).not.toBeChecked();
  await expectNoHorizontalOverflow(page);
});

test('来館0回では割れない理由と支払った実質月額を代わりに示す', async ({ page }) => {
  await page.goto('/check');
  await fillFeesAndVisits(page, { visits: '0' });
  await page.getByRole('checkbox', { name: '今月は特に利用していない' }).check();
  await answerDecision(page, { continuation: '迷っている', burden: '少し負担に感じる', barrier: '一時的に利用できなかった' });
  await page.getByRole('button', { name: '診断結果を見る' }).click();
  const perVisit = page.getByRole('heading', { name: '来館1回あたり' }).locator('..');
  await expect(perVisit).toContainText('来館回数が0回のため');
  await expect(perVisit).toContainText('今月支払った実質月額は8,000円');
});

test('その他の具体名と各価値の3回答を検証し、先頭エラーへ移動する', async ({ page }) => {
  await page.goto('/check');
  await fillFeesAndVisits(page);
  await page.getByRole('checkbox', { name: 'その他' }).check();
  await answerDecision(page, { barrier: 'その他' });
  await page.getByRole('button', { name: '診断結果を見る' }).click();

  await expect(page.getByRole('alert')).toContainText('その他の価値を1～80文字で入力してください');
  await expect(page.getByRole('textbox', { name: '具体的な価値' })).toBeFocused();
  await expect(page.getByRole('alert')).toContainText('この価値をどの程度使ったか選んでください');
  await expect(page.getByRole('alert')).toContainText('この価値が期待どおりだったか選んでください');
  await expect(page.getByRole('alert')).toContainText('この価値が会費を払って残したいものか選んでください');
  await expectNoHorizontalOverflow(page);
});

test('入力をURL・通信・永続ストレージへ残さず、修正時だけ画面内で保持する', async ({ page, context }) => {
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.hostname !== '127.0.0.1') externalRequests.push(request.url());
  });

  await page.goto('/check');
  await fillFeesAndVisits(page);
  await answerValue(page, 'プール・水中運動');
  await answerDecision(page);
  await page.getByRole('button', { name: '診断結果を見る' }).click();
  await page.getByRole('button', { name: '入力を修正' }).click();
  await expect(page.getByRole('heading', { name: '料金と、残したい価値を入力' })).toBeFocused();
  await expect(page.getByRole('textbox', { name: /^月会費/ })).toHaveValue('8000');
  await expect(page.getByRole('checkbox', { name: 'プール・水中運動' })).toBeChecked();

  expect(externalRequests).toEqual([]);
  expect(new URL(page.url()).search).toBe('');
  expect(new URL(page.url()).hash).toBe('');
  const browserState = await page.evaluate(async () => ({
    localStorage: Object.keys(localStorage), sessionStorage: Object.keys(sessionStorage), cookie: document.cookie,
    databases: typeof indexedDB.databases === 'function' ? await indexedDB.databases() : [],
    caches: typeof caches === 'undefined' ? [] : await caches.keys(),
  }));
  expect(browserState).toEqual({ localStorage: [], sessionStorage: [], cookie: '', databases: [], caches: [] });
  expect(await context.cookies()).toEqual([]);

  await page.reload();
  await expect(page.getByRole('textbox', { name: /^月会費/ })).toHaveValue('');
  await expect(page.getByRole('heading', { name: 'ジム会費の診断結果' })).toHaveCount(0);
});

test('キーボードだけでホームから代表診断を完了し、結果見出しへ移動する', async ({ page }) => {
  await page.goto('/');
  const start = page.getByRole('link', { name: 'ジム会費を診断する' }).first();
  await tabTo(page, start);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/check$/);

  const monthlyFee = page.getByRole('textbox', { name: /^月会費/ });
  await tabTo(page, monthlyFee);
  await page.keyboard.type('8000');
  const noExtras = page.getByRole('radio', { name: '月会費以外はない' });
  await tabTo(page, noExtras); await page.keyboard.press('Space');
  const visitGroup = page.getByRole('group', { name: '最近の典型的な1か月の来館回数' });
  const exactVisits = visitGroup.getByRole('radio', { name: '回数が分かる' });
  await tabTo(page, exactVisits); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  await expect(visitGroup.getByRole('radio', { name: '分からない' })).toBeChecked();
  const noValue = page.getByRole('checkbox', { name: '今月は特に利用していない' });
  await tabTo(page, noValue); await page.keyboard.press('Space');
  const continuationGroup = page.getByRole('group', { name: '来月も同じ料金・同じ使い方なら、このジムを選びますか' });
  const choose = continuationGroup.getByRole('radio', { name: '同じ条件でも来月また選ぶ' });
  await tabTo(page, choose); await page.keyboard.press('ArrowRight');
  await expect(continuationGroup.getByRole('radio', { name: '迷っている' })).toBeChecked();
  const burdenGroup = page.getByRole('group', { name: '現在の会費は、生活費に対して無理なく払えますか' });
  const comfortable = burdenGroup.getByRole('radio', { name: '無理なく払える' });
  await tabTo(page, comfortable); await page.keyboard.press('ArrowRight');
  await expect(burdenGroup.getByRole('radio', { name: '少し負担に感じる' })).toBeChecked();
  const barrierGroup = page.getByRole('group', { name: '継続を迷わせる主な要因は何ですか' });
  const price = barrierGroup.getByRole('radio', { name: '料金・会費' });
  await tabTo(page, price);
  for (let index = 0; index < 7; index += 1) await page.keyboard.press('ArrowRight');
  await expect(barrierGroup.getByRole('radio', { name: '一時的に利用できなかった' })).toBeChecked();
  const submit = page.getByRole('button', { name: '診断結果を見る' });
  await tabTo(page, submit); await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'ジム会費の診断結果' })).toBeFocused();
  await expectNoHorizontalOverflow(page);
});
