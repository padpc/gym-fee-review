export function HomePage() {
  return (
    <div className="home-page">
      <section className="shell home-intro" aria-labelledby="home-heading">
        <div className="home-intro__copy">
          <p className="eyebrow">約3〜5分・登録不要・保存なし</p>
          <h1 id="home-heading">回数だけでは見えない、あなたが残したい価値まで確認</h1>
          <p className="home-intro__lead">
            トレーニング、クラス、プール、風呂・サウナ、指導、交流、通いやすさ。
            実際に使ったものを振り返り、今の会費を払って続ける理由があるか整理します。
          </p>
        </div>

        <div className="home-summary" aria-labelledby="home-summary-heading">
          <h2 id="home-summary-heading">この診断で分かること</h2>
          <ul className="check-list check-list--compact">
            <li>実質月額と、分かる範囲の1回・1時間あたり料金</li>
            <li>期待どおり使えた、会費を払って残したい価値</li>
            <li>続ける・使い方を試す・費用を見直すための次の一行動</li>
          </ul>
        </div>

        <div className="home-intro__actions">
          <a className="button button--primary home-cta" href="/check">ジム会費を診断する</a>
          <p>利用回数が分からなくても診断できます。入力はブラウザ内だけで計算し、外部へ送りません。</p>
        </div>
      </section>

      <div className="shell home-content">
        <section className="home-panel" aria-labelledby="prepare-heading">
          <p className="eyebrow">始める前に</p>
          <h2 id="prepare-heading">準備するもの</h2>
          <ul className="plain-list">
            <li><strong>月会費と契約明細</strong><span>毎月必須の費用や年会費があれば、月額相当へまとめます。</span></li>
            <li><strong>最近1か月の来館</strong><span>正確な回数、だいたいの範囲、分からない、から選べます。</span></li>
            <li><strong>実際に使ったもの</strong><span>運動だけでなく、風呂・サウナ、交流、通いやすさも同じ価値として扱います。</span></li>
          </ul>
          <p className="home-panel__aside">レシートや細かな利用記録がなくても始められます。</p>
        </section>

        <section className="home-panel" aria-labelledby="result-heading-home">
          <p className="eyebrow">結果の見方</p>
          <h2 id="result-heading-home">「安いか」だけでなく「払う理由があるか」を分けて表示</h2>
          <div className="feature-grid">
            <article><h3>料金の事実</h3><p>実質月額と、入力できた場合だけ1回・館内利用1時間あたりを表示します。</p></article>
            <article><h3>残したい価値</h3><p>選んだ項目ごとに、利用頻度、期待どおりだったか、会費を払う理由かを確認します。</p></article>
            <article><h3>次の一行動</h3><p>価値、費用負担、継続意向を組み合わせ、最初に確認する一つを示します。</p></article>
          </div>
        </section>

        <section className="home-panel home-panel--notice" aria-labelledby="limits-heading">
          <p className="eyebrow">判断の限界</p>
          <h2 id="limits-heading">あなたの価値を、勝手な金額へ換算しません</h2>
          <p>長く滞在したほど高価値、特定の運動ほど高価値とは判定しません。不透明な総合点や全国一律の合格ラインも使わず、料金の事実と本人の価値判断を分けます。</p>
          <a className="text-link" href="/methodology">計算方法と判断の限界を見る</a>
        </section>

        <section className="home-panel faq" aria-labelledby="faq-heading">
          <p className="eyebrow">よくある質問</p>
          <h2 id="faq-heading">入力に迷った場合</h2>
          <details><summary>利用回数を覚えていません</summary><p>「分からない」を選べます。1・2・4・8・12回だった場合の参考単価を並べ、価値の結論は通常どおり表示します。</p></details>
          <details><summary>風呂やサウナだけの利用でも対象ですか</summary><p>対象です。風呂・サウナ・休憩も、会費を払って残したい価値かどうかをトレーニングと同じように確認します。</p></details>
          <details><summary>館内利用時間が長ければ、元を取れた判定になりますか</summary><p>なりません。時間は任意の料金表示だけに使い、価値の高さやトレーニングの質には加点しません。</p></details>
          <details><summary>年会費を月会費と分けるのはなぜですか</summary><p>請求の周期を取り違えないためです。結果では年会費の12分の1を加え、実質月額としてまとめます。</p></details>
        </section>
      </div>
    </div>
  );
}
