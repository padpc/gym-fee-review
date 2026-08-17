function Formula({ children }: { children: string }) {
  return <p className="formula"><code>{children}</code></p>;
}

const methodologySections = [
  { id: 'monthly-cost', number: '01', label: '料金の計算' },
  { id: 'usage', number: '02', label: '来館と時間' },
  { id: 'value', number: '03', label: '重要な利用' },
  { id: 'decision', number: '04', label: '結論の分かれ方' },
  { id: 'limits', number: '05', label: '診断の限界' },
] as const;

function SectionHeading({
  number,
  label,
  title,
  headingId,
}: {
  number: string;
  label: string;
  title: string;
  headingId: string;
}) {
  return (
    <header className="methodology-section__header">
      <span className="methodology-section__number" aria-hidden="true">{number}</span>
      <div>
        <p className="methodology-section__label">{label}</p>
        <h2 id={headingId}>{title}</h2>
      </div>
    </header>
  );
}

export function MethodologyPage() {
  return (
    <article className="shell page-main methodology-page">
      <div className="page-intro">
        <a className="back-link" href="/">ホームへ戻る</a>
        <p className="eyebrow">診断の仕組み</p>
        <h1>計算方法と判断の考え方</h1>
        <p>実際の金額例と、同じ会費でも結論が変わる例から、この診断が何を見ているか確認できます。</p>
      </div>

      <nav className="methodology-toc" aria-label="このページの目次">
        <p className="methodology-toc__title">ページ内目次</p>
        <ol>
          {methodologySections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`}>
                <span className="methodology-toc__number" aria-hidden="true">{section.number}</span>
                <span>{section.label}</span>
                <span className="methodology-toc__arrow" aria-hidden="true">↓</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <section id="monthly-cost" aria-labelledby="monthly-cost-heading">
        <SectionHeading
          number="01"
          label="料金の計算"
          title="実際の支払いに近い月額"
          headingId="monthly-cost-heading"
        />
        <Formula>実質月額 C ＝ 基本月会費 ＋ 毎月の必須追加費 ＋ 年会費等 ÷ 12</Formula>

        <div className="calculation-example" aria-labelledby="monthly-example-heading">
          <div className="calculation-example__heading">
            <p className="example-badge">計算例</p>
            <h3 id="monthly-example-heading">3つの料金を月額へそろえる</h3>
          </div>
          <dl className="calculation-inputs">
            <div>
              <dt>基本月会費</dt>
              <dd>8,000円</dd>
            </div>
            <div>
              <dt>毎月の必須費</dt>
              <dd>500円</dd>
            </div>
            <div>
              <dt>年会費</dt>
              <dd>6,000円</dd>
            </div>
          </dl>
          <div className="calculation-equation" aria-label="8,000円 足す 500円 足す 6,000円 割る 12 は 9,000円">
            <span>8,000円</span>
            <b aria-hidden="true">＋</b>
            <span>500円</span>
            <b aria-hidden="true">＋</b>
            <span>6,000円 ÷ 12</span>
            <b aria-hidden="true">＝</b>
            <strong>9,000円</strong>
          </div>
          <p className="calculation-example__note">入会金など一度だけ払う費用は、今後の継続判断には含めません。</p>
        </div>

        <ul className="methodology-points">
          <li>プラン表示の月額、毎月必須の費用、年会費等を分けるため、二重に足しません。</li>
          <li>毎月必須費と年会費等は「なし／あり」を選び、「あり」の金額がそろってから実質月額を確定します。</li>
        </ul>
      </section>

      <section id="usage" aria-labelledby="usage-heading">
        <SectionHeading
          number="02"
          label="来館と時間"
          title="9,000円を利用量で見ると"
          headingId="usage-heading"
        />
        <p className="methodology-section__lead">上の例で月8回、1回平均90分滞在した場合です。</p>
        <div className="usage-metrics">
          <article>
            <p className="usage-metrics__label">来館1回あたり</p>
            <Formula>9,000円 ÷ 8回</Formula>
            <strong>1,125円</strong>
            <span>／回</span>
          </article>
          <article>
            <p className="usage-metrics__label">月の館内利用時間</p>
            <Formula>90分 × 8回</Formula>
            <strong>12時間</strong>
            <span>／月</span>
          </article>
          <article>
            <p className="usage-metrics__label">館内利用1時間あたり</p>
            <Formula>9,000円 ÷ 12時間</Formula>
            <strong>750円</strong>
            <span>／時間</span>
          </article>
        </div>
        <div className="methodology-note">
          <strong>時間は料金の見え方だけに使います</strong>
          <p>着替え、運動、クラス、プール、風呂・サウナ、休憩を含められますが、長く滞在しただけで価値が高いとは判定しません。</p>
        </div>
        <p>来館回数は正確な値、だいたいの範囲、不明から選べます。不明の場合は平均を決めつけず、1・2・4・8・12回ならいくらかを参考表示します。</p>
      </section>

      <section id="value" aria-labelledby="value-heading">
        <SectionHeading
          number="03"
          label="重要な利用"
          title="金額だけでは見えない利用価値"
          headingId="value-heading"
        />
        <ol className="methodology-steps">
          <li>
            <span aria-hidden="true">1</span>
            <div>
              <h3>一番大事な利用を選ぶ</h3>
              <p>トレーニング、スタジオ、プール、入浴・サウナ、指導、交流、通いやすさ等から1件を選びます。追加は2件までです。</p>
            </div>
          </li>
          <li>
            <span aria-hidden="true">2</span>
            <div>
              <h3>その利用に合う言葉で答える</h3>
              <p>スタジオなら「参加できた」、通いやすさなら「生活に合った」のように、期待どおり、一部、質が期待以下、使えず、不明を分けます。</p>
            </div>
          </li>
          <li>
            <span aria-hidden="true">3</span>
            <div>
              <h3>支える根拠と見直す根拠へ分ける</h3>
              <p>一番大事な利用の状態を優先しつつ、追加で選んだ利用の良い点と不足も結果から消しません。</p>
            </div>
          </li>
        </ol>
      </section>

      <section id="decision" aria-labelledby="decision-heading">
        <SectionHeading
          number="04"
          label="結論の分かれ方"
          title="どういうときに続ける根拠があるか"
          headingId="decision-heading"
        />
        <div className="methodology-principle">
          <p className="example-badge">判断の前提</p>
          <h3>「元が取れた」を金額だけでは決めません</h3>
          <p>実質月額と利用単価は事実として示し、一番大事な利用が期待に合ったか、会費を無理なく払えるか、来館できたかを合わせて結論にします。</p>
        </div>

        <h3 className="methodology-subheading">同じ実質月額9,000円でも結論は変わります</h3>
        <div className="decision-comparison">
          <article className="decision-example decision-example--keep">
            <p className="decision-example__case">例 A</p>
            <ul>
              <li>月8回来館</li>
              <li>一番大事なトレーニング設備を期待どおり使えた</li>
              <li>会費は無理なく払える</li>
            </ul>
            <p className="decision-example__arrow" aria-hidden="true">↓</p>
            <h4>今の会費を続ける根拠があります</h4>
            <p>次の確認日を決め、同じ状態が続くか見直します。</p>
          </article>
          <article className="decision-example decision-example--review">
            <p className="decision-example__case">例 B</p>
            <ul>
              <li>最近1か月は来館0回</li>
              <li>1回あたり料金を算出できない</li>
              <li>会費9,000円はそのまま発生</li>
            </ul>
            <p className="decision-example__arrow" aria-hidden="true">↓</p>
            <h4>今の会費は見直し候補です</h4>
            <p>次の請求前に、休会・変更・退会の条件を確認します。</p>
          </article>
        </div>

        <h3 className="methodology-subheading">4つの結論の見方</h3>
        <div className="outcome-guide">
          <article className="outcome-guide__item outcome-guide__item--keep">
            <p>継続根拠あり</p>
            <h4>重要な利用が期待どおり</h4>
            <span>料金確定・負担なし・来館0回ではない</span>
          </article>
          <article className="outcome-guide__item outcome-guide__item--fees">
            <p>価値あり・料金確認</p>
            <h4>利用価値は得られている</h4>
            <span>料金が未確定、または会費に負担がある</span>
          </article>
          <article className="outcome-guide__item outcome-guide__item--verify">
            <p>あと1か月確認</p>
            <h4>一部だけ、またはまだ不明</h4>
            <span>来館日と一番大事な利用を短く記録する</span>
          </article>
          <article className="outcome-guide__item outcome-guide__item--review">
            <p>見直し候補</p>
            <h4>0回・主な利用なし・期待以下</h4>
            <span>使えず、または家計上の見直しが重なる場合を含む</span>
          </article>
        </div>
        <p className="methodology-caption">これは代表例です。全国一律の「月○回なら得」や、独自の総合点は設けていません。</p>
      </section>

      <section id="limits" aria-labelledby="limits-heading-methodology">
        <SectionHeading
          number="05"
          label="診断の限界"
          title="この診断で決められないこと"
          headingId="limits-heading-methodology"
        />
        <ul className="limits-list">
          <li>活動の種類や時間を独自の金額へ換算すること</li>
          <li>交通費や将来の健康効果を含む全国一律の得する金額</li>
          <li>施設ごとに異なる休会・解約条件の自動判定</li>
        </ul>
        <p>契約を変える前に、公式料金表・規約・契約書で最新条件を確認してください。</p>
      </section>

    </article>
  );
}
