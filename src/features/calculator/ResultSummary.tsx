import type { RefObject } from 'react';
import {
  getBarrierLabel,
  getContinuationLabel,
  getFeeBurdenLabel,
  type AssessmentResult,
  type PerHourResult,
  type PerVisitResult,
  type ValueAssessment,
} from '../../domain/assessment';
import { formatNumber, formatYen } from '../../shared/format';

interface ResultSummaryProps {
  result: AssessmentResult;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onEdit: () => void;
}

function formatDuration(minutes: number): string {
  const hours = minutes / 60;
  const hourText = Number.isInteger(hours) ? String(hours) : String(Number(hours.toFixed(2)));
  return `${hourText}時間（${minutes}分）`;
}

function PerVisitEvidence({ perVisit, monthlyYen }: { perVisit: PerVisitResult; monthlyYen: number }) {
  if (perVisit.kind === 'exact') {
    if (perVisit.visits === 0) {
      return <p className="unavailable-reason"><strong>算出していません：</strong>来館回数が0回のため、1回あたり料金を割り算できません。今月支払った実質月額は{formatYen(perVisit.unusedPaymentYen)}です。</p>;
    }
    return <p className="metric-value"><small>{formatYen(monthlyYen)} ÷ {perVisit.visits}回</small><strong>{formatYen(perVisit.yenPerVisit ?? 0)}</strong><span>／来館</span></p>;
  }
  if (perVisit.kind === 'bounded') {
    return <p className="metric-value"><small>{formatYen(monthlyYen)} ÷ 月{perVisit.minVisits}〜{perVisit.maxVisits}回</small><strong>{formatYen(perVisit.minYenPerVisit)}〜{formatYen(perVisit.maxYenPerVisit)}</strong><span>／来館</span></p>;
  }
  if (perVisit.kind === 'at-least') {
    return <p className="metric-value"><small>{formatYen(monthlyYen)} ÷ 月{perVisit.minVisits}回以上</small><strong>{formatYen(perVisit.maxYenPerVisit)}以下</strong><span>／来館</span></p>;
  }
  return (
    <div className="scenario-block">
      <p className="unavailable-reason"><strong>確定単価は算出していません：</strong>来館回数が不明なためです。回数ごとの参考値を示します。</p>
      <dl className="scenario-grid" aria-label="来館回数別の参考単価">
        {perVisit.scenarios.map((scenario) => <div key={scenario.visits}><dt>月{scenario.visits}回なら</dt><dd>{formatYen(monthlyYen)} ÷ {scenario.visits}回<br />＝ {formatYen(scenario.yenPerVisit)}／回</dd></div>)}
      </dl>
    </div>
  );
}

function PerHourEvidence({ perHour, monthlyYen }: { perHour: PerHourResult; monthlyYen: number }) {
  if (perHour.kind === 'exact') {
    return <p className="metric-value"><small>{formatYen(monthlyYen)} × 60 ÷ {perHour.minutes}分</small><strong>{formatYen(perHour.yenPerHour)}</strong><span>／館内利用1時間</span></p>;
  }
  if (perHour.kind === 'bounded') {
    return <p className="metric-value"><small>{formatYen(monthlyYen)} × 60 ÷ 月合計{perHour.minMinutes}〜{perHour.maxMinutes}分</small><strong>{formatYen(perHour.minYenPerHour)}〜{formatYen(perHour.maxYenPerHour)}</strong><span>／館内利用1時間</span></p>;
  }
  if (perHour.kind === 'at-least') {
    return <p className="metric-value"><small>{formatYen(monthlyYen)} × 60 ÷ 月合計{perHour.minMinutes}分以上</small><strong>{formatYen(perHour.maxYenPerHour)}以下</strong><span>／館内利用1時間</span></p>;
  }
  if (perHour.reason === 'average-needs-visits' && perHour.scenarios) {
    return (
      <div className="scenario-block">
        <p className="unavailable-reason"><strong>確定単価は算出していません：</strong>来館回数が不明なためです。入力した1回平均時間を使った参考値を示します。</p>
        <dl className="scenario-grid" aria-label="来館回数別の館内利用時間と参考単価">
          {perHour.scenarios.map((scenario) => (
            <div key={scenario.visits}>
              <dt>月{scenario.visits}回・合計{formatDuration(scenario.totalMinutes)}</dt>
              <dd>{formatYen(monthlyYen)} × 60 ÷ {scenario.totalMinutes}分<br />＝ {formatYen(scenario.yenPerHour)}／時間</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }
  const reason = {
    'facility-time-not-entered': '館内利用時間を入力していないため、1時間あたり料金を算出していません。',
    'average-needs-visits': '来館回数が不明なため、1回平均から月の館内利用時間を算出できません。',
    'zero-time': '月の館内利用時間が0時間になるため、1時間あたり料金を割り算できません。',
  }[perHour.reason];
  return <p className="unavailable-reason"><strong>算出していません：</strong>{reason}</p>;
}

function ValueList({ values, emptyText }: { values: ValueAssessment[]; emptyText: string }) {
  if (values.length === 0) return <p className="empty-value">{emptyText}</p>;
  return (
    <ul className="value-result-list">
      {values.map((value) => (
        <li key={value.id}>
          <strong>{value.label}</strong>
          <span>{value.frequencyLabel}・{value.fulfillmentLabel}</span>
        </li>
      ))}
    </ul>
  );
}

const fulfillmentLabels = {
  met: '期待どおり',
  partly: '一部期待どおり',
  unmet: '期待未達',
  unknown: '判断できない',
} as const;

export function ResultSummary({ result, headingRef, onEdit }: ResultSummaryProps) {
  const { recommendation, valueSummary } = result;
  return (
    <section className="result" aria-labelledby="result-heading">
      <div className="result__heading-row">
        <p className="eyebrow">料金の事実と、本人が残したい価値から判定</p>
        <h2 id="result-heading" ref={headingRef} tabIndex={-1}>ジム会費の診断結果</h2>
      </div>

      <section className={`result-overview result-overview--${recommendation.kind}`} aria-labelledby="recommendation-heading">
        <p className="eyebrow">今回の結論</p>
        <h3 id="recommendation-heading">{recommendation.headline}</h3>
        <p className="result-overview__reason">{recommendation.reason}</p>
        <p className="decision-rule"><strong>適用した規則：</strong>{recommendation.decisionRuleId.replace('rule-', '規則')} — {recommendation.decisionRuleLabel}</p>
      </section>

      <section className="result-section" aria-labelledby="retained-values-heading">
        <p className="eyebrow">結論に使った価値の内訳</p>
        <h3 id="retained-values-heading">会費を払って残したい価値</h3>
        <p>「残したい」「確認中」「会費を払う理由ではない」を分け、期待充足の件数とともに結論の根拠へ使っています。</p>
        <ValueList values={valueSummary.strongValues} emptyText="会費を払ってでも残したいと回答した価値は、まだありません。" />
        {valueSummary.tentativeValues.length > 0 ? (
          <div className="tentative-values"><h4>次の利用で確かめたい価値</h4><ValueList values={valueSummary.tentativeValues} emptyText="" /></div>
        ) : null}
        <div className="transparent-count" aria-labelledby="fulfillment-count-heading">
          <h4 id="fulfillment-count-heading">期待どおり使えたかの件数</h4>
          <dl>
            {valueSummary.fulfillmentCounts.map((item) => (
              <div key={item.id}><dt>{fulfillmentLabels[item.id]}</dt><dd>{item.count}件</dd></div>
            ))}
          </dl>
          <p>件数を透明に示すだけで、重み付きの総合点にはしていません。</p>
        </div>
        {valueSummary.assessments.length > 0 ? (
          <details className="value-details">
            <summary>すべての利用価値の回答を見る</summary>
            <div className="value-detail-grid">
              {valueSummary.assessments.map((value) => (
                <article key={value.id}>
                  <h4>{value.label}</h4>
                  <dl>
                    <div><dt>利用頻度</dt><dd>{value.frequencyLabel}</dd></div>
                    <div><dt>期待どおりか</dt><dd>{value.fulfillmentLabel}</dd></div>
                    <div><dt>会費を払う理由</dt><dd>{value.payReasonLabel}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          </details>
        ) : <p className="inline-note">今月は特に利用していないという回答です。</p>}
      </section>

      <section className="result-section cost-view" aria-labelledby="cost-view-heading">
        <p className="eyebrow">料金の見え方</p>
        <h3 id="cost-view-heading">実質月額 {formatYen(result.monthly.roundedYen)}</h3>
        <p className="result-formula"><code>実質月額 ＝ 月会費 ＋ 毎月必須の追加費用 ＋ 年会費等 ÷ 12</code></p>
        <p className="result-rounding-note">各カードの割り算は表示額による式の見え方です。内部では年会費÷12を1/12円精度のまま計算し、1回・1時間あたりの結果を最後に四捨五入しています。</p>
        <dl className="fee-breakdown fee-breakdown--horizontal">
          <div><dt>月会費</dt><dd>{formatYen(result.input.fees.monthlyFeeYen)}</dd></div>
          <div><dt>毎月必須の追加費用</dt><dd>{formatYen(result.input.fees.monthlyFixedFeeYen)}</dd></div>
          <div><dt>年会費等</dt><dd>{formatYen(result.input.fees.annualFeeYen)}／年<br /><small>12分の1を加算</small></dd></div>
        </dl>
        <div className="cost-metric-grid">
          <article><h4>来館1回あたり</h4><PerVisitEvidence perVisit={result.perVisit} monthlyYen={result.monthly.roundedYen} /></article>
          <article><h4>館内利用1時間あたり</h4><PerHourEvidence perHour={result.perHour} monthlyYen={result.monthly.roundedYen} /></article>
        </div>
        <p className="cost-caution">館内利用時間には着替え、運動、クラス、プール、風呂・サウナ、休憩を含みます。時間が長いほど高価値とは判定していません。</p>
        <dl className="decision-facts">
          <div><dt>費用負担</dt><dd>{getFeeBurdenLabel(result.input.feeBurden)}</dd></div>
          <div><dt>来月も同条件で選ぶか</dt><dd>{getContinuationLabel(result.input.continuation)}</dd></div>
          <div><dt>確認した利用価値</dt><dd>{formatNumber(valueSummary.assessedCount)}項目</dd></div>
        </dl>
      </section>

      <section className="result-section decision-actions" aria-labelledby="next-action-heading">
        <div>
          <p className="eyebrow">最初にすることを一つに絞る</p>
          <h3 id="next-action-heading">次の一行動</h3>
          <p>{recommendation.nextStep}</p>
        </div>
        <div>
          <p className="eyebrow">再診断の目安</p>
          <h3>結論が変わる条件</h3>
          <p>{recommendation.changeCondition}</p>
        </div>
        {recommendation.barrier ? <p className="decision-actions__barrier"><strong>主な阻害要因：</strong>{getBarrierLabel(recommendation.barrier)}</p> : null}
      </section>

      <section className="result-section method-summary" aria-labelledby="method-summary-heading">
        <h3 id="method-summary-heading">この結果がしていないこと</h3>
        <p>利用項目や時間に独自の金額倍率を付けず、不透明な総合点も使っていません。料金の事実、本人が残したい価値、費用負担、継続意向を分けて表示しています。</p>
        <a className="text-link" href="/methodology">計算方法と結論の規則を確認する</a>
      </section>

      <section className="official-check" aria-labelledby="official-check-heading">
        <h3 id="official-check-heading">契約を変える前に公式条件を確認してください</h3>
        <p>休会、低料金プラン、割引、解約時期、違約金の有無は、契約先の最新料金表・規約・契約書で確認してください。この診断は契約変更を自動で決めません。</p>
      </section>

      <div className="result__actions"><button className="button button--primary" type="button" onClick={onEdit}>入力を修正</button></div>
    </section>
  );
}
