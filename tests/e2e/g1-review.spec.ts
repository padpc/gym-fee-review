import { expect, test, type Page } from '@playwright/test';

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    body: document.body.scrollWidth > document.body.clientWidth,
    document: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
  expect(overflow).toEqual({ body: false, document: false });
}

async function tabTo(page: Page, target: ReturnType<Page['locator']>, maximumTabs = 60) {
  for (let index = 0; index < maximumTabs; index += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`Tabキーで対象へ移動できませんでした: ${await target.getAttribute('id') ?? await target.getAttribute('name') ?? 'unknown'}`);
}

async function selectExactVisits(page: Page, visits: string) {
  const group = page.getByRole('group', { name: '最近の典型的な1か月の来館回数' });
  await group.getByRole('radio', { name: '回数が分かる', exact: true }).check();
  await page.getByRole('textbox', { name: /^来館回数/ }).fill(visits);
}

async function selectExactCount(page: Page, legend: string, count: string) {
  const group = page.getByRole('group', { name: legend });
  await group.getByRole('radio', { name: '回数が分かる', exact: true }).check();
  await page.getByRole('textbox', { name: new RegExp(`^${legend}`) }).fill(count);
}

async function fillCore(page: Page, options: {
  visits?: string;
  performed?: string;
  completed?: string;
  contentFit?: string;
  evidence?: string;
  continuation?: string;
  safety?: string;
  barrier?: string;
  services?: string[];
} = {}) {
  await page.getByRole('textbox', { name: /^月会費/ }).fill('8000');
  await page.getByRole('radio', { name: '月会費以外はない', exact: true }).check();
  await selectExactVisits(page, options.visits ?? '6');
  await page.getByRole('radio', { name: '筋力を高める', exact: true }).check();
  await page.getByRole('radio', { name: '筋力トレーニング', exact: true }).check();
  await selectExactCount(page, '目的の活動を行った来館回数 S', options.performed ?? '6');
  await selectExactCount(page, '予定した主な内容を完了した回数 F', options.completed ?? '6');
  await page.getByRole('radio', { name: options.contentFit ?? '合っていた', exact: true }).check();
  await page.getByRole('radio', { name: options.evidence ?? '良い方向', exact: true }).check();
  for (const service of options.services ?? ['特になし']) {
    await page.getByRole('checkbox', { name: service, exact: true }).check();
  }
  await page.getByRole('radio', { name: options.continuation ?? '選びたい', exact: true }).check();
  await page.getByRole('radio', { name: options.safety ?? 'なかった', exact: true }).check();
  if (options.barrier) {
    await page.getByRole('group', { name: '利用・完了・満足を妨げた主な要因' })
      .getByRole('radio', { name: options.barrier, exact: true }).check();
  }
}

async function fillKnownAlternative(page: Page, servicesAnswer = '満たす') {
  await page.getByRole('group', { name: '公式料金を確認した候補も比較しますか' })
    .getByRole('radio', { name: '候補1件を比較する' }).check();
  await page.getByRole('textbox', { name: /^代替プラン名/ }).fill('比較プラン');
  await page.getByRole('group', { name: '料金の種類' }).getByRole('radio', { name: '都度利用', exact: true }).check();
  await page.getByRole('textbox', { name: /^代替プランの1回料金/ }).fill('1800');
  await page.getByRole('radio', { name: '表示料金以外はない', exact: true }).check();
  for (const [groupName, answer] of [
    ['主な活動と実際に使った付帯サービス', servicesAnswer],
    ['必要な利用時間帯', '満たす'],
    ['必要な店舗範囲', '満たす'],
  ] as const) {
    await page.getByRole('group', { name: groupName }).getByRole('radio', { name: answer, exact: true }).check();
  }
  await page.getByRole('checkbox', {
    name: '通常料金、利用条件、必須費用を公式ページまたは契約書で確認した',
    exact: true,
  }).check();
}

async function submitAssessment(page: Page) {
  await page.getByRole('button', { name: '診断結果を見る' }).click();
}

test('ホーム・診断・計算方法・404の主要導線を表示する', async ({ page }) => {
  await page.goto('/');

  const headerBox = await page.locator('.site-header').boundingBox();
  expect(headerBox).not.toBeNull();
  expect(headerBox?.height).toBeLessThanOrEqual(64);
  await expect(page.getByRole('heading', { name: '会費を、通った回数だけでなく「できた活動」から確認' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'この診断で分かること' })).toBeVisible();
  await expect(page.locator('form')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await page.getByRole('link', { name: 'ジム会費を診断する' }).first().click();
  await expect(page).toHaveURL(/\/check$/);
  await expect(page.getByRole('heading', { name: '会費と使い方を診断' })).toBeVisible();
  await expect(page.locator('form')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto('/methodology');
  await expect(page.getByRole('heading', { name: '計算方法と判断の限界' })).toBeVisible();
  await expect(page.getByText('目的活動1回あたり ＝ C ÷ 目的活動回数 S', { exact: true })).toBeVisible();
  await expect(page.getByText('内容完了率 ＝ F ÷ S × 100', { exact: true })).toBeVisible();
  await expect(page.getByText(/実運動時間の長さだけで、質が高いとは判定しません/)).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto('/does-not-exist');
  await expect(page.getByRole('heading', { name: 'ページが見つかりません' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('全入力を根拠へ反映し、結果冒頭に一行動と変更条件を示す', async ({ page }, testInfo) => {
  await page.goto('/check');
  await page.getByRole('textbox', { name: /^月会費/ }).fill('8000');
  await page.getByRole('radio', { name: '追加費用・年会費がある', exact: true }).check();
  await page.getByRole('textbox', { name: /^現在の利用に毎月必要な追加費用/ }).fill('300');
  await page.getByRole('textbox', { name: /^年会費等/ }).fill('3600');
  await selectExactVisits(page, '6');
  await page.getByRole('radio', { name: '月の合計実運動時間', exact: true }).check();
  await page.getByRole('textbox', { name: /^月の合計実運動時間/ }).fill('9');
  await page.getByRole('radio', { name: '筋力を高める', exact: true }).check();
  await page.getByRole('radio', { name: '筋力トレーニング', exact: true }).check();
  await selectExactCount(page, '目的の活動を行った来館回数 S', '6');
  await selectExactCount(page, '予定した主な内容を完了した回数 F', '4');
  await page.getByRole('radio', { name: '合っていた', exact: true }).check();
  await page.getByRole('radio', { name: '良い方向', exact: true }).check();
  await page.getByRole('checkbox', { name: '専門設備', exact: true }).check();
  await page.getByRole('checkbox', { name: '温浴・サウナ', exact: true }).check();
  await page.getByRole('radio', { name: '選びたい', exact: true }).check();
  await page.getByRole('radio', { name: 'なかった', exact: true }).check();
  await page.getByRole('group', { name: '利用・完了・満足を妨げた主な要因' })
    .getByRole('radio', { name: '必要な設備を使えなかった', exact: true }).check();
  await fillKnownAlternative(page);
  await submitAssessment(page);

  await expect(page.getByRole('heading', { name: '会費の活用状況', exact: true })).toBeFocused();
  const overview = page.locator('.result-overview');
  await expect(overview.getByRole('heading', { name: '目的活動は行えているが、内容を見直す' })).toBeVisible();
  await expect(overview).toContainText('目的活動 S：6回');
  await expect(overview).toContainText('内容完了 F：4回');
  await expect(overview.locator('.decision-grid__action')).toContainText('次の一行動');
  await expect(overview.locator('.change-condition')).toContainText('結論が変わる条件');
  await expect(overview).toContainText('主な阻害要因：必要な設備を使えなかった');
  await expect(page.getByRole('heading', { name: '実質月額 8,600円' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '来館1回あたり' }).locator('..')).toContainText('1,433円／回');
  await expect(page.getByRole('heading', { name: '目的活動1回あたり' }).locator('..')).toContainText('1,433円／回');
  await expect(page.getByRole('heading', { name: '内容完了1回あたり' }).locator('..')).toContainText('2,150円／回');
  await expect(page.getByRole('heading', { name: '実運動1時間あたり' }).locator('..')).toContainText('956円／時間');
  await expect(page.getByText('活動利用率 S÷V').locator('..')).toContainText('100%');
  await expect(page.getByText('内容完了率 F÷S').locator('..')).toContainText('66.7%');
  await expect(page.getByRole('heading', { name: '同じ活動回数で、始めた内容を完了できた場合' }).locator('..')).toContainText('1,433円／完了');
  await expect(page.getByText('筋力を高める', { exact: true })).toBeVisible();
  await expect(page.getByText('筋力トレーニング', { exact: true })).toBeVisible();
  await expect(page.getByText('合っていた', { exact: true })).toBeVisible();
  await expect(page.locator('.quality-grid > div').filter({ hasText: '目的に沿う変化' })).toContainText('良い方向');
  await expect(page.getByText('選びたい', { exact: true })).toBeVisible();
  await expect(page.getByText('なかった', { exact: true })).toBeVisible();
  await expect(page.getByText('専門設備', { exact: true })).toBeVisible();
  await expect(page.getByText('温浴・サウナ', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '同等比較で保持する活動・サービス' }).locator('..')).toContainText('実利用の付帯サービス：専門設備・温浴・サウナ');
  await expect(page.getByRole('heading', { name: '現在プランが同額以下' }).locator('xpath=ancestor::section[contains(@class, "comparison-result")]')).toContainText('現在が月2,200円・年26,400円低い');

  const cards = page.locator('.decision-grid > section');
  const boxes = await Promise.all([0, 1, 2].map((index) => cards.nth(index).boundingBox()));
  expect(boxes.every(Boolean)).toBe(true);
  if (testInfo.project.name === 'desktop-1280') {
    expect(Math.abs((boxes[0]?.y ?? 0) - (boxes[2]?.y ?? 0))).toBeLessThan(3);
  } else if (testInfo.project.name === 'tablet-768') {
    expect(Math.abs((boxes[0]?.y ?? 0) - (boxes[1]?.y ?? 0))).toBeLessThan(3);
    expect(boxes[2]?.y ?? 0).toBeGreaterThan(boxes[0]?.y ?? 0);
  } else {
    expect(boxes[1]?.y ?? 0).toBeGreaterThan(boxes[0]?.y ?? 0);
    expect(boxes[2]?.y ?? 0).toBeGreaterThan(boxes[1]?.y ?? 0);
  }
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: '入力を修正' }).click();
  await expect(page.getByRole('heading', { name: '最近1か月の費用と使い方を入力' })).toBeFocused();
  await expect(page.getByRole('textbox', { name: /^月会費/ })).toHaveValue('8000');
  await expect(page.getByRole('textbox', { name: /^目的の活動を行った来館回数 S/ })).toHaveValue('6');
  await expect(page.getByRole('checkbox', { name: '専門設備', exact: true })).toBeChecked();
});

test('阻害要因を不要時に消し、付帯サービスの「特になし」を排他にする', async ({ page }) => {
  await page.goto('/check');
  await fillCore(page, {
    performed: '4',
    completed: '2',
    contentFit: '一部合っていた',
    evidence: 'ほぼ変わらない',
    continuation: '迷う',
    barrier: '混雑していた',
  });

  const none = page.getByRole('checkbox', { name: '特になし', exact: true });
  const classes = page.getByRole('checkbox', { name: 'クラス', exact: true });
  await expect(none).toBeChecked();
  await classes.check();
  await expect(classes).toBeChecked();
  await expect(none).not.toBeChecked();
  await none.check();
  await expect(none).toBeChecked();
  await expect(classes).not.toBeChecked();
  await page.getByRole('checkbox', { name: '専門設備', exact: true }).check();
  await expect(none).not.toBeChecked();

  await page.getByRole('textbox', { name: /^予定した主な内容を完了した回数 F/ }).fill('4');
  await page.getByRole('radio', { name: '合っていた', exact: true }).check();
  await page.getByRole('radio', { name: '良い方向', exact: true }).check();
  await page.getByRole('radio', { name: '選びたい', exact: true }).check();
  await expect(page.getByRole('group', { name: '利用・完了・満足を妨げた主な要因' })).toHaveCount(0);

  await page.getByRole('radio', { name: '一部合っていた', exact: true }).check();
  const barrier = page.getByRole('group', { name: '利用・完了・満足を妨げた主な要因' });
  await expect(barrier.getByRole('radio', { name: '混雑していた', exact: true })).not.toBeChecked();
  await page.getByRole('radio', { name: '合っていた', exact: true }).check();
  await submitAssessment(page);

  await expect(page.getByRole('heading', { name: '今のプランを継続候補にする' })).toBeVisible();
  await expect(page.getByText('専門設備', { exact: true })).toBeVisible();
  await expect(page.locator('.result-overview')).not.toContainText('混雑していた');
  await expectNoHorizontalOverflow(page);
});

test('安全上の懸念は阻害要因や料金より先に扱う', async ({ page }) => {
  await page.goto('/check');
  await fillCore(page, {
    performed: '4',
    completed: '2',
    contentFit: '合っていなかった',
    evidence: '望んだ方向と逆',
    continuation: '選ばない',
    safety: 'あった',
  });

  await expect(page.getByRole('group', { name: '利用・完了・満足を妨げた主な要因' })).toHaveCount(0);
  await expect(page.getByRole('alert')).toContainText('医療機関等へ確認');
  await submitAssessment(page);
  const overview = page.locator('.result-overview');
  await expect(overview.getByRole('heading', { name: '安全確認を優先する' })).toBeVisible();
  await expect(overview.locator('.decision-grid__action')).toContainText('運動を中止し、再開・増量の前に医療機関等へ確認する');
  await expect(overview.locator('.change-condition')).toContainText('安全上の懸念がないと確認でき');
  await expectNoHorizontalOverflow(page);
});

test('FがSを超える入力とSがVを超える入力を拒否し、先頭項目へ移動する', async ({ page }) => {
  await page.goto('/check');
  await fillCore(page, { visits: '4', performed: '3', completed: '4' });
  await submitAssessment(page);
  await expect(page.getByRole('alert')).toContainText('内容完了回数Fは、目的活動回数S以下');
  await expect(page.getByRole('textbox', { name: /^予定した主な内容を完了した回数 F/ })).toBeFocused();

  await page.getByRole('textbox', { name: /^予定した主な内容を完了した回数 F/ }).fill('3');
  await page.getByRole('textbox', { name: /^目的の活動を行った来館回数 S/ }).fill('5');
  await page.getByRole('group', { name: '利用・完了・満足を妨げた主な要因' })
    .getByRole('radio', { name: '特にない', exact: true }).check();
  await submitAssessment(page);
  await expect(page.getByRole('alert')).toContainText('目的活動回数Sは、来館回数の上限4回以下');
  await expect(page.getByRole('textbox', { name: /^目的の活動を行った来館回数 S/ })).toBeFocused();
  await expectNoHorizontalOverflow(page);
});

test('入力値をURL・外部通信・永続ストレージへ残さない', async ({ page, context }) => {
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.hostname !== '127.0.0.1') externalRequests.push(request.url());
  });

  await page.goto('/check');
  await fillCore(page);
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

test('キーボードだけでホームCTAと代表フォームを操作して結果へ進める', async ({ page }) => {
  await page.goto('/');
  const start = page.getByRole('link', { name: 'ジム会費を診断する' }).first();
  await tabTo(page, start);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/check$/);

  const monthlyFee = page.getByRole('textbox', { name: /^月会費/ });
  await tabTo(page, monthlyFee);
  await page.keyboard.type('8000');
  const noExtraFees = page.getByRole('radio', { name: '月会費以外はない', exact: true });
  await tabTo(page, noExtraFees);
  await page.keyboard.press('Space');
  await expect(noExtraFees).toBeChecked();

  const exactVisits = page.getByRole('group', { name: '最近の典型的な1か月の来館回数' })
    .getByRole('radio', { name: '回数が分かる', exact: true });
  await tabTo(page, exactVisits);
  await page.keyboard.press('Space');
  const visitCount = page.getByRole('textbox', { name: /^来館回数/ });
  await tabTo(page, visitCount);
  await page.keyboard.type('6');

  for (const control of [
    page.getByRole('radio', { name: '筋力を高める', exact: true }),
    page.getByRole('radio', { name: '筋力トレーニング', exact: true }),
  ]) {
    await tabTo(page, control);
    await page.keyboard.press('Space');
    await expect(control).toBeChecked();
  }

  const performedExact = page.getByRole('group', { name: '目的の活動を行った来館回数 S' })
    .getByRole('radio', { name: '回数が分かる', exact: true });
  await tabTo(page, performedExact);
  await page.keyboard.press('Space');
  const performedCount = page.getByRole('textbox', { name: /^目的の活動を行った来館回数 S/ });
  await tabTo(page, performedCount);
  await page.keyboard.type('6');

  const completedExact = page.getByRole('group', { name: '予定した主な内容を完了した回数 F' })
    .getByRole('radio', { name: '回数が分かる', exact: true });
  await tabTo(page, completedExact);
  await page.keyboard.press('Space');
  const completedCount = page.getByRole('textbox', { name: /^予定した主な内容を完了した回数 F/ });
  await tabTo(page, completedCount);
  await page.keyboard.type('6');

  for (const control of [
    page.getByRole('radio', { name: '合っていた', exact: true }),
    page.getByRole('radio', { name: '良い方向', exact: true }),
    page.getByRole('checkbox', { name: '特になし', exact: true }),
    page.getByRole('radio', { name: '選びたい', exact: true }),
    page.getByRole('radio', { name: 'なかった', exact: true }),
  ]) {
    await tabTo(page, control);
    await page.keyboard.press('Space');
    await expect(control).toBeChecked();
  }

  const submit = page.getByRole('button', { name: '診断結果を見る' });
  await tabTo(page, submit);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: '会費の活用状況', exact: true })).toBeFocused();
  await expect(page.getByRole('heading', { name: '今のプランを継続候補にする' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
