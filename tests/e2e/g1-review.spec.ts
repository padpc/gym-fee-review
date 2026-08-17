import { expect, test, type Locator, type Page } from '@playwright/test';

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

async function chooseNoExtraFees(page: Page) {
  await page.getByRole('group', { name: '毎月必須の追加費用' }).getByRole('radio', { name: 'なし', exact: true }).check();
  await page.getByRole('group', { name: '年会費・更新料など' }).getByRole('radio', { name: 'なし', exact: true }).check();
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

const fulfilledStatusByValue: Record<string, string> = {
  'トレーニング設備・フリーウェイト': '期待どおり使えた',
  'スタジオ・プログラム': '期待どおり参加できた',
  'プール・水中運動': '期待どおり利用できた',
  '風呂・温泉・サウナ・休憩': '期待どおり利用できた',
  '指導・フォーム確認': '必要な指導・確認を受けられた',
  '友人・コミュニティ': '期待していた交流ができた',
  '立地・営業時間・通いやすさ': '生活に合い、無理なく通えた',
  'その他': '期待どおりだった',
};

async function selectPrimary(page: Page, label: string, status = fulfilledStatusByValue[label]) {
  if (!status) throw new Error(`fulfilled status is not defined for ${label}`);
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
  const headerNavigation = page.getByRole('navigation', { name: '主要ナビゲーション' });
  await expect(headerNavigation.getByRole('link', { name: 'ホーム' })).toHaveAttribute('aria-current', 'page');
  await expect(headerNavigation.getByRole('link', { name: '診断する' })).toBeVisible();
  await expect(headerNavigation.getByRole('link', { name: '計算方法' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '今の会費に、払い続ける理由があるか整理' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '料金・利用・期待・負担を、一つの結論へまとめます' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '料金明細と来館記録を確認してから始めると、より正確です' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '結論と診断後の確認' })).toBeVisible();
  await expect(page.getByText('細かな記録がなくても始められます')).toHaveCount(0);
  await expect(page.getByText('4問')).toHaveCount(0);
  await expect(page.getByText('最近1か月の4つだけ')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'よくある質問' })).toHaveCount(0);
  await expect(page.locator('form')).toHaveCount(0);
  await expect(page.getByText('この診断は、入力した内容を整理するための目安です。継続・休会・変更・退会の最終判断はご自身で行ってください。')).toBeVisible();
  await expect(page.getByText('契約を変える前に、契約先の最新料金と条件を公式情報で確認してください。')).toHaveCount(0);
  await expect(page.getByText('入力は保存・送信しません。活動や時間を勝手な金額へ換算せず、不透明な総合点を出しません。')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await page.getByRole('link', { name: 'ジム会費を診断する' }).first().click();
  await expect(page).toHaveURL(/\/check$/);
  await expect(page.getByRole('navigation', { name: '主要ナビゲーション' }).getByRole('link', { name: '診断する' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('textbox', { name: /^基本月会費/ })).toBeVisible();
  await expect(page.getByRole('group', { name: '毎月必須の追加費用' })).toBeVisible();
  await expect(page.getByRole('group', { name: '年会費・更新料など' })).toBeVisible();
  await expect(page.getByText(/強い痛み|胸の痛み|めまい/)).toHaveCount(0);

  await page.goto('/methodology');
  await expect(page.getByRole('heading', { name: '計算方法と判断の考え方' })).toBeVisible();
  await expect(page.getByText(/実質月額 C ＝ 基本月会費/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'どういうときに続ける根拠があるか' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '3つの料金を月額へそろえる' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'ジム会費を診断する' })).toHaveCount(0);
  await expect(page.getByText(/規則1|規則2|適用した規則/)).toHaveCount(0);

  await page.goto('/not-a-page');
  await expect(page.getByRole('heading', { name: 'ページが見つかりません' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('主要導線の立体状態、ファビコン、補助フッターを見分けられる', async ({ page, request }) => {
  await page.goto('/');

  const brand = page.getByRole('link', { name: 'ジム会費、元とれてる？' });
  await expect(brand.locator('.site-name__mark')).toHaveAttribute('aria-hidden', 'true');
  await expect(brand.locator('.site-name__mark')).toHaveAttribute('src', '/favicon.svg');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg');
  const faviconResponse = await request.get('/favicon.svg');
  expect(faviconResponse.ok()).toBe(true);
  expect(faviconResponse.headers()['content-type']).toContain('image/svg+xml');
  const faviconSvg = await faviconResponse.text();
  expect(faviconSvg).toContain('<title id="favicon-title">ジム会費チェッカー</title>');
  expect(faviconSvg).toContain('id="dumbbell"');
  expect(faviconSvg).toContain('id="check-badge"');
  expect(faviconSvg).not.toContain('aria-label="円"');
  const navigation = page.getByRole('navigation', { name: '主要ナビゲーション' });
  const links = navigation.getByRole('link');
  await expect(links).toHaveCount(3);

  const linkBoxes = await Promise.all([0, 1, 2].map((index) => links.nth(index).boundingBox()));
  for (const box of linkBoxes) {
    expect(box).not.toBeNull();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }

  const linkStyles = await links.evaluateAll((elements) => elements.map((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      boxShadow: style.boxShadow,
      color: style.color,
      textDecorationLine: style.textDecorationLine,
    };
  }));
  for (const style of linkStyles) expect(style.textDecorationLine).toBe('none');
  expect(linkStyles[0].backgroundColor).not.toBe(linkStyles[1].backgroundColor);
  expect(linkStyles[0].backgroundImage).not.toBe('none');
  expect(linkStyles[0].boxShadow).not.toBe('none');
  expect(linkStyles[0].color).not.toBe(linkStyles[1].color);

  const viewport = page.viewportSize();
  if (viewport && viewport.width <= 480) {
    const widths = linkBoxes.map((box) => box?.width ?? 0);
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(2);
  }

  const summaryStyle = await page.locator('.home-summary').evaluate((element) => {
    const style = getComputedStyle(element);
    return { borderWidth: style.borderTopWidth, backgroundImage: style.backgroundImage };
  });
  expect(summaryStyle.borderWidth).toBe('0px');
  expect(summaryStyle.backgroundImage).not.toBe('none');

  const panelStyles = await page.locator('.home-panel').evaluateAll((elements) => elements.map((element) => {
    const style = getComputedStyle(element);
    return { borderWidth: style.borderTopWidth, backgroundImage: style.backgroundImage, boxShadow: style.boxShadow };
  }));
  expect(panelStyles).toHaveLength(2);
  for (const style of panelStyles) {
    expect(style.borderWidth).toBe('0px');
    expect(style.boxShadow).not.toBe('none');
  }
  expect(panelStyles[0].backgroundImage).not.toBe(panelStyles[1].backgroundImage);

  const footerHome = page.getByRole('navigation', { name: 'フッターナビゲーション' }).getByRole('link', { name: 'ホーム' });
  const footerStyle = await footerHome.evaluate((element) => {
    const style = getComputedStyle(element);
    return { backgroundColor: style.backgroundColor, borderRadius: style.borderRadius, color: style.color };
  });
  expect(footerStyle.backgroundColor).toBe('rgba(0, 0, 0, 0)');
  expect(footerStyle.borderRadius).toBe('0px');
  expect(footerStyle.color).not.toBe(linkStyles[0].color);

  const diagnoseLink = navigation.getByRole('link', { name: '診断する' });
  const idleStyle = await diagnoseLink.evaluate((element) => {
    const style = getComputedStyle(element);
    return { backgroundColor: style.backgroundColor, boxShadow: style.boxShadow, transform: style.transform };
  });
  await diagnoseLink.hover();
  await page.waitForTimeout(180);
  const hoverStyle = await diagnoseLink.evaluate((element) => {
    const style = getComputedStyle(element);
    return { backgroundColor: style.backgroundColor, boxShadow: style.boxShadow, transform: style.transform };
  });
  expect(hoverStyle.backgroundColor).not.toBe(idleStyle.backgroundColor);
  expect(hoverStyle.boxShadow).not.toBe(idleStyle.boxShadow);
  expect(hoverStyle.transform).not.toBe(idleStyle.transform);
  await page.mouse.down();
  await page.waitForTimeout(80);
  const pressedTransform = await diagnoseLink.evaluate((element) => getComputedStyle(element).transform);
  expect(pressedTransform).not.toBe(hoverStyle.transform);
  await page.mouse.up();

  await tabTo(page, diagnoseLink);
  expect(await diagnoseLink.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe('none');

  await page.goto('/methodology');
  const methodIndexLink = page.getByRole('navigation', { name: 'このページの目次' }).getByRole('link', { name: '料金の計算' });
  expect(await methodIndexLink.evaluate((element) => getComputedStyle(element).textDecorationLine)).toBe('none');
  await expectNoHorizontalOverflow(page);
});

test('計算方法をページ内目次と具体的な計算・判断例で理解できる', async ({ page }) => {
  await page.goto('/methodology');

  const pageIndex = page.getByRole('navigation', { name: 'このページの目次' });
  await expect(pageIndex.getByText('ページ内目次')).toBeVisible();
  const indexLinks = pageIndex.getByRole('link');
  await expect(indexLinks).toHaveCount(5);
  for (const link of await indexLinks.all()) {
    const box = await link.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    const style = await link.evaluate((element) => {
      const computed = getComputedStyle(element);
      return { backgroundColor: computed.backgroundColor, borderRadius: computed.borderRadius };
    });
    expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(Number.parseFloat(style.borderRadius)).toBeLessThanOrEqual(4);
  }

  const monthlyExample = page.locator('.calculation-example');
  await expect(monthlyExample.getByRole('heading', { name: '3つの料金を月額へそろえる' })).toBeVisible();
  await expect(monthlyExample).toContainText('8,000円');
  await expect(monthlyExample).toContainText('500円');
  await expect(monthlyExample).toContainText('6,000円');
  await expect(monthlyExample).toContainText('9,000円');

  const usageMetrics = page.locator('.usage-metrics article');
  await expect(usageMetrics).toHaveCount(3);
  await expect(usageMetrics.nth(0)).toContainText('1,125円');
  await expect(usageMetrics.nth(1)).toContainText('12時間');
  await expect(usageMetrics.nth(2)).toContainText('750円');

  const comparison = page.locator('.decision-comparison');
  await expect(comparison.getByRole('heading', { name: '今の会費を続ける根拠があります' })).toBeVisible();
  await expect(comparison.getByRole('heading', { name: '今の会費は見直し候補です' })).toBeVisible();
  await expect(comparison).toContainText('月8回来館');
  await expect(comparison).toContainText('最近1か月は来館0回');
  await expect(page.locator('.outcome-guide__item')).toHaveCount(4);
  await expect(page.getByText('全国一律の「月○回なら得」や、独自の総合点は設けていません。')).toBeVisible();

  const decisionLink = pageIndex.getByRole('link', { name: '結論の分かれ方' });
  await decisionLink.click();
  await expect(page).toHaveURL(/\/methodology#decision$/);
  await expect(page.getByRole('heading', { name: 'どういうときに続ける根拠があるか' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('重要な利用の選択肢をコンパクトに保ち、質問と回答を選択内容に合わせて切り替える', async ({ page }) => {
  await page.goto('/check');
  const primary = page.getByRole('group', { name: '最も重要だったものを1つ選んでください' });
  await expect(page.getByText('会費を払う主な理由になる利用がなかった')).toHaveCount(0);

  const viewport = page.viewportSize();
  if (viewport && viewport.width >= 700) {
    const thirdRowCards = await Promise.all([
      primary.getByRole('radio', { name: '立地・営業時間・通いやすさ' }),
      primary.getByRole('radio', { name: 'その他' }),
      primary.getByRole('radio', { name: '特にない' }),
    ].map((radio) => radio.locator('xpath=ancestor::label[1]').boundingBox()));
    const heights = thirdRowCards.map((box) => box?.height ?? 0);
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(2);
  }

  await primary.getByRole('radio', { name: 'スタジオ・プログラム' }).check();
  const studio = page.getByRole('group', { name: 'スタジオ・プログラムは、期待どおり参加できましたか' });
  for (const label of [
    '期待どおり参加できた',
    '一部のプログラム・日時だけ参加できた',
    '参加できたが、内容や進め方が期待以下だった',
    '参加したかったが、ほとんど参加できなかった',
    'まだ判断できない',
  ]) await expect(studio.getByRole('radio', { name: label })).toBeVisible();
  await expect(page.getByText('期待どおり得られた')).toHaveCount(0);

  await primary.getByRole('radio', { name: '立地・営業時間・通いやすさ' }).check();
  const convenience = page.getByRole('group', { name: '立地・営業時間・通いやすさは、実際の生活に合っていましたか' });
  await expect(convenience.getByRole('radio', { name: '生活に合い、無理なく通えた' })).toBeVisible();
  await expect(convenience.getByRole('radio', { name: '生活に合わず、ほとんど通えなかった' })).toBeVisible();
  await expect(studio).toHaveCount(0);
  await expect(page.getByRole('radio', { name: '期待どおり参加できた' })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test('料金総額、複数の重要な利用、温浴、質の未達、館内時間を統合して表示する', async ({ page }) => {
  await page.goto('/check');
  await page.getByRole('textbox', { name: /^基本月会費/ }).fill('8000');
  const monthly = page.getByRole('group', { name: '毎月必須の追加費用' });
  await monthly.getByRole('radio', { name: 'あり', exact: true }).check();
  await page.getByRole('textbox', { name: /^毎月必須の追加費用/ }).fill('300');
  const annual = page.getByRole('group', { name: '年会費・更新料など' });
  await annual.getByRole('radio', { name: 'あり', exact: true }).check();
  await page.getByRole('textbox', { name: /^年会費・更新料など/ }).fill('3600');
  await page.getByRole('radio', { name: '回数が分かる' }).check();
  await page.getByRole('textbox', { name: /^来館回数/ }).fill('4');
  await page.getByRole('radio', { name: '月の合計時間' }).check();
  await page.getByRole('textbox', { name: /^月の合計館内利用時間/ }).fill('6');
  await selectPrimary(page, 'トレーニング設備・フリーウェイト');
  await selectSecondary(page, '風呂・温泉・サウナ・休憩', '利用できたが、混雑・清潔さ・設備が期待以下だった');
  await selectSecondary(page, 'プール・水中運動', '一部の時間・内容だけ利用できた');

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
  expect(order.indexOf('実質月額 8,600円')).toBeLessThan(order.indexOf('次の確認日をカレンダーへ入れる'));
  await expect(page.getByText('診断後の確認')).toBeVisible();
  await expect(page.getByRole('heading', { name: '次の確認日をカレンダーへ入れる' }).locator('..')).toContainText('契約更新日の1か月前');
  await expect(page.getByText('最初にすることを一つに絞る')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '次の一行動' })).toHaveCount(0);
  await expect(page.getByText(/適用した規則/)).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test('最重要項目を選び直しても補助を自動選択せず、明示選択数だけで上限を制御する', async ({ page }) => {
  await page.goto('/check');
  const primary = page.getByRole('group', { name: '最も重要だったものを1つ選んでください' });

  await primary.getByRole('radio', { name: 'トレーニング設備・フリーウェイト' }).check();
  await page.keyboard.press('ArrowRight');
  await expect(primary.getByRole('radio', { name: 'スタジオ・プログラム' })).toBeChecked();
  await expect(page.getByText('追加で選択中：0／2件')).toBeVisible();
  for (let index = 0; index < await page.getByRole('checkbox').count(); index += 1) {
    await expect(page.getByRole('checkbox').nth(index)).not.toBeChecked();
    await expect(page.getByRole('checkbox').nth(index)).toBeEnabled();
  }

  await page.keyboard.press('ArrowRight');
  await expect(primary.getByRole('radio', { name: 'プール・水中運動' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'トレーニング設備・フリーウェイト' })).not.toBeChecked();
  for (let index = 0; index < await page.getByRole('checkbox').count(); index += 1) {
    await expect(page.getByRole('checkbox').nth(index)).not.toBeChecked();
    await expect(page.getByRole('checkbox').nth(index)).toBeEnabled();
  }

  await page.getByRole('checkbox', { name: '風呂・温泉・サウナ・休憩' }).check();
  await page.getByRole('checkbox', { name: '指導・フォーム確認' }).check();
  await expect(page.getByText('追加で選択中：2／2件')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: '友人・コミュニティ' })).toBeDisabled();

  await primary.getByRole('radio', { name: '風呂・温泉・サウナ・休憩' }).check();
  await expect(page.getByText('追加で選択中：1／2件')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: '指導・フォーム確認' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'トレーニング設備・フリーウェイト' })).not.toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'プール・水中運動' })).not.toBeChecked();
  for (let index = 0; index < await page.getByRole('checkbox').count(); index += 1) {
    await expect(page.getByRole('checkbox').nth(index)).toBeEnabled();
  }
});

test('範囲来館と主価値の一部充足から、あと1か月の確認を提案する', async ({ page }) => {
  await page.goto('/check');
  await page.getByRole('textbox', { name: /^基本月会費/ }).fill('8000');
  await chooseNoExtraFees(page);
  const visits = page.getByRole('group', { name: '最近の1か月の来館回数' });
  await visits.getByRole('radio', { name: 'だいたい分かる' }).check();
  await page.getByRole('group', { name: 'だいたいの来館回数' }).getByRole('radio', { name: '週1回前後（月4～6回）' }).check();
  await selectPrimary(page, 'トレーニング設備・フリーウェイト', '一部の設備・時間帯だけ使えた');
  await page.getByRole('radio', { name: '無理なく払える' }).check();
  await page.getByRole('button', { name: '診断結果を見る' }).click();

  await expect(page.getByRole('heading', { name: 'あと1か月だけ、重要な利用を確認しましょう' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '結論を支える根拠' }).locator('..')).toContainText('トレーニング設備・フリーウェイト');
  await expect(page.getByRole('heading', { name: '結論を支える根拠' }).locator('..')).toContainText('一部の設備・時間帯だけ使えたため、会費を支える材料がある');
  await expect(page.getByRole('heading', { name: '見直す根拠' }).locator('..')).toContainText('トレーニング設備・フリーウェイト');
  await expect(page.getByRole('heading', { name: '見直す根拠' }).locator('..')).toContainText('一部の設備・時間帯だけ使えたが、満たしていない点が残る');
  await expect(page.getByRole('heading', { name: '一番大事な利用を1か月記録する' }).locator('..')).toContainText('スマホのカレンダー');
  await expect(page.getByRole('heading', { name: '来館1回あたり' }).locator('..')).toContainText('1,333円〜2,000円');
  await expectNoHorizontalOverflow(page);
});

test('追加料金の有無と金額が揃ってから実質月額を示し、回数不明では参考額を示す', async ({ page }) => {
  await page.goto('/check');
  await page.getByRole('textbox', { name: /^基本月会費/ }).fill('8000');
  const monthly = page.getByRole('group', { name: '毎月必須の追加費用' });
  const annual = page.getByRole('group', { name: '年会費・更新料など' });
  await expect(monthly.getByRole('radio')).toHaveCount(2);
  await expect(annual.getByRole('radio')).toHaveCount(2);
  await monthly.getByRole('radio', { name: 'あり', exact: true }).check();
  await annual.getByRole('radio', { name: 'あり', exact: true }).check();
  await expect(page.getByText('実質月額はまだ計算できません').locator('..')).toContainText('毎月必須の追加費用の金額');
  await expect(page.getByText('実質月額はまだ計算できません').locator('..')).toContainText('年会費・更新料などの金額');
  await expect(page.getByText('計算済みの実質月額')).toHaveCount(0);
  await page.getByRole('textbox', { name: /^毎月必須の追加費用/ }).fill('300');
  const annualInput = page.getByRole('textbox', { name: /^年会費・更新料など/ });
  await page.getByRole('button', { name: '診断結果を見る' }).click();
  await expect(page.getByRole('alert')).toContainText('年会費等を入力してください');
  await expect(annualInput).toBeFocused();
  await annualInput.fill('1200');
  await expect(page.getByText('計算済みの実質月額').locator('..')).toContainText('8,400円');
  await page.getByRole('group', { name: '最近の1か月の来館回数' }).getByRole('radio', { name: '分からない' }).check();
  await page.getByRole('radio', { name: '1回の平均時間' }).check();
  await page.getByRole('textbox', { name: /^1回の平均館内利用時間/ }).fill('90');
  await selectPrimary(page, '立地・営業時間・通いやすさ');
  await page.getByRole('radio', { name: '無理なく払える' }).check();
  await page.getByRole('button', { name: '診断結果を見る' }).click();

  await expect(page.getByRole('heading', { name: '今の会費を続ける根拠があります' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '実質月額 8,400円' })).toBeVisible();
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
  const customLabel = page.getByRole('textbox', { name: '具体的な利用' });
  await expect(customLabel).toBeFocused();
  const statusGroup = page.getByRole('group', { name: 'その他の利用は、期待どおりでしたか' });
  await expect(statusGroup).toHaveAttribute('aria-invalid', 'true');

  const unsafeText = '<img src=x onerror=alert(1)>';
  await customLabel.fill(unsafeText);
  const namedStatusGroup = page.getByRole('group', { name: `「${unsafeText}」は、期待どおりでしたか` });
  await expect(namedStatusGroup.getByRole('radio', { name: '期待どおりだった', exact: true })).toBeVisible();
  await expect(page.locator('img.site-name__mark')).toHaveCount(1);
  await expect(page.locator('img:not(.site-name__mark)')).toHaveCount(0);
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
