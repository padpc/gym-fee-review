import { Calculator } from '../features/calculator/Calculator';

export function CheckPage() {
  return (
    <div className="shell page-main check-page">
      <div className="page-intro page-intro--compact">
        <a className="back-link" href="/">ホームへ戻る</a>
        <p className="eyebrow">約3〜5分・登録不要・保存なし</p>
        <h1>会費の活用状況を確認</h1>
        <p>今の費用、実際の利用、得たかった価値、比較できる料金を順に入力します。</p>
      </div>

      <Calculator />

      <aside className="privacy-note" aria-labelledby="privacy-heading">
        <h2 id="privacy-heading">入力と判定について</h2>
        <p>入力は端末内だけで処理し、保存・送信しません。健康効果や契約変更を自動で決めません。</p>
        <a className="text-link" href="/methodology">計算方法を確認する</a>
      </aside>
    </div>
  );
}
