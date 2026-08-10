import type { RefObject } from 'react';
import {
  getBarrierLabel,
  getPurposeEvidenceLabel,
  type AlternativeMonthlyCost,
  type AssessmentResult,
  type DifferenceResult,
  type EquivalenceDimension,
  type PerHourResult,
  type PerVisitResult,
  type PriceStatus,
  type RatioResult,
} from '../../domain/assessment';
import { formatNumber, formatYen } from '../../shared/format';

interface ResultSummaryProps {
  result: AssessmentResult;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onEdit: () => void;
}

const priceStatusLabels: Record<PriceStatus, string> = {
  'current-lower': '現在プランが同額以下',
  equal: '同額',
  'alternative-lower': '同等の代替が同額以下',
  'depends-on-visits': '回数によって変わる',
  'not-equivalent': '料金だけでは同等と判断できない',
  'equivalence-unknown': '同等条件を確認できない',
  insufficient: '比較資料不足',
};

const equivalenceLabels: Record<EquivalenceDimension, string> = {
  equipment: '必要な設備・サービス',
  hours: '必要な利用回数・時間帯',
  location: '必要な店舗範囲',
};

function formatPercent(value: number) {
  return `${formatNumber(value)}%`;
}

function PerVisitEvidence({ result, title = '1回あたり' }: { result: PerVisitResult; title?: string }) {
  if (result.kind === 'unknown') {
    return <div className="metric-value"><strong>算出できません</strong><span>回数が不明です</span></div>;
  }
  if (result.kind === 'exact') {
    if (result.yenPerVisit === null) {
      return <div className="metric-value"><strong>算出できません</strong><span>利用0回・支払額{formatYen(result.unusedPaymentYen)}</span></div>;
    }
    return <div className="metric-value"><strong>{formatYen(result.yenPerVisit)}／回</strong><span>{result.visits}回で計算した{title}</span></div>;
  }
  if (result.kind === 'bounded') {
    return <div className="metric-value"><strong>{formatNumber(result.minYenPerVisit)}～{formatNumber(result.maxYenPerVisit)}円／回</strong><span>月{result.minVisits}～{result.maxVisits}回の両端で計算</span></div>;
  }
  return <div className="metric-value"><strong>{formatYen(result.maxYenPerVisit)}以下／回</strong><span>月{result.minVisits}回以上として計算</span></div>;
}

function PerHourEvidence({ result }: { result: PerHourResult }) {
  if (result.kind === 'unknown') {
    return <div className="metric-value"><strong>算出していません</strong><span>滞在時間を入力していないか、回数が不明です</span></div>;
  }
  if (result.kind === 'exact') {
    if (result.yenPerHour === null) {
      return <div className="metric-value"><strong>算出できません</strong><span>合計滞在時間が0分です</span></div>;
    }
    return <div className="metric-value"><strong>{formatYen(result.yenPerHour)}／時間</strong><span>合計{formatNumber(result.minutes / 60)}時間で計算</span></div>;
  }
  if (result.kind === 'bounded') {
    return <div className="metric-value"><strong>{formatNumber(result.minYenPerHour)}～{formatNumber(result.maxYenPerHour)}円／時間</strong><span>合計{formatNumber(result.minMinutes / 60)}～{formatNumber(result.maxMinutes / 60)}時間の範囲</span></div>;
  }
  return <div className="metric-value"><strong>{formatYen(result.maxYenPerHour)}以下／時間</strong><span>合計{formatNumber(result.minMinutes / 60)}時間以上として計算</span></div>;
}

function AlternativeCost({ cost }: { cost: AlternativeMonthlyCost }) {
  if (cost.kind === 'unknown') return <span>回数不明のため算出できません</span>;
  if (cost.kind === 'exact') return <strong>{formatYen(cost.roundedYen)}／月</strong>;
  if (cost.kind === 'bounded') return <strong>{formatNumber(cost.minRoundedYen)}～{formatNumber(cost.maxRoundedYen)}円／月</strong>;
  return <strong>{formatYen(cost.minRoundedYen)}以上／月</strong>;
}

function RatioEvidence({ ratio, nullReason }: { ratio: RatioResult | null; nullReason: string }) {
  if (ratio === null) return <span>{nullReason}</span>;
  if (ratio.kind === 'unknown') return <span>回数不明のため算出できません</span>;
  if (ratio.kind === 'exact') return <strong>約{formatPercent(ratio.percent)}</strong>;
  if (ratio.kind === 'bounded') return <strong>約{formatPercent(ratio.minPercent)}～{formatPercent(ratio.maxPercent)}</strong>;
  return <strong>約{formatPercent(ratio.minPercent)}以上</strong>;
}

function exactDifferenceText(difference: Extract<DifferenceResult, { kind: 'exact' }>) {
  if (difference.units === 0) return '月0円・年0円（同額）';
  const monthly = Math.abs(difference.roundedYen);
  const annual = Math.abs(difference.annualYen);
  const monthlyText = monthly === 0 ? '月1円未満' : `月${formatNumber(monthly)}円`;
  return difference.units > 0
    ? `現在が${monthlyText}・年${formatNumber(annual)}円低い`
    : `代替が${monthlyText}・年${formatNumber(annual)}円低い`;
}

function DifferenceEvidence({ difference }: { difference: DifferenceResult | null }) {
  if (!difference || difference.kind === 'unknown') return <span>比較できません</span>;
  if (difference.kind === 'exact') return <strong>{exactDifferenceText(difference)}</strong>;
  if (difference.kind === 'bounded') {
    const lower = exactDifferenceText({
      kind: 'exact',
      units: difference.minUnits,
      roundedYen: difference.minRoundedYen,
      annualYen: difference.minAnnualYen,
    });
    const upper = exactDifferenceText({
      kind: 'exact',
      units: difference.maxUnits,
      roundedYen: difference.maxRoundedYen,
      annualYen: difference.maxAnnualYen,
    });
    return <strong>回数範囲の下端：{lower}／上端：{upper}</strong>;
  }
  return <strong>下限回数では{exactDifferenceText({ kind: 'exact', units: difference.minUnits, roundedYen: difference.minRoundedYen, annualYen: difference.minAnnualYen })}。以後は回数で変わります。</strong>;
}

function PriceReason({ result }: { result: AssessmentResult }) {
  const { price } = result;
  if (price.status === 'insufficient') {
    return price.insufficientReason === 'visits-unknown'
      ? <p>公式の都度料金はありますが、利用回数が不明なため月額差を確定していません。</p>
      : <p>公式に確認した代替料金がないため、料金の得・損は確定していません。</p>;
  }
  if (price.status === 'not-equivalent') {
    return <p>代替は{price.failedEquivalence.map((item) => equivalenceLabels[item]).join('・')}を満たさないため、料金だけで同等とは扱いません。</p>;
  }
  if (price.status === 'equivalence-unknown') {
    return <p>{price.uncertainEquivalence.map((item) => equivalenceLabels[item]).join('・')}が不明なため、安い側を結論にしていません。</p>;
  }
  if (price.status === 'depends-on-visits') return <p>入力した回数範囲の中で、現在と代替の低い側が変わります。</p>;
  if (price.status === 'equal') return <p>丸め前の月額相当でも、現在と代替は同額です。</p>;
  if (price.status === 'current-lower') return <p>同じ目的に必要な条件を満たす代替に対し、現在の実質月額が低いか同額の試算です。</p>;
  return <p>同じ目的に必要な条件を満たす代替が、現在の実質月額より低いか同額の試算です。</p>;
}

function PlanAchievementCard({ result }: { result: AssessmentResult }) {
  const { purpose } = result;
  if (purpose.planAchievement.kind === 'unknown') {
    return (
      <section className="result-card" aria-labelledby="achievement-heading">
        <p className="result-card__eyebrow">会費活用度の中心指標</p>
        <h3 id="achievement-heading">利用計画達成率</h3>
        <div className="metric-value"><strong>算出していません</strong><span>予定した来館回数または目的に使えた来館回数が不明です</span></div>
        <p>{purpose.purposeLabel}について、分かる実績だけを表示します。</p>
      </section>
    );
  }
  return (
    <section className="result-card result-card--highlight" aria-labelledby="achievement-heading">
      <p className="result-card__eyebrow">会費活用度の中心指標</p>
      <h3 id="achievement-heading">利用計画達成率</h3>
      <div className="metric-value metric-value--large">
        <strong>{formatPercent(purpose.planAchievement.percent)}</strong>
        <span>予定{purpose.planAchievement.plannedCount}回／実績{purpose.planAchievement.achievedCount}回</span>
      </div>
      {purpose.planAchievement.remainingCount > 0 ? <p>予定までは、あと{purpose.planAchievement.remainingCount}回です。</p> : <p>予定した回数以上を実行できています。</p>}
      <p>100%は予定と実績の一致だけを意味し、料金や健康効果を含む総合点ではありません。</p>
    </section>
  );
}

function UsageCards({ result }: { result: AssessmentResult }) {
  const achieved = result.purpose.achieved;
  return (
    <div className="result-metrics">
      <section className="result-card" aria-labelledby="per-visit-heading">
        <h3 id="per-visit-heading">1回あたり料金</h3>
        <PerVisitEvidence result={result.perVisit} />
      </section>
      <section className="result-card" aria-labelledby="per-hour-heading">
        <h3 id="per-hour-heading">1時間あたり料金</h3>
        <PerHourEvidence result={result.perHour} />
      </section>
      <section className="result-card" aria-labelledby="per-purpose-heading">
        <h3 id="per-purpose-heading">目的に使えた来館1回あたり</h3>
        {result.purpose.achievedCostStatus === 'known' ? (
          <div className="metric-value"><strong>{formatYen(result.purpose.yenPerAchievedVisit ?? 0)}／回</strong><span>{achieved.kind === 'exact' ? achieved.count : 0}回で計算</span></div>
        ) : result.purpose.achievedCostStatus === 'zero-achieved' ? (
          <div className="metric-value"><strong>算出できません</strong><span>目的に使えた来館回数が0回です</span></div>
        ) : (
          <div className="metric-value"><strong>算出していません</strong><span>目的に使えた来館回数が不明です</span></div>
        )}
        <p>{result.purpose.purposeLabel}：{getPurposeEvidenceLabel(result.purpose.evidence)}</p>
      </section>
    </div>
  );
}

function PriceComparison({ result }: { result: AssessmentResult }) {
  const { price } = result;
  return (
    <section className={`comparison-result comparison-result--${price.status}`} aria-labelledby="comparison-heading">
      <div className="comparison-result__heading">
        <div><p className="eyebrow">料金プラン適合</p><h3 id="comparison-heading">{priceStatusLabels[price.status]}</h3></div>
        <span className="status-label">{priceStatusLabels[price.status]}</span>
      </div>
      <PriceReason result={result} />

      {price.alternative.availability === 'known' ? (
        <>
          <div className="comparison-grid">
            <div><span>現在の実質月額</span><strong>{formatYen(price.current.roundedYen)}</strong></div>
            <div><span>{price.alternative.name}</span>{price.alternativeMonthly ? <AlternativeCost cost={price.alternativeMonthly} /> : <span>算出できません</span>}</div>
            <div>
              <span>実利用の代替価値率</span>
              <RatioEvidence
                ratio={price.alternativeValueRatio}
                nullReason={price.equivalenceStatus === 'equivalent'
                  ? '現在の実質月額が0円のため、率は算出しません'
                  : '同等条件を満たすと確認できないため、率は算出しません'}
              />
            </div>
            <div><span>料金差</span><DifferenceEvidence difference={price.difference} /></div>
          </div>
          {price.alternativeMonthly ? (
            <div className="evidence-box">
              <h4>現在側が料金だけで同額になる実質月額</h4>
              <AlternativeCost cost={price.alternativeMonthly} />
              <p>月会費だけでなく、毎月必須費用と年会費の12分の1を含む合計です。非同等または条件不明の候補では、同額でも乗り換え候補とは扱いません。</p>
            </div>
          ) : null}
        </>
      ) : (
        <div className="evidence-box">
          <h4>代替不明時の同額条件</h4>
          <PerVisitEvidence result={price.samePricePerVisit} title="同額になる都度料金" />
          <p>この金額は「通うべき回数」ではなく、現在会費と都度料金が同額になる条件です。</p>
        </div>
      )}

      {price.purePerVisitBreakEven ? (
        <div className="evidence-box">
          <h4>都度利用との料金境界</h4>
          <p>月{price.purePerVisitBreakEven.firstVisitCurrentNoMoreExpensive}回で現在会費が都度利用以下、月{price.purePerVisitBreakEven.firstVisitCurrentStrictlyCheaper}回で現在会費が都度利用より低くなる計算です。</p>
          <p>同額点は{formatNumber(price.purePerVisitBreakEven.equalityVisits)}回です。来館を増やすよう勧める値ではありません。</p>
        </div>
      ) : null}

      {price.hasRoundedBoundaryDifference ? <p className="rounding-warning">表示円額が同じでも、判定は丸め前の1/12円単位で行っています。</p> : null}
    </section>
  );
}

export function ResultSummary({ result, headingRef, onEdit }: ResultSummaryProps) {
  const { recommendation } = result;
  const achievementReason = result.purpose.planAchievement.kind === 'known'
    ? `${formatPercent(result.purpose.planAchievement.percent)}（予定${result.purpose.planAchievement.plannedCount}回・実績${result.purpose.planAchievement.achievedCount}回）`
    : '予定または実績が不明のため算出なし';
  const conditionReason = result.price.failedEquivalence.length > 0
    ? result.price.failedEquivalence.map((item) => equivalenceLabels[item]).join('・')
    : result.price.uncertainEquivalence.length > 0
      ? `${result.price.uncertainEquivalence.map((item) => equivalenceLabels[item]).join('・')}が不明`
      : null;
  return (
    <section className="result" aria-labelledby="result-heading">
      <div className="result__heading-row">
        <p className="eyebrow">実績・予定・実在代替から計算</p>
        <h2 id="result-heading" ref={headingRef} tabIndex={-1}>会費の活用状況</h2>
      </div>

      <section className={`recommendation recommendation--${recommendation.kind}`} aria-labelledby="recommendation-heading">
        <p className="eyebrow">今回の主な確認候補</p>
        <h3 id="recommendation-heading">{recommendation.headline}</h3>
        <dl className="recommendation__reasons">
          <div><dt>料金</dt><dd>{priceStatusLabels[result.price.status]}</dd></div>
          <div><dt>利用計画</dt><dd>{achievementReason}</dd></div>
          <div><dt>具体的な変化・利用</dt><dd>{getPurposeEvidenceLabel(result.purpose.evidence)}</dd></div>
          <div><dt>主な阻害要因</dt><dd>{getBarrierLabel(recommendation.barrier)}</dd></div>
          {conditionReason ? <div><dt>満たせない・不明な条件</dt><dd>{conditionReason}</dd></div> : null}
        </dl>
        <p><strong>次の1か月で試すこと：</strong>{recommendation.nextStep}</p>
        {recommendation.supplementalContractReview ? <p className="recommendation__notice">来館0回かつ目的に使えた来館回数0回のため、休会・退会を含む契約自体も確認候補です。</p> : null}
      </section>

      <section className="monthly-summary" aria-labelledby="monthly-heading">
        <div><p className="eyebrow">今後の継続判断に使う金額</p><h3 id="monthly-heading">実質月額 {formatYen(result.monthly.roundedYen)}</h3></div>
        <dl className="fee-breakdown fee-breakdown--horizontal">
          <div><dt>月会費</dt><dd>{formatYen(result.input.fees.monthlyFeeYen)}</dd></div>
          <div><dt>毎月必須の追加費用</dt><dd>{formatYen(result.input.fees.monthlyFixedFeeYen)}</dd></div>
          <div><dt>年会費</dt><dd>{formatYen(result.input.fees.annualFeeYen)}／年（12分の1を加算）</dd></div>
        </dl>
      </section>

      <PlanAchievementCard result={result} />
      <UsageCards result={result} />
      <PriceComparison result={result} />

      <section className="method-summary" aria-labelledby="method-summary-heading">
        <h3 id="method-summary-heading">この結果で点数化していないもの</h3>
        <p>目的の種類、具体的な変化、阻害要因、設備数を、不明な重みで一つの総合点へ足していません。利用計画達成率と代替価値率は、100%の意味が異なるため別々に表示しています。</p>
        <a className="text-link" href="/methodology">計算式と結果の読み方を確認する</a>
      </section>

      <section className="official-check" aria-labelledby="official-check-heading">
        <h3 id="official-check-heading">契約を変える前に公式条件を確認してください</h3>
        {result.price.alternative.availability === 'known'
          ? <p>代替結果は、入力時に通常料金・必須費用・利用条件を公式情報で確認したという回答に基づく試算です。サイト側が料金の最新性を検証したものではありません。</p>
          : <p>代替料金が不明なため、料金の得・損は判定していません。比較する場合は、契約先の公式情報から候補1件を確認してください。</p>}
        <p>料金、必須費用、設備、利用可能時間、店舗範囲、休会・変更・退会期限は、契約先の最新情報で確認してください。</p>
        <p>交通費と移動時間は料金率へ混ぜていません。現在と候補を同じ条件で別に比較してください。</p>
      </section>

      <div className="result__actions"><button className="button button--primary" type="button" onClick={onEdit}>入力を修正</button></div>
    </section>
  );
}
