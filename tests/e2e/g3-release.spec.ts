import { expect, test } from '@playwright/test';

const productionOrigin = 'https://gym-fee-review.smallframe.workers.dev';

test('3ページが固有メタデータと通常リンクを持つ', async ({ page }) => {
  const expected = [
    ['/', 'ジム会費、元とれてる？｜料金・来館・利用価値から無料診断', `${productionOrigin}/`],
    ['/check', 'ジム会費が元を取れているか診断｜ジム会費、元とれてる？', `${productionOrigin}/check`],
    ['/methodology', 'ジム会費の計算方法と判断例｜ジム会費、元とれてる？', `${productionOrigin}/methodology`],
  ] as const;

  for (const [path, title, canonical] of expected) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(title);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', title);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', canonical);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', `${productionOrigin}/og-card.png`);
    const navigation = page.getByRole('navigation', { name: '主要ナビゲーション' });
    await expect(navigation.getByRole('link')).toHaveCount(3);
    await expect(navigation.getByRole('link', { name: 'ホーム' })).toHaveAttribute('href', '/');
    await expect(navigation.getByRole('link', { name: '診断する' })).toHaveAttribute('href', '/check');
    await expect(navigation.getByRole('link', { name: '計算方法' })).toHaveAttribute('href', '/methodology');
  }
});

test('robots・sitemap・OGP画像を配信し、不明パスを実404にする', async ({ page, request }) => {
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain(`Sitemap: ${productionOrigin}/sitemap.xml`);

  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  const sitemapBody = await sitemap.text();
  expect((sitemapBody.match(/<url>/g) ?? [])).toHaveLength(3);
  expect(sitemapBody).toContain(`<loc>${productionOrigin}/</loc>`);
  expect(sitemapBody).toContain(`<loc>${productionOrigin}/check</loc>`);
  expect(sitemapBody).toContain(`<loc>${productionOrigin}/methodology</loc>`);

  const ogCard = await request.get('/og-card.png');
  expect(ogCard.status()).toBe(200);
  expect(ogCard.headers()['content-type']).toContain('image/png');

  const notFound = await page.goto('/does-not-exist');
  expect(notFound?.status()).toBe(404);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await expect(page.getByRole('heading', { name: 'ページが見つかりません' })).toBeVisible();
});

test('公開候補のセキュリティヘッダーを返し、ローカル確認では計測しない', async ({ page }) => {
  const analyticsRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/event') analyticsRequests.push(request.url());
  });
  const response = await page.goto('/check');
  expect(response?.headers()['x-content-type-options']).toBe('nosniff');
  expect(response?.headers()['x-frame-options']).toBe('DENY');
  expect(response?.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  await expect(page.getByRole('heading', { name: '今の会費を払って続ける理由を確認' })).toBeVisible();
  expect(analyticsRequests).toEqual([]);
  await expect(page.getByRole('link', { name: /この診断への意見を送る/ })).toHaveCount(0);
});

test('320pxと200%拡大相当でも主要導線が横へはみ出さない', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  for (const path of ['/', '/check', '/methodology']) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    const navigation = page.getByRole('navigation', { name: '主要ナビゲーション' });
    await expect(navigation.getByRole('link')).toHaveCount(3);
    const boxes = await navigation.getByRole('link').evaluateAll((links) => links.map((link) => link.getBoundingClientRect()));
    for (const box of boxes) {
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(320);
    }
  }
});
