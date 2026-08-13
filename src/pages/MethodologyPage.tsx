function Formula({ children }: { children: string }) {
  return <p className="formula"><code>{children}</code></p>;
}

export function MethodologyPage() {
  return (
    <article className="shell page-main methodology-page">
      <div className="page-intro">
        <a className="back-link" href="/">ホームへ戻る</a>
        <p className="eyebrow">判定をブラックボックスにしない</p>
        <h1>計算方法と判断の限界</h1>
        <p>料金の事実と本人が残したい価値を分け、回答が結論のどこに使われるかを説明します。</p>
      </div>

      <nav className="methodology-nav" aria-label="このページの目次">
        <a href="#monthly-cost">実質月額</a>
        <a href="#usage">来館と時間</a>
        <a href="#value">利用価値</a>
        <a href="#decision">結論の規則</a>
        <a href="#limits">限界</a>
      </nav>

      <section id="monthly-cost" aria-labelledby="monthly-cost-heading">
        <h2 id="monthly-cost-heading">実質月額 C</h2>
        <Formula>実質月額 C ＝ 月会費 ＋ 毎月必須の追加費用 ＋ 年会費等 ÷ 12</Formula>
        <p>
          月会費、毎月必要な費用、年会費は請求周期が違うため分けて入力し、結果で月額相当へまとめます。追加費用の空欄を自動で0円にせず、まず「月会費以外はない」または「追加費用・年会費がある」を明示します。既に支払った入会金や登録料は、今後の継続判断には含めません。
        </p>
      </section>

      <section id="usage" aria-labelledby="usage-heading">
        <h2 id="usage-heading">来館回数と館内利用時間</h2>
        <Formula>来館1回あたり ＝ C ÷ 来館回数</Formula>
        <Formula>館内利用1時間あたり ＝ C ÷ 月の館内利用時間</Formula>
        <p>来館回数は正確な回数、だいたいの範囲、分からない、から選べます。回数不明では平均値を作らず、1・2・4・8・12回だった場合の参考単価を並べます。</p>
        <p>館内利用時間には、着替え、トレーニング、クラス、プール、風呂・サウナ、休憩を含めます。入力は任意で、時間が長いほど質や価値が高いとは判定しません。</p>
      </section>

      <section id="value" aria-labelledby="value-heading">
        <h2 id="value-heading">複数の利用価値を、項目ごとに確認</h2>
        <p>トレーニング設備、スタジオ・プログラム、プール、風呂・サウナ・休憩、指導、友人・コミュニティ、立地・営業時間・通いやすさ、その他から、実際に使ったものを複数選べます。</p>
        <p>選んだ項目だけ、次の3点を確認します。</p>
        <ol>
          <li><strong>利用頻度</strong>：1回程度、複数回、多くの来館・日常で役立った、覚えていない</li>
          <li><strong>期待充足</strong>：期待どおり、一部期待どおり、期待未達、判断できない</li>
          <li><strong>会費を払う理由</strong>：理由になる、迷う、理由ではない</li>
        </ol>
        <p>利用項目へ独自の金額倍率を付けません。「理由になる」「迷う」と回答した項目を、残したい価値または確かめたい価値として結論へ使います。</p>
      </section>

      <section id="decision" aria-labelledby="decision-heading">
        <h2 id="decision-heading">結論を決める規則</h2>
        <p>次の上から順に確認し、最初に一致した一つを使います。</p>
        <ol>
          <li>利用済み価値がない：今月は利用できていません。続ける条件を確認しましょう。</li>
          <li>残したい価値があり、会費負担が「見直しが必要」：価値を残しながら費用を見直す段階です。</li>
          <li>残したい価値があり、継続意向が「選ばない」：残したい価値はありますが、今の条件での継続は見直し候補です。</li>
          <li>残したい価値の期待が未達または未確認：払う理由にしたい価値が、期待を満たすか確認が必要です。</li>
          <li>残したい価値があり、継続意向が「迷う」または会費が「少し負担」：価値はあります。迷いの原因と料金条件を確認しましょう。</li>
          <li>残したい価値があり、来月も選び、無理なく払える：あなたには、この会費を払って続ける理由があります。</li>
          <li>残したい価値がなく、会費負担あり、または来月は選ばない：今の契約は見直し候補です。</li>
          <li>会費を払う理由か迷う価値がある：1か月だけ、残したい価値が得られるか確かめましょう。</li>
          <li>その他：利用はしていますが、会費を払う理由はまだ見つかっていません。</li>
        </ol>
        <p>来館が少なくても、本人にとって強い価値があり無理なく払える場合は、回数だけを理由に否定しません。見直しが必要な回答のときだけ阻害要因を尋ね、次の一行動を具体化します。</p>
      </section>

      <section id="limits" aria-labelledby="limits-heading-methodology">
        <h2 id="limits-heading-methodology">この診断の限界</h2>
        <ul>
          <li>全国一律の「1回いくらなら得」という基準や、不透明な総合点を使いません。</li>
          <li>時間の長さや活動の種類だけで、価値やトレーニングの質を判定しません。</li>
          <li>交通費、移動時間、将来の健康効果は料金へ換算しません。</li>
          <li>体調や症状はジムの価値と分けるため入力項目に含めず、医療判断も行いません。</li>
          <li>契約変更、休会、退会を自動で決めません。最新の契約条件は契約先の公式情報で確認してください。</li>
        </ul>
      </section>

      <div className="methodology-actions">
        <a className="button button--primary" href="/check">ジム会費を診断する</a>
      </div>
    </article>
  );
}
