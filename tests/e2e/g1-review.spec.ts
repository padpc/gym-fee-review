import { expect, test, type Page } from '@playwright/test';

async function expectNoHorizontalOverflow(page: Page) {
  const hasPageOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasPageOverflow).toBe(false);
}

async function selectExactVisits(page: Page, visits: string) {
  const group = page.getByRole('group', { name: '最近の典型的な1か月の来館回数' });
  await group.getByRole('radio', { name: '回数が分かる', exact: true }).check();
  await page.getByRole('textbox', { name: /^来館回数/ }).fill(visits);
}

async function selectPurposeCounts(
  page: Page,
  plannedLegend: string,
  achievedLegend: string,
  planned: string,
  achieved: string,
) {
  const plannedGroup = page.getByRole('group', { name: plannedLegend });
  await plannedGroup.getByRole('radio', { name: '回数が分かる', exact: true }).check();
  await page.getByRole('textbox', { name: new RegExp(`^${plannedLegend}`) }).fill(planned);

  const achievedGroup = page.getByRole('group', { name: achievedLegend });
  await achievedGroup.getByRole('radio', { name: '回数が分かる', exact: true }).check();
  await page.getByRole('textbox', { name: new RegExp(`^${achievedLegend}`) }).fill(achieved);
}

async function fillCoreExact(page: Page, options: {
  monthlyFee?: string;
  visits?: string;
  planned?: string;
  achieved?: string;
  barrier?: string;
} = {}) {
  await page.getByRole('textbox', { name: /^月会費/ }).fill(options.monthlyFee ?? '8000');
  await page.getByRole('radio', { name: '月会費以外はない', exact: true }).check();
  await selectExactVisits(page, options.visits ?? '6');
  await page.getByRole('radio', { name: '筋力を高める', exact: true }).check();
  await selectPurposeCounts(
    page,
    '予定した筋トレの来館回数',
    '筋トレを完了できた来館回数',
    options.planned ?? '8',
    options.achieved ?? '6',
  );
  await page.getByRole('radio', { name: '目的に沿う良い変化・利用があった', exact: true }).check();
  await page.getByRole('radio', { name: options.barrier ?? '特にない', exact: true }).check();
}

async function fillKnownAlternative(page: Page, options: {
  kind?: 'monthly' | 'per-visit';
  amount?: string;
  equipment?: string;
  hours?: string;
  location?: string;
} = {}) {
  const availability = page.getByRole('group', { name: '公式料金が分かる候補はありますか' });
  await availability.getByRole('radio', { name: '公式料金が分かる', exact: true }).check();
  await page.getByRole('textbox', { name: /^代替プラン名/ }).fill('比較プラン');

  const kind = options.kind ?? 'per-visit';
  const kindGroup = page.getByRole('group', { name: '料金の種類' });
  await kindGroup.getByRole('radio', { name: kind === 'per-visit' ? '都度利用' : '月額プラン', exact: true }).check();
  await page.getByRole('textbox', {
    name: kind === 'per-visit' ? /^代替プランの1回料金/ : /^代替プランの月会費/,
  }).fill(options.amount ?? (kind === 'per-visit' ? '1800' : '6000'));
  await page.getByRole('radio', { name: '表示料金以外はない', exact: true }).check();

  for (const [groupName, answer] of [
    ['必要な設備・サービス', options.equipment ?? '満たす'],
    ['必要な利用回数・時間帯', options.hours ?? '満たす'],
    ['必要な店舗範囲', options.location ?? '満たす'],
  ] as const) {
    await page.getByRole('group', { name: groupName }).getByRole('radio', { name: answer, exact: true }).check();
  }
  await page.getByRole('checkbox', { name: '通常料金、利用条件、必須費用を公式ページまたは契約書で確認した', exact: true }).check();
}

async function submitAssessment(page: Page) {
  await page.getByRole('button', { name: '活用状況を計算する' }).click();
}

test('独立ホームから診断へ進め、計算方法へ直接アクセスできる', async ({ page }) => {
  await page.goto('/');

  const header = page.locator('.site-header');
  const headerBox = await header.boundingBox();
  expect(headerBox).not.toBeNull();
  expect(headerBox?.height).toBeGreaterThanOrEqual(54);
  expect(headerBox?.height).toBeLessThanOrEqual(64);
  await expect(page.getByRole('heading', { name: '今のジム会費を、実際の使い方と変化で確認' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'この診断で分かること' })).toBeVisible();
  await expect(page.locator('form')).toHaveCount(0);

  const start = page.getByRole('link', { name: '会費の活用状況を確認する' }).first();
  await expect(start).toBeVisible();
  const startBox = await start.boundingBox();
  expect(startBox).not.toBeNull();
  expect((startBox?.y ?? Infinity) + (startBox?.height ?? Infinity)).toBeLessThanOrEqual(page.viewportSize()?.height ?? 0);
  await expectNoHorizontalOverflow(page);

  await start.click();
  await expect(page).toHaveURL(/\/check$/);
  await expect(page.getByRole('heading', { name: '会費の活用状況を確認' })).toBeVisible();
  await expect(page.locator('form')).toBeVisible();

  await page.goto('/methodology');
  await expect(page.getByRole('heading', { name: '計算方法と判断の限界' })).toBeVisible();
  await expect(page.getByText(/利用計画達成率 P ＝/)).toBeVisible();
  await expect(page.getByText(/実利用の代替価値率 Q ＝/)).toBeVisible();
  await expect(page.getByText(/G1対象外/)).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto('/does-not-exist');
  await expect(page.getByRole('heading', { name: 'ページが見つかりません' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('正確値からC・P・Q・実績単価・差額を計算し、修正時に値を保持する', async ({ page }) => {
  await page.goto('/check');
  await page.getByRole('textbox', { name: /^月会費/ }).fill('8000');
  await page.getByRole('radio', { name: '追加費用・年会費がある', exact: true }).check();
  await page.getByRole('textbox', { name: /^現在の利用に毎月必要な追加費用/ }).fill('300');
  await page.getByRole('textbox', { name: /^年会費等/ }).fill('3600');
  await selectExactVisits(page, '6');
  await page.getByRole('radio', { name: '月の合計時間', exact: true }).check();
  await page.getByRole('textbox', { name: /^月の合計滞在時間/ }).fill('9');
  await page.getByRole('radio', { name: '筋力を高める', exact: true }).check();
  await selectPurposeCounts(page, '予定した筋トレの来館回数', '筋トレを完了できた来館回数', '8', '6');
  await page.getByRole('radio', { name: '目的に沿う良い変化・利用があった', exact: true }).check();
  await page.getByRole('radio', { name: '特にない', exact: true }).check();
  await fillKnownAlternative(page);
  await submitAssessment(page);

  await expect(page.getByRole('heading', { name: '会費の活用状況', exact: true })).toBeFocused();
  await expect(page.getByRole('heading', { name: '実質月額 8,600円' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '利用計画達成率' }).locator('..')).toContainText('75%');
  await expect(page.getByRole('heading', { name: '1回あたり料金' }).locator('..')).toContainText('1,433円／回');
  await expect(page.getByRole('heading', { name: '1時間あたり料金' }).locator('..')).toContainText('956円／時間');
  const comparison = page.getByRole('heading', { name: '現在プランが同額以下' }).locator('xpath=ancestor::section[contains(@class, "comparison-result")]');
  await expect(comparison).toContainText('125.6%');
  await expect(comparison).toContainText('現在が月2,200円・年26,400円低い');
  await expect(page.getByRole('heading', { name: '利用計画と実行方法を1か月だけ見直して再確認する' })).toBeVisible();

  const metricCards = page.locator('.result-metrics .result-card');
  const firstBox = await metricCards.nth(0).boundingBox();
  const secondBox = await metricCards.nth(1).boundingBox();
  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();
  if ((page.viewportSize()?.width ?? 0) <= 840) {
    expect(secondBox?.y ?? 0).toBeGreaterThan((firstBox?.y ?? 0) + (firstBox?.height ?? 0) - 1);
  } else {
    expect(secondBox?.x ?? 0).toBeGreaterThan(firstBox?.x ?? 0);
  }
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: '入力を修正' }).click();
  await expect(page.getByRole('heading', { name: '今の費用と使い方を入力' })).toBeFocused();
  await expect(page.getByRole('textbox', { name: /^月会費/ })).toHaveValue('8000');
  await expect(page.getByRole('textbox', { name: /^来館回数/ })).toHaveValue('6');
  await expect(page.getByRole('radio', { name: '筋力を高める', exact: true })).toBeChecked();
});

test('目的変更は質問と目的別実績を切り替え、安くても非同等な候補を採用しない', async ({ page }) => {
  await page.goto('/check');
  await fillCoreExact(page, { planned: '6', achieved: '6' });

  await page.getByRole('radio', { name: '健康維持・運動習慣', exact: true }).check();
  const plannedGroup = page.getByRole('group', { name: '予定したジム運動の来館日数' });
  const achievedGroup = page.getByRole('group', { name: 'ジムで運動できた来館日数' });
  await expect(plannedGroup.getByRole('radio', { name: '回数が分かる', exact: true })).not.toBeChecked();
  await expect(achievedGroup.getByRole('radio', { name: '回数が分かる', exact: true })).not.toBeChecked();
  await expect(page.getByRole('textbox', { name: /^予定したジム運動の来館日数/ })).toHaveCount(0);
  await expect(page.getByRole('radio', { name: '目的に沿う良い変化・利用があった', exact: true })).not.toBeChecked();

  await selectPurposeCounts(page, '予定したジム運動の来館日数', 'ジムで運動できた来館日数', '6', '6');
  await page.getByRole('radio', { name: '目的に沿う良い変化・利用があった', exact: true }).check();

  await fillKnownAlternative(page, { kind: 'monthly', amount: '6000', equipment: '満たさない' });
  await submitAssessment(page);

  const comparison = page.getByRole('heading', { name: '料金だけでは同等と判断できない' }).locator('xpath=ancestor::section[contains(@class, "comparison-result")]');
  await expect(comparison).toContainText('必要な設備・サービスを満たさないため、料金だけで同等とは扱いません');
  await expect(comparison).not.toContainText('同等の代替が低い');
  await expect(comparison).not.toContainText('現在の実質月額が0円');
  await expect(page.getByRole('heading', { name: '利用計画達成率' }).locator('..')).toContainText('100%');
  await expectNoHorizontalOverflow(page);
});

test('代替不明と0回を安全に扱い、得損や除算結果を捏造しない', async ({ page }) => {
  await page.goto('/check');
  await fillCoreExact(page, { visits: '0', planned: '8', achieved: '0' });
  await submitAssessment(page);

  await expect(page.getByRole('heading', { name: '比較資料不足' })).toBeVisible();
  await expect(page.getByText(/料金の得・損は確定していません/)).toBeVisible();
  await expect(page.getByRole('heading', { name: '1回あたり料金' }).locator('..')).toContainText('利用0回・支払額8,000円');
  await expect(page.getByRole('heading', { name: '利用計画達成率' }).locator('..')).toContainText('0%');
  await expect(page.getByText(/来館0回かつ目的に使えた来館回数0回/)).toBeVisible();
  await expect(page.getByText(/Infinity|NaN|0円／回/)).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test('回数範囲を中央値へ置換せず、単価と代替比較を範囲表示する', async ({ page }) => {
  await page.goto('/check');
  await page.getByRole('textbox', { name: /^月会費/ }).fill('8000');
  await page.getByRole('radio', { name: '月会費以外はない', exact: true }).check();
  const visitGroup = page.getByRole('group', { name: '最近の典型的な1か月の来館回数' });
  await visitGroup.getByRole('radio', { name: 'だいたい分かる', exact: true }).check();
  await page.getByRole('radio', { name: '週1回前後（月4～6回）', exact: true }).check();
  await page.getByRole('radio', { name: '1回の平均時間', exact: true }).check();
  await page.getByRole('textbox', { name: /^1回の平均滞在時間/ }).fill('60');
  await page.getByRole('radio', { name: '筋力を高める', exact: true }).check();
  await selectPurposeCounts(page, '予定した筋トレの来館回数', '筋トレを完了できた来館回数', '6', '4');
  await page.getByRole('radio', { name: '目的に沿う良い変化・利用があった', exact: true }).check();
  await page.getByRole('radio', { name: '特にない', exact: true }).check();
  await fillKnownAlternative(page);
  await submitAssessment(page);

  await expect(page.getByRole('heading', { name: '回数によって変わる' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '1回あたり料金' }).locator('..')).toContainText('1,333～2,000円／回');
  await expect(page.getByRole('heading', { name: '1時間あたり料金' }).locator('..')).toContainText('1,333～2,000円／時間');
  await expect(page.getByRole('heading', { name: '回数によって変わる' }).locator('xpath=ancestor::section[contains(@class, "comparison-result")]')).toContainText('90%～135%');
  await expect(page.getByRole('heading', { name: '正確な来館回数を記録して料金差を再確認する' })).toBeVisible();
  await expect(page.getByText(/来館回数を1か月だけ記録し、入力済みの都度料金と再比較する/)).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('入力エラーをまとめ、先頭の不正項目へフォーカスする', async ({ page }) => {
  await page.goto('/check');
  await submitAssessment(page);

  await expect(page.getByRole('alert')).toContainText('8件の入力を確認してください');
  await expect(page.getByRole('textbox', { name: /^月会費/ })).toBeFocused();
  await expect(page.getByRole('alert')).toContainText('回数の分かり方を選んでください');
  await expect(page.getByRole('alert')).toContainText('主な目的を選んでください');
  await expectNoHorizontalOverflow(page);
});

test('入力値をURL・外部通信・永続ストレージへ残さない', async ({ page, context }) => {
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.hostname !== '127.0.0.1') externalRequests.push(request.url());
  });

  await page.goto('/check');
  await fillCoreExact(page);
  await submitAssessment(page);
  await expect(page.getByRole('heading', { name: '会費の活用状況', exact: true })).toBeVisible();

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
  await expect(page.getByRole('textbox', { name: /^月会費/ })).toHaveValue('');
  await expect(page.getByRole('heading', { name: '会費の活用状況', exact: true })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});
