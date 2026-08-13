import { Calculator } from '../features/calculator/Calculator';

export function CheckPage() {
  return (
    <div className="shell page-main check-page">
      <div className="page-intro page-intro--compact">
        <a className="back-link" href="/">ホームへ戻る</a>
        <p className="eyebrow">約3〜5分・登録不要・保存なし</p>
        <h1>今の会費を払って続ける理由を確認</h1>
        <p>最近の典型的な1か月について、料金、来館、実際に使った価値、継続意向を順に入力します。回数や館内利用時間が分からなくても診断できます。</p>
      </div>

      <Calculator />

      <aside className="privacy-note" aria-labelledby="privacy-heading">
        <h2 id="privacy-heading">入力と判定について</h2>
        <p>入力はこの端末のブラウザ内だけで処理し、保存・送信しません。健康状態、効果、休会・退会を判定せず、不透明な総合点も使いません。</p>
        <p>運動中に強い痛み、胸の痛み、めまい等がある場合は、この診断に関係なく運動を中止し、必要に応じて医療機関等へ確認してください。</p>
        <a className="text-link" href="/methodology">計算方法を確認する</a>
      </aside>
    </div>
  );
}
