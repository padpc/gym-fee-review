import { Calculator } from '../features/calculator/Calculator';

export function CheckPage() {
  return (
    <div className="shell page-main check-page">
      <div className="page-intro page-intro--compact">
        <a className="back-link" href="/">ホームへ戻る</a>
        <p className="eyebrow">基本診断 約3〜5分・登録不要・保存なし</p>
        <h1>会費と使い方を診断</h1>
        <p>先月または典型的な1か月について、費用、来館、目的活動、内容完了、変化を順に入力します。代替プラン比較は任意です。</p>
      </div>

      <Calculator />

      <aside className="privacy-note" aria-labelledby="privacy-heading">
        <h2 id="privacy-heading">入力と判定について</h2>
        <p>入力は端末内だけで処理し、保存・送信しません。不透明な総合点、健康診断、契約変更の自動決定は行いません。</p>
        <a className="text-link" href="/methodology">計算方法を確認する</a>
      </aside>
    </div>
  );
}
