function Formula({ children }: { children: string }) {
  return <p className="formula"><code>{children}</code></p>;
}

export function MethodologyPage() {
  return (
    <article className="shell page-main methodology-page">
      <div className="page-intro">
        <a className="back-link" href="/">ホームへ戻る</a>
        <p className="eyebrow">診断の仕組み</p>
        <h1>計算方法と判断の考え方</h1>
        <p>料金の事実と、会費を払う理由として重要だった利用を分けて確認し、最後に一つの結論へまとめます。</p>
      </div>

      <nav className="methodology-nav" aria-label="このページの目次">
        <a href="#monthly-cost">料金</a>
        <a href="#usage">来館と時間</a>
        <a href="#value">重要な利用</a>
        <a href="#decision">判断</a>
        <a href="#limits">限界</a>
      </nav>

      <section id="monthly-cost" aria-labelledby="monthly-cost-heading">
        <h2 id="monthly-cost-heading">実際の支払いに近い月額</h2>
        <Formula>実質月額 C ＝ 基本月会費 ＋ 毎月の必須追加費 ＋ 年会費等 ÷ 12</Formula>
        <p>基本月会費はプラン表示の月額だけを入力します。ロッカーなど毎月必須の費用と、年会費・更新料は別に入力し、二重に加えないようにします。入会金など一度だけ払う費用は、今後の継続判断には含めません。</p>
        <p>追加費用が分からない場合は、分かっている基本月会費・追加費用・年会費を合算した「入力済み料金の小計」を表示し、未確認の費用があることを結果に残します。</p>
      </section>

      <section id="usage" aria-labelledby="usage-heading">
        <h2 id="usage-heading">来館回数と館内利用時間</h2>
        <Formula>来館1回あたり ＝ C ÷ 来館回数</Formula>
        <Formula>館内利用1時間あたり ＝ C ÷ 月の館内利用時間</Formula>
        <p>来館は正確な回数、だいたいの範囲、分からない、から選べます。回数が分からない場合は決めつけた平均を使わず、代表的な回数ごとの参考額を示します。</p>
        <p>館内利用時間には着替え、運動、クラス、プール、風呂・温泉・サウナ、休憩を含めます。時間は任意の料金表示にだけ使い、長いほど価値が高いとは判定しません。</p>
      </section>

      <section id="value" aria-labelledby="value-heading">
        <h2 id="value-heading">会費を払う理由として重要だった利用</h2>
        <p>トレーニング設備・フリーウェイト、スタジオ・プログラム、プール、風呂・温泉・サウナ・休憩、指導、友人・コミュニティ、立地・営業時間・通いやすさ、その他から、最も重要な1件と追加2件まで選べます。「特にない」も選択できます。</p>
        <p>選んだ項目ごとに、期待どおり得られた、一部得られた、利用したが内容・質が期待以下だった、利用したかったがほぼ使えなかった、まだ判断できない、のいずれかを確認します。頻度や同じ意味の質問を項目ごとに重ねません。</p>
      </section>

      <section id="decision" aria-labelledby="decision-heading">
        <h2 id="decision-heading">結論に使う代表的な条件</h2>
        <ul>
          <li>重要な利用が期待を満たし、実質月額を無理なく払える場合は、続ける根拠があると判断します。</li>
          <li>利用価値は得られていても家計上の見直しが必要な場合は、価値を残しつつ料金条件を確認する提案にします。</li>
          <li>重要な利用が期待以下、ほぼ使えない、または未確認なら、その具体的な項目を見直す根拠にします。</li>
          <li>重要な利用が特にない場合や来館0回の場合は、今の契約条件を確認する提案を優先します。</li>
        </ul>
        <p>料金、利用、期待、負担を個別に再掲するだけではなく、どこがそろい、どこが食い違ったかを文章で示します。</p>
      </section>

      <section id="limits" aria-labelledby="limits-heading-methodology">
        <h2 id="limits-heading-methodology">この診断で決められないこと</h2>
        <p>全国一律の「得する金額」は置かず、活動の種類や時間を独自の金額へ換算しません。交通費、将来の健康効果、契約先ごとの休会・解約条件も判定しないため、契約を変える前に公式料金表・規約・契約書を確認してください。</p>
      </section>

      <div className="methodology-actions">
        <a className="button button--primary" href="/check">ジム会費を診断する</a>
      </div>
    </article>
  );
}
