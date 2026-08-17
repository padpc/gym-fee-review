import { Calculator } from '../features/calculator/Calculator';

export function CheckPage() {
  return (
    <div className="shell page-main check-page">
      <div className="page-intro page-intro--compact">
        <a className="back-link" href="/">ホームへ戻る</a>
        <p className="eyebrow">登録不要・保存なし</p>
        <h1>今の会費を払って続ける理由を確認</h1>
        <p>支払っている料金、最近の来館、会費を払う理由として重要だった利用と期待、家計への負担を順に確認します。</p>
      </div>

      <Calculator />
    </div>
  );
}
