import type { RefObject } from 'react';
import {
  getContentFitLabel,
  getBarrierLabel,
  getContinuationLabel,
  getPurposeEvidenceLabel,
  getSafetyLabel,
  type AlternativeMonthlyCost,
  type AssessmentResult,
  type CountCostStatus,
  type DifferenceResult,
  type EquivalenceDimension,
  type PerActivityCostResult,
  type PerHourResult,
  type PerVisitResult,
  type PriceStatus,
  type UsageRateResult,
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
  services: '主な活動・実際に使った付帯サービス',
  hours: '必要な利用時間帯',
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
    return <div className="metric-value"><strong>算出していません</strong><span>実運動時間を入力していないか、回数が不明です</span></div>;
  }
  if (result.kind === 'exact') {
    if (result.yenPerHour === null) {
      return <div className="metric-value"><strong>算出できません</strong><span>合計実運動時間が0分です</span></div>;
    }
    return <div className="metric-value"><strong>{formatYen(result.yenPerHour)}／時間</strong><span>合計実運動{formatNumber(result.minutes / 60)}時間で計算</span></div>;
  }
  if (result.kind === 'bounded') {
    return <div className="metric-value"><strong>{formatNumber(result.minYenPerHour)}～{formatNumber(result.maxYenPerHour)}円／時間</strong><span>合計実運動{formatNumber(result.minMinutes / 60)}～{formatNumber(result.maxMinutes / 60)}時間の範囲</span></div>;
  }
  return <div className="metric-value"><strong>{formatYen(result.maxYenPerHour)}以下／時間</strong><span>合計実運動{formatNumber(result.minMinutes / 60)}時間以上として計算</span></div>;
}

function PerActivityEvidence({ result }: { result: PerActivityCostResult }) {
  if (result.kind === 'unknown') {
    return <div className="metric-value"><strong>算出していません</strong><span>目的活動回数Sが不明です</span></div>;
  }
  if (result.yenPerActivity === null) {
    return <div className="metric-value"><strong>算出できません</strong><span>目的活動0回・支払額{formatYen(result.unusedPaymentYen)}</span></div>;
  }
  return <div className="metric-value"><strong>{formatYen(result.yenPerActivity)}／回</strong><span>目的活動{result.activities}回で同額</span></div>;
}

function CountCostEvidence({
  status,
  yen,
  count,
  unknownText,
}: {
  status: CountCostStatus;
  yen: number | null;
  count: number | null;
  unknownText: string;
}) {
  if (status === 'known') {
    return <div className="metric-value"><strong>{formatYen(yen ?? 0)}／回</strong><span>{count}回で計算</span></div>;
  }
  if (status === 'zero-count') {
    return <div className="metric-value"><strong>算出できません</strong><span>回数が0回です</span></div>;
  }
  return <div className="metric-value"><strong>算出していません</strong><span>{unknownText}</span></div>;
}

function RateEvidence({ result, numeratorName, denominatorName }: {
  result: UsageRateResult;
  numeratorName: string;
  denominatorName: string;
}) {
  if (result.kind === 'exact') {
    return <><dd><strong>{formatPercent(result.percent)}</strong></dd><dd>{numeratorName}{result.numerator}回／{denominatorName}{result.denominator}回</dd></>;
  }
  if (result.kind === 'bounded') {
    return <><dd><strong>{formatNumber(result.minPercent)}～{formatNumber(result.maxPercent)}%</strong></dd><dd>{denominatorName}を範囲のまま計算</dd></>;
  }
  if (result.kind === 'at-most') {
    return <><dd><strong>{formatPercent(result.maxPercent)}以下</strong></dd><dd>{denominatorName}{result.minDenominator}回以上</dd></>;
  }
  if (result.kind === 'zero-denominator') {
    return <><dd><strong>算出できません</strong></dd><dd>{denominatorName}が0回です</dd></>;
  }
  return <><dd><strong>算出していません</strong></dd><dd>必要な回数が不明です</dd></>;
}

function AlternativeCost({ cost }: { cost: AlternativeMonthlyCost }) {
  if (cost.kind === 'unknown') return <span>回数不明のため算出できません</span>;
  if (cost.kind === 'exact') return <strong>{formatYen(cost.roundedYen)}／月</strong>;
  if (cost.kind === 'bounded') return <strong>{formatNumber(cost.minRoundedYen)}～{formatNumber(cost.maxRoundedYen)}円／月</strong>;
  return <strong>{formatYen(cost.minRoundedYen)}以上／月</strong>;
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
    return price.insufficientReason === 'activity-count-unknown'
      ? <p>公式の都度料金はありますが、目的活動回数Sが不明なため月額差を確定していません。</p>
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

function UsageSummary({ result }: { result: AssessmentResult }) {
  const performedCount = result.purpose.performed.kind === 'exact' ? result.purpose.performed.count : null;
  const completedCount = result.purpose.completed.kind === 'exact' ? result.purpose.completed.count : null;
  return (
    <section className="result-section" aria-labelledby="usage-summary-heading">
      <h3 id="usage-summary-heading">回数ごとの料金と使い方</h3>
      <div className="result-metrics result-metrics--four">
        <section className="result-card" aria-labelledby="per-visit-heading">
          <h3 id="per-visit-heading">来館1回あたり</h3>
          <PerVisitEvidence result={result.perVisit} />
        </section>
        <section className="result-card" aria-labelledby="per-performed-heading">
          <h3 id="per-performed-heading">目的活動1回あたり</h3>
          <CountCostEvidence status={result.purpose.performedCostStatus} yen={result.purpose.yenPerPerformed} count={performedCount} unknownText="目的活動回数Sが不明です" />
        </section>
        <section className="result-card" aria-labelledby="per-completed-heading">
          <h3 id="per-completed-heading">内容完了1回あたり</h3>
          <CountCostEvidence status={result.purpose.completedCostStatus} yen={result.purpose.yenPerCompleted} count={completedCount} unknownText="内容完了回数Fが不明です" />
        </section>
        {result.input.time.kind !== 'unknown' ? (
          <section className="result-card" aria-labelledby="per-hour-heading">
            <h3 id="per-hour-heading">実運動1時間あたり</h3>
            <PerHourEvidence result={result.perHour} />
          </section>
        ) : null}
      </div>
      <dl className="usage-rate-grid">
        <div><dt>活動利用率 S÷V</dt><RateEvidence result={result.purpose.activityRate} numeratorName="S" denominatorName="V" /></div>
        <div><dt>内容完了率 F÷S</dt><RateEvidence result={result.purpose.completionRate} numeratorName="F" denominatorName="S" /></div>
      </dl>
      <p>100%は分子と分母が同じ回数だったことだけを意味し、料金・健康・満足を含む総合点ではありません。</p>
    </section>
  );
}

function ValueEvidence({ result }: { result: AssessmentResult }) {
  return (
    <section className="result-section" aria-labelledby="value-evidence-heading">
      <h3 id="value-evidence-heading">内容・変化・実際に使った条件</h3>
      <dl className="quality-grid">
        <div><dt>主な目的</dt><dd>{result.purpose.purposeLabel}</dd></div>
        <div><dt>主な活動</dt><dd>{result.purpose.activityLabel}</dd></div>
        <div><dt>活動に合う内容</dt><dd>{getContentFitLabel(result.purpose.contentFit)}</dd></div>
        <div><dt>目的に沿う変化</dt><dd>{getPurposeEvidenceLabel(result.purpose.evidence)}<br /><small>確認例：{result.purpose.changeExamples}</small></dd></div>
        <div><dt>来月も選びたいか</dt><dd>{getContinuationLabel(result.input.continuation)}</dd></div>
        <div><dt>安全上の回答</dt><dd>{getSafetyLabel(result.input.safety)}</dd></div>
      </dl>
      <h4>現在プランで実際に使った付帯サービス</h4>
      <ul className="service-tags">
        {result.usedServiceLabels.map((label) => <li key={label}>{label}</li>)}
      </ul>
      <p>活動の種類やサービスへ独自の金額倍率を付けず、実利用の事実と代替に必要な条件として扱います。</p>
    </section>
  );
}

function CompletionOpportunityCard({ result }: { result: AssessmentResult }) {
  const opportunity = result.purpose.completionOpportunity;
  if (opportunity.kind !== 'available') return null;
  return (
    <section className="result-section completion-opportunity" aria-labelledby="completion-opportunity-heading">
      <h3 id="completion-opportunity-heading">同じ活動回数で、始めた内容を完了できた場合</h3>
      <div className="completion-opportunity__values">
        <div><span>現在：完了{opportunity.completedCount}回</span><strong>{opportunity.currentYenPerCompleted === null ? '算出できません' : `${formatYen(opportunity.currentYenPerCompleted)}／完了`}</strong></div>
        <div><span>同じS{opportunity.performedCount}回をすべて完了</span><strong>{formatYen(opportunity.ifAllPerformedCompletedYen)}／完了</strong></div>
      </div>
      <p>追加来館を勧める計算ではありません。既に始めた{opportunity.performedCount}回のうち、未完了{opportunity.incompleteCount}回の取りこぼしを減らした場合です。</p>
    </section>
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

      <div className="evidence-box">
        <h4>同等比較で保持する活動・サービス</h4>
        <p>{result.purpose.alternativeRequirement}</p>
        <p><strong>実利用の付帯サービス：</strong>{price.requiredAlternativeServiceLabels.length > 0 ? price.requiredAlternativeServiceLabels.join('・') : '特になし'}</p>
      </div>

      {price.alternative.availability === 'known' ? (
        <>
          <div className="comparison-grid">
            <div><span>現在の実質月額</span><strong>{formatYen(price.current.roundedYen)}</strong></div>
            <div><span>{price.alternative.name}</span>{price.alternativeMonthly ? <AlternativeCost cost={price.alternativeMonthly} /> : <span>算出できません</span>}</div>
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
          <h4>代替を入力しない場合の同額条件</h4>
          <PerActivityEvidence result={price.samePricePerActivity} />
          <p>料金の得・損は確定していません。この金額は、今の目的活動を都度料金で再現した場合に現在会費と同額になる条件です。</p>
        </div>
      )}

      {price.purePerVisitBreakEven ? (
        <div className="evidence-box">
          <h4>目的活動と都度利用の料金境界</h4>
          <p>目的活動が月{price.purePerVisitBreakEven.firstVisitCurrentNoMoreExpensive}回で現在会費が都度利用以下、月{price.purePerVisitBreakEven.firstVisitCurrentStrictlyCheaper}回で現在会費が都度利用より低くなる計算です。</p>
          <p>同額点は{formatNumber(price.purePerVisitBreakEven.equalityVisits)}回です。活動回数を増やすよう勧める値ではありません。</p>
        </div>
      ) : null}

      {price.hasRoundedBoundaryDifference ? <p className="rounding-warning">表示円額が同じでも、判定は丸め前の1/12円単位で行っています。</p> : null}
    </section>
  );
}

export function ResultSummary({ result, headingRef, onEdit }: ResultSummaryProps) {
  const { recommendation } = result;
  const performedText = result.purpose.performed.kind === 'exact'
    ? `目的活動 S：${result.purpose.performed.count}回`
    : '目的活動 S：回数不明';
  const completedText = result.purpose.completed.kind === 'exact'
    ? `内容完了 F：${result.purpose.completed.count}回`
    : '内容完了 F：回数不明';
  const purposeCostText = result.purpose.performedCostStatus === 'known'
    ? `目的活動1回 ${formatYen(result.purpose.yenPerPerformed ?? 0)}`
    : result.purpose.performedCostStatus === 'zero-count'
      ? '目的活動0回のため単価なし'
      : '目的活動単価は回数不明のため算出なし';
  return (
    <section className="result" aria-labelledby="result-heading">
      <div className="result__heading-row">
        <p className="eyebrow">来館・目的活動・内容完了から計算</p>
        <h2 id="result-heading" ref={headingRef} tabIndex={-1}>会費の活用状況</h2>
      </div>

      <section className={`result-overview result-overview--${recommendation.kind}`} aria-labelledby="recommendation-heading">
        <p className="eyebrow">今回の結論</p>
        <h3 id="recommendation-heading">{recommendation.headline}</h3>
        <p className="result-overview__reason">{recommendation.reason}</p>
        <div className="decision-grid">
          <section>
            <h4>使い方</h4>
            <p>{performedText}<br />{completedText}</p>
          </section>
          <section>
            <h4>料金</h4>
            <p>実質月額 {formatYen(result.monthly.roundedYen)}<br />{purposeCostText}</p>
          </section>
          <section className="decision-grid__action">
            <h4>次の一行動</h4>
            <p>{recommendation.nextStep}</p>
          </section>
        </div>
        {recommendation.barrier !== null ? <p className="result-overview__barrier"><strong>主な阻害要因：</strong>{getBarrierLabel(recommendation.barrier)}</p> : null}
        <p className="change-condition"><strong>結論が変わる条件：</strong>{recommendation.changeCondition}</p>
      </section>

      <section className="monthly-summary" aria-labelledby="monthly-heading">
        <div><p className="eyebrow">今後の継続判断に使う金額</p><h3 id="monthly-heading">実質月額 {formatYen(result.monthly.roundedYen)}</h3></div>
        <dl className="fee-breakdown fee-breakdown--horizontal">
          <div><dt>月会費</dt><dd>{formatYen(result.input.fees.monthlyFeeYen)}</dd></div>
          <div><dt>毎月必須の追加費用</dt><dd>{formatYen(result.input.fees.monthlyFixedFeeYen)}</dd></div>
          <div><dt>年会費</dt><dd>{formatYen(result.input.fees.annualFeeYen)}／年（12分の1を加算）</dd></div>
        </dl>
      </section>

      <UsageSummary result={result} />
      <ValueEvidence result={result} />
      <CompletionOpportunityCard result={result} />
      <PriceComparison result={result} />

      <section className="method-summary" aria-labelledby="method-summary-heading">
        <h3 id="method-summary-heading">この結果で点数化していないもの</h3>
        <p>内容完了率、内容の適合、目的に沿う変化、付帯サービス、継続意向、安全上の回答を、不明な重みで一つの総合点へ足していません。回答はそれぞれ料金の根拠、価値の確認、次の行動、安全の優先順位に使っています。</p>
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
