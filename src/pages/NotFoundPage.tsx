export function NotFoundPage() {
  return (
    <section className="shell page-main not-found-page" aria-labelledby="not-found-heading">
      <p className="eyebrow">404</p>
      <h1 id="not-found-heading">ページが見つかりません</h1>
      <p>URLを確認するか、ホームから診断を始めてください。</p>
      <a className="button button--primary" href="/">ホームへ戻る</a>
    </section>
  );
}
