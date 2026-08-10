export function HomePage() {
  return (
    <div className="home-page">
      <section className="shell home-intro" aria-labelledby="home-heading">
        <div className="home-intro__copy">
          <p className="eyebrow">約3〜5分・登録不要・保存なし</p>
          <h1 id="home-heading">今のジム会費を、実際の使い方と変化で確認</h1>
          <p className="home-intro__lead">
            自分で上限を決めるのではなく、回数・時間・目的に使えた来館回数・実在する代替プランから計算します。
          </p>
        </div>

        <div className="home-summary" aria-labelledby="home-summary-heading">
          <h2 id="home-summary-heading">この診断で分かること</h2>
          <ul className="check-list check-list--compact">
            <li>1回・1時間・目的に使えた来館1回あたりの料金</li>
            <li>予定した利用に対する達成率</li>
            <li>別プランとの差額と、同額になる回数・料金</li>
          </ul>
        </div>

        <div className="home-intro__actions">
          <a className="button button--primary home-cta" href="/check">会費の活用状況を確認する</a>
          <p>入力はブラウザ内だけで計算し、外部へ送りません。</p>
        </div>
      </section>

      <div className="shell home-content">
        <section className="home-panel" aria-labelledby="prepare-heading">
          <p className="eyebrow">始める前に</p>
          <h2 id="prepare-heading">準備するもの</h2>
          <ul className="plain-list">
            <li><strong>月会費と契約明細</strong><span>毎月必要な費用・年会費が「ない／ある」を確認します。</span></li>
            <li><strong>だいたいの利用回数</strong><span>正確でなくても、範囲や「分からない」を選べます。</span></li>
            <li><strong>比較できる料金</strong><span>分かれば、同じ利用ができる公式プランを1件用意します。</span></li>
          </ul>
        </section>

        <section className="home-panel" aria-labelledby="result-heading-home">
          <p className="eyebrow">結果の見方</p>
          <h2 id="result-heading-home">得か損かだけで終わらせません</h2>
          <div className="feature-grid">
            <article>
              <h3>今の使い方を数値化</h3>
              <p>実質月額、実績単価、予定と実績の差を別々に示します。</p>
            </article>
            <article>
              <h3>実在する候補と比較</h3>
              <p>必要な設備・利用回数・時間帯を満たす候補だけを、同等の代替として扱います。</p>
            </article>
            <article>
              <h3>次に確認することを提示</h3>
              <p>あと何回か、会費がいくらなら同額か、失う条件は何かを示します。</p>
            </article>
          </div>
        </section>

        <section className="home-panel home-panel--notice" aria-labelledby="limits-heading">
          <p className="eyebrow">判断の限界</p>
          <h2 id="limits-heading">この診断が決めないこと</h2>
          <p>
            全国一律の「お得価格」、健康効果、継続・休会・退会を自動で決めません。料金と利用実績から、判断材料と確認候補を示します。
          </p>
          <a className="text-link" href="/methodology">計算方法と判断の限界を見る</a>
        </section>

        <section className="home-panel faq" aria-labelledby="faq-heading">
          <p className="eyebrow">よくある質問</p>
          <h2 id="faq-heading">入力に迷った場合</h2>
          <details>
            <summary>利用回数を覚えていません</summary>
            <p>回数の範囲または「分からない」を選べます。不明な値を勝手に平均回数へ置き換えません。</p>
          </details>
          <details>
            <summary>年会費を月会費と分けるのはなぜですか</summary>
            <p>請求の周期を取り違えないためです。結果では年会費の12分の1を加え、実質月額としてまとめます。</p>
          </details>
          <details>
            <summary>月会費以外の費用が分かりません</summary>
            <p>空欄を自動で0円にはしません。契約書や明細で必須費用の有無を確認してから診断します。</p>
          </details>
          <details>
            <summary>入会金や登録料も入力しますか</summary>
            <p>既に支払った費用は、今後の継続判断には混ぜません。これから発生する変更費用などは、行動候補の一時費用として別に確認します。</p>
          </details>
        </section>
      </div>
    </div>
  );
}
