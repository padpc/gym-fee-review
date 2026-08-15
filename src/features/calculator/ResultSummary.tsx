import type { RefObject } from 'react';
import type {
  AssessmentResult,
  FeeEntry,
  PerHourResult,
  PerVisitResult,
} from '../../domain/assessment';
import { formatYen } from '../../shared/format';

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
      return <p className="unavailable-reason"><strong>算出していません：</strong>来館0回では1回あたり料金を割り算できません。支払った入力済み月額は{formatYen(perVisit.unusedPaymentYen)}です。</p>;
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
      <p className="unavailable-reason"><strong>確定額は算出していません：</strong>来館回数が分からないため、回数別の参考額を示します。</p>
      <dl className="scenario-grid" aria-label="来館回数別の参考料金">
        {perVisit.scenarios.map((scenario) => <div key={scenario.visits}><dt>月{scenario.visits}回なら</dt><dd>{formatYen(scenario.yenPerVisit)}／回</dd></div>)}
      </dl>
    </div>
  );
}

function PerHourEvidence({ perHour, monthlyYen }: { perHour: PerHourResult; monthlyYen: number }) {
  if (perHour.kind === 'exact') {
    return <p className="metric-value"><small>{formatYen(monthlyYen)} × 60 ÷ {perHour.minutes}分</small><strong>{formatYen(perHour.yenPerHour)}</strong><span>／館内利用1時間</span></p>;
  }
  if (perHour.kind === 'bounded') {
    return <p className="metric-value"><small>月合計{perHour.minMinutes}〜{perHour.maxMinutes}分</small><strong>{formatYen(perHour.minYenPerHour)}〜{formatYen(perHour.maxYenPerHour)}</strong><span>／館内利用1時間</span></p>;
  }
  if (perHour.kind === 'at-least') {
    return <p className="metric-value"><small>月合計{perHour.minMinutes}分以上</small><strong>{formatYen(perHour.maxYenPerHour)}以下</strong><span>／館内利用1時間</span></p>;
  }
  if (perHour.reason === 'average-needs-visits' && perHour.scenarios) {
    return (
      <div className="scenario-block">
        <p className="unavailable-reason"><strong>確定額は算出していません：</strong>来館回数が分からないため、入力した1回平均時間による参考額を示します。</p>
        <dl className="scenario-grid" aria-label="来館回数別の館内利用時間と参考料金">
          {perHour.scenarios.map((scenario) => <div key={scenario.visits}><dt>月{scenario.visits}回・合計{formatDuration(scenario.totalMinutes)}</dt><dd>{formatYen(scenario.yenPerHour)}／時間</dd></div>)}
        </dl>
      </div>
    );
  }
  const reason = {
    'facility-time-not-entered': '館内利用時間を入力していないためです。',
    'average-needs-visits': '来館回数が分からず、月の館内利用時間を出せないためです。',
    'zero-time': '月の館内利用時間が0時間になるためです。',
  }[perHour.reason];
  return <p className="unavailable-reason"><strong>算出していません：</strong>{reason}</p>;
}

function ReasonList({ reasons, emptyText }: { reasons: string[]; emptyText: string }) {
  if (reasons.length === 0) return <p className="evidence-empty">{emptyText}</p>;
  return <ul className="evidence-list">{reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>;
}

function formatFeeEntry(entry: FeeEntry, period: 'month' | 'year'): string {
  if (entry.kind === 'none') return 'なし';
  if (entry.kind === 'unknown') return '未確認';
  return `${formatYen(entry.yen)}／${period === 'month' ? '月' : '年'}`;
}

export function ResultSummary({ result, headingRef, onEdit }: ResultSummaryProps) {
  const { recommendation } = result;
  const monthlyTitle = result.monthly.kind === 'complete' ? '実質月額' : '入力済み分の月額';
  return (
    <section className="result" aria-labelledby="result-heading">
      <div className="result__heading-row">
        <p className="eyebrow">料金・利用・期待・負担を照合</p>
        <h2 id="result-heading" ref={headingRef} tabIndex={-1}>ジム会費の診断結果</h2>
      </div>

      <section className={`result-overview result-overview--${recommendation.kind}`} aria-labelledby="recommendation-heading">
        <p className="eyebrow">今回の結論</p>
        <h3 id="recommendation-heading">{recommendation.headline}</h3>
      </section>

      <section className="result-section evidence-section evidence-section--support" aria-labelledby="support-heading">
        <p className="eyebrow">料金を払い続ける側の材料</p>
        <h3 id="support-heading">結論を支える根拠</h3>
        <ReasonList reasons={recommendation.supportReasons} emptyText="今月の回答から、続ける側のはっきりした根拠は見つかりませんでした。" />
      </section>

      <section className="result-section evidence-section evidence-section--review" aria-labelledby="review-heading">
        <p className="eyebrow">条件を見直す側の材料</p>
        <h3 id="review-heading">見直す根拠</h3>
        <ReasonList reasons={recommendation.reviewReasons} emptyText="今月の回答では、期待や費用負担に大きな食い違いはありませんでした。" />
      </section>

      <section className="result-section cost-view" aria-labelledby="cost-view-heading">
        <p className="eyebrow">料金の事実</p>
        <h3 id="cost-view-heading">{monthlyTitle} {formatYen(result.monthly.roundedYen)}</h3>
        {result.monthly.kind === 'known-subtotal' ? <p className="unknown-fee-alert">毎月の追加費用または年会費等に未確認があるため、表示額は分かっている料金だけの合計です。</p> : null}
        <p className="result-formula"><code>月額 ＝ 基本月会費 ＋ 毎月の必須追加費 ＋ 年会費等 ÷ 12</code></p>
        <p className="result-rounding-note">年会費÷12は1/12円単位のまま保持し、1回・1時間あたり料金は割り算の最後に四捨五入しています。表示した月額を分子にして再計算した値とは、1円異なる場合があります。</p>
        <dl className="fee-breakdown fee-breakdown--horizontal">
          <div><dt>基本月会費</dt><dd>{formatYen(result.input.fees.baseMonthlyFeeYen)}／月</dd></div>
          <div><dt>毎月の必須追加費</dt><dd>{formatFeeEntry(result.input.fees.monthlyAdditional, 'month')}</dd></div>
          <div><dt>年会費・更新料等</dt><dd>{formatFeeEntry(result.input.fees.annualFee, 'year')}</dd></div>
        </dl>
        <div className="cost-metric-grid">
          <article><h4>来館1回あたり</h4><PerVisitEvidence perVisit={result.perVisit} monthlyYen={result.monthly.roundedYen} /></article>
          <article><h4>館内利用1時間あたり</h4><PerHourEvidence perHour={result.perHour} monthlyYen={result.monthly.roundedYen} /></article>
        </div>
        <p className="cost-caution">時間には着替え、運動、風呂・温泉・サウナ、休憩を含めます。時間の長さを価値の高さには使っていません。</p>
      </section>

      <section className="result-section next-action" aria-labelledby="next-action-heading">
        <p className="eyebrow">最初にすることを一つに絞る</p>
        <h3 id="next-action-heading">次の一行動</h3>
        <p>{recommendation.nextAction}</p>
      </section>

      <p className="result-limit">この診断は全国一律の得する額や契約変更を決めるものではありません。<a className="text-link" href="/methodology">計算方法と判断の考え方を見る</a></p>
      <div className="result__actions"><button className="button button--primary" type="button" onClick={onEdit}>入力を修正</button></div>
    </section>
  );
}
