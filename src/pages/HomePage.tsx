export function HomePage() {
  return (
    <div className="home-page">
      <section className="shell home-intro" aria-labelledby="home-heading">
        <div className="home-intro__copy">
          <p className="eyebrow">基本診断 約3〜5分・登録不要・保存なし</p>
          <h1 id="home-heading">会費を、通った回数だけでなく「できた活動」から確認</h1>
          <p className="home-intro__lead">
            来館、目的の活動、予定内容の完了、変化、実際に使ったサービスを分けて、今の使い方と次に変える一つを示します。
          </p>
        </div>

        <div className="home-summary" aria-labelledby="home-summary-heading">
          <h2 id="home-summary-heading">この診断で分かること</h2>
          <ul className="check-list check-list--compact">
            <li>来館・目的活動・内容完了それぞれの1回単価</li>
            <li>活動利用率、内容完了率、目的に沿う変化</li>
            <li>続け方・内容・通い方・料金のどこを見直すか</li>
          </ul>
        </div>

        <div className="home-intro__actions">
          <a className="button button--primary home-cta" href="/check">ジム会費を診断する</a>
          <p>入力はブラウザ内だけで計算し、外部へ送りません。</p>
        </div>
      </section>

      <div className="shell home-content">
        <section className="home-panel" aria-labelledby="prepare-heading">
          <p className="eyebrow">始める前に</p>
          <h2 id="prepare-heading">準備するもの</h2>
          <ul className="plain-list">
            <li><strong>月会費と契約明細</strong><span>毎月必要な費用・年会費が「ない／ある」を確認します。</span></li>
            <li><strong>最近1か月の使い方</strong><span>来館、目的の活動、予定内容を完了した回数。分からなくても診断できます。</span></li>
            <li><strong>行ったことと変化</strong><span>主な活動、使ったサービス、目的に沿う変化を振り返ります。</span></li>
          </ul>
          <p className="home-panel__aside">公式料金が分かる代替プランは任意です。なくても基本診断を完了できます。</p>
        </section>

        <section className="home-panel" aria-labelledby="result-heading-home">
          <p className="eyebrow">結果の見方</p>
          <h2 id="result-heading-home">得か損かだけで終わらせません</h2>
          <div className="feature-grid">
            <article>
              <h3>使い方</h3>
              <p>来館のうち目的活動を行えた割合と、始めた内容を完了できた割合を分けます。</p>
            </article>
            <article>
              <h3>料金</h3>
              <p>実質月額を、来館・目的活動・内容完了の回数でそれぞれ割って表示します。</p>
            </article>
            <article>
              <h3>次の一つ</h3>
              <p>内容、通い方、契約、料金比較のうち、最初に確認する一つを理由とともに示します。</p>
            </article>
          </div>
        </section>

        <section className="home-panel home-panel--notice" aria-labelledby="limits-heading">
          <p className="eyebrow">判断の限界</p>
          <h2 id="limits-heading">この診断が決めないこと</h2>
          <p>
            活動の種類へ独自の金額倍率を付けたり、不透明な総合点を出したりしません。健康効果、継続・休会・退会も自動で決めません。
          </p>
          <a className="text-link" href="/methodology">計算方法と判断の限界を見る</a>
        </section>

        <section className="home-panel faq" aria-labelledby="faq-heading">
          <p className="eyebrow">よくある質問</p>
          <h2 id="faq-heading">入力に迷った場合</h2>
          <details>
            <summary>利用回数を覚えていません</summary>
            <p>来館回数は範囲または「分からない」を選べます。目的活動や内容完了だけ分かる場合は、その回数だけで表示できる単価を計算します。</p>
          </details>
          <details>
            <summary>トレーニングの質を点数にしますか</summary>
            <p>総合点にはしません。内容を完了できたか、活動に合う強度・難易度だったか、目的に沿う変化があったかを別々に示します。</p>
          </details>
          <details>
            <summary>年会費を月会費と分けるのはなぜですか</summary>
            <p>請求の周期を取り違えないためです。結果では年会費の12分の1を加え、実質月額としてまとめます。</p>
          </details>
          <details>
            <summary>代替プランが分かりません</summary>
            <p>入力しなくても基本診断を完了できます。その場合は得・損を断定せず、分かるときだけ現在会費と同額になる目的活動1回料金を示します。</p>
          </details>
        </section>
      </div>
    </div>
  );
}
