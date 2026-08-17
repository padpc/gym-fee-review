export function HomePage() {
  return (
    <div className="home-page">
      <section className="shell home-intro" aria-labelledby="home-heading">
        <div className="home-intro__copy">
          <p className="eyebrow">登録不要・保存なし</p>
          <h1 id="home-heading">今の会費に、払い続ける理由があるか整理</h1>
          <p className="home-intro__lead">
            支払っている料金、通った回数、会費を払う理由として大きかった利用、その期待が満たされたかを照らし合わせます。
            回数だけでも、気分だけでも決めず、今の条件で続ける価値を具体的に確認できます。
          </p>
        </div>

        <div className="home-summary" aria-labelledby="home-summary-heading">
          <h2 id="home-summary-heading">この診断で見ること</h2>
          <ul className="check-list check-list--compact">
            <li>実際の支払いに近い月額と、来館1回あたりの料金</li>
            <li>運動や風呂・サウナなど、会費を払う理由になった利用</li>
            <li>期待どおり使えたかと、家計に対する会費の負担</li>
          </ul>
        </div>

        <div className="home-intro__actions">
          <a className="button button--primary home-cta" href="/check">ジム会費を診断する</a>
          <p>請求明細や来館記録があると、料金と利用単価をより正確に確認できます。来館回数はおおよその範囲でも入力できます。</p>
        </div>
      </section>

      <div className="shell home-content">
        <section className="home-panel home-panel--overview" aria-labelledby="overview-heading">
          <p className="eyebrow">診断の概要</p>
          <h2 id="overview-heading">料金・利用・期待・負担を、一つの結論へまとめます</h2>
          <div className="feature-grid">
            <article><h3>料金と利用</h3><p>基本月会費、毎月の追加費、年会費を分けて実質月額を計算し、来館回数と任意の館内利用時間で単価を確認します。</p></article>
            <article><h3>重要だった利用</h3><p>トレーニング、クラス、プール、風呂・温泉・サウナ、指導、交流、通いやすさなどから最大3件を確認します。</p></article>
            <article><h3>結論と診断後の確認</h3><p>料金だけを再掲せず、続ける根拠と見直す根拠を分け、次に何をいつ確認するか示します。</p></article>
          </div>
        </section>

        <section className="home-panel home-panel--prepare" aria-labelledby="prepare-heading">
          <p className="eyebrow">入力する内容</p>
          <h2 id="prepare-heading">料金明細と来館記録を確認してから始めると、より正確です</h2>
          <ul className="plain-list">
            <li><strong>料金</strong><span>基本月会費、毎月の必須オプション、年会費・更新料を請求明細や契約内容で確認します。</span></li>
            <li><strong>最近の利用</strong><span>来館履歴があれば正確な回数を、なければ思い出せる範囲を入力します。</span></li>
            <li><strong>大きかった価値</strong><span>会費を払う理由として重要だった利用と、期待どおり使えたかを振り返ります。</span></li>
          </ul>
          <p className="home-panel__aside">入力はこのブラウザ内だけで計算し、保存・送信しません。契約変更を自動で決めるものではありません。</p>
        </section>
      </div>
    </div>
  );
}
