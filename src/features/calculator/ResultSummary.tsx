import type { RefObject } from 'react';
import {
  getBenchmarkLabel,
  getProgressLabel,
  getReplaceabilityLabel,
  type AssessmentResult,
  type PerVisitResult,
  type PriceAssessment,
  type PriceStatus,
  type ValueAssessment,
  type ValueStatus,
} from '../../domain/assessment';
import { formatNumber, formatYen } from '../../shared/format';

interface ResultSummaryProps {
  result: AssessmentResult;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onEdit: () => void;
}

const priceStatusLabels: Record<PriceStatus, string> = {
  within: 'あなたの基準内',
  over: 'あなたの基準を超過',
  mixed: '回数によって変わる',
  insufficient: '判断材料不足',
};

const valueStatusLabels: Record<ValueStatus, string> = {
  strong: '通う価値の根拠が強い',
  mixed: '見直し余地あり',
  weak: '通う価値の根拠が弱い',
  insufficient: '判断材料不足',
};

function PerVisitEvidence({ result }: { result: PerVisitResult }) {
  if (result.kind === 'exact') {
    return result.yenPerVisit === null ? (
      <div className="evidence-box">
        <strong>先月0回のため、1回あたりは算出できません</strong>
        <p>未利用月の月額相当は{formatYen(result.unusedPaymentYen)}です。</p>
      </div>
    ) : (
      <div className="evidence-box">
        <strong>約{formatNumber(result.yenPerVisit)}円／回</strong>
        <p>月額相当を先月の{result.visits}回で割った表示値です。</p>
      </div>
    );
  }

  if (result.kind === 'bounded') {
    return (
      <div className="evidence-box">
        <strong>約{formatNumber(result.minYenPerVisit)}～{formatNumber(result.maxYenPerVisit)}円／回</strong>
        <p>月{result.minVisits}～{result.maxVisits}回の両端で計算し、中央値を実績にしていません。</p>
      </div>
    );
  }

  if (result.kind === 'at-least') {
    return (
      <div className="evidence-box">
        <strong>約{formatNumber(result.maxYenPerVisit)}円以下／回</strong>
        <p>月{result.minVisits}回で計算した上限です。</p>
      </div>
    );
  }

  return (
    <div className="scenario-table-wrap">
      <table className="scenario-table">
        <caption>実績ではなく、月の回数別に見た1回あたり料金</caption>
        <thead>
          <tr>
            <th scope="col">月の回数</th>
            <th scope="col">1回あたり</th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row) => (
            <tr key={row.visits}>
              <th scope="row">月{row.visits}回</th>
              <td>
                {row.yenPerVisit === null
                  ? `算出不可（未利用月の支払額${formatYen(row.unusedPaymentYen ?? 0)}）`
                  : formatYen(row.yenPerVisit)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getPriceReason(price: PriceAssessment): string {
  if (price.benchmark.kind === 'per-visit-limit') {
    if (price.perVisit?.kind === 'exact' && price.perVisit.visits === 0) {
      return price.monthly.units === 0
        ? '先月は0回で1回あたりを算出できないため、料金基準への結論を確定していません。'
        : '先月は0回で1回あたりを算出できず、本人上限を満たす利用実績ではありません。';
    }
    if (price.status === 'within') return '入力した回数または範囲全体で、1回あたりが本人上限以下です。';
    if (price.status === 'over') return '入力した回数または範囲全体で、1回あたりが本人上限を超えます。';
    if (price.status === 'mixed') return '入力した回数範囲の中で、本人上限以下になる場合と超える場合があります。';
    return '回数が分からないため、1回上限に対する結論は確定できません。';
  }
  if (price.benchmark.kind === 'alternative-monthly') {
    if (price.status === 'over') return '現在の月額相当は、入力した代替案より高い金額です。';
    if (price.difference?.direction === 'equal') return '現在の月額相当と、入力した代替案は同額です。';
    return '現在の月額相当は、入力した代替案以下です。';
  }
  if (price.status === 'over') return '現在の月額相当は、自分で入力した月額上限を超えています。';
  if (price.difference?.direction === 'equal') return '現在の月額相当は、自分で入力した月額上限と同額です。';
  return '現在の月額相当は、自分で入力した月額上限以下です。';
}

function DifferenceLine({ price }: { price: PriceAssessment }) {
  if (!price.difference) return null;
  if (price.difference.direction === 'equal') return <p>差額：0円（同額）</p>;
  const differenceText = price.difference.amountUnits > 0 && price.difference.amountYen === 0
    ? '1円未満'
    : formatYen(price.difference.amountYen);

  if (price.benchmark.kind === 'alternative-monthly') {
    return (
      <p>
        差額：{differenceText}（
        {price.difference.direction === 'within-by' ? '現在の方が低い' : '入力した代替案の方が低い'}）
      </p>
    );
  }
  return (
    <p>
      月額上限との差：{differenceText}（
      {price.difference.direction === 'within-by' ? '上限内' : '上限超過'}）
    </p>
  );
}

function PriceCard({ price }: { price: PriceAssessment }) {
  return (
    <section className={`axis-card axis-card--${price.status}`} aria-labelledby="price-result-heading">
      <p className="axis-card__number">判定 1</p>
      <h3 id="price-result-heading">料金の判定</h3>
      <p className="status-label">{priceStatusLabels[price.status]}</p>
      <p className="axis-card__reason">{getPriceReason(price)}</p>

      <dl className="fact-list">
        <div>
          <dt>現在の月額相当</dt>
          <dd>{formatYen(price.monthly.roundedYen)}</dd>
        </div>
        <div>
          <dt>選んだ基準</dt>
          <dd>{getBenchmarkLabel(price.benchmark.kind)}：{formatYen(price.benchmark.amountYen)}</dd>
        </div>
      </dl>
      <DifferenceLine price={price} />

      <div className="fee-breakdown">
        <h4>月額相当に含めた費用</h4>
        <dl>
          <div><dt>月会費</dt><dd>{formatYen(price.monthly.fees.monthlyFeeYen)}</dd></div>
          <div><dt>毎月の必須固定費</dt><dd>{formatYen(price.monthly.fees.monthlyFixedFeeYen)}</dd></div>
          <div>
            <dt>年会費</dt>
            <dd>{formatYen(price.monthly.fees.annualFeeYen)}／年（12分の1を加算）</dd>
          </div>
        </dl>
      </div>

      {price.perVisit ? <PerVisitEvidence result={price.perVisit} /> : null}
      {price.benchmark.kind === 'per-visit-limit' && price.requiredVisits !== null ? (
        <div className="required-visits">
          <strong>
            料金上は月{price.requiredVisits}回で、1回上限以下になる計算です
          </strong>
          <p>この回数は料金だけの計算値です。その回数まで来館するよう勧めるものではありません。</p>
        </div>
      ) : null}

      {price.hasRoundedBoundaryDifference ? (
        <p className="rounding-warning">表示上は同じ円額ですが、判定は丸め前の値で行っています。</p>
      ) : null}
      <p className="calculation-note">判定は1/12円単位の値で行い、表示時だけ1円へ四捨五入しています。</p>
    </section>
  );
}

function getValueReason(value: ValueAssessment): string {
  if (value.status === 'strong') {
    return '入会目的を実現でき、同じ目的を他で代替しにくい、または代替に手間があるという入力です。';
  }
  if (value.status === 'weak') {
    return '入会目的をほとんど実現できず、同じ目的を他でも代替できるという入力です。';
  }
  if (value.status === 'insufficient') {
    return '目的の達成度または代替しにくさが「分からない」のため、結論を確定していません。';
  }
  if (value.progress === 'achieved') {
    return '入会目的は実現できていますが、同じ目的を他でも代替しやすいという入力です。';
  }
  if (value.progress === 'partly') {
    return `入会目的は一部実現できています。他での代替は「${getReplaceabilityLabel(value.replaceability)}」という入力です。`;
  }
  return '入会目的はほとんど実現できていませんが、同じ目的を他では代替しにくいという入力です。';
}

function ValueCard({ value }: { value: ValueAssessment }) {
  return (
    <section className={`axis-card axis-card--${value.status}`} aria-labelledby="value-result-heading">
      <p className="axis-card__number">判定 2</p>
      <h3 id="value-result-heading">利用価値の判定</h3>
      <p className="status-label">{valueStatusLabels[value.status]}</p>
      <p className="axis-card__reason">{getValueReason(value)}</p>
      <dl className="fact-list">
        <div>
          <dt>主な入会目的</dt>
          <dd>{value.purposeLabel}</dd>
        </div>
        <div>
          <dt>先月の達成度</dt>
          <dd>{getProgressLabel(value.progress)}</dd>
        </div>
        <div>
          <dt>他での代替</dt>
          <dd>{getReplaceabilityLabel(value.replaceability)}</dd>
        </div>
      </dl>
      <p className="calculation-note">目的の種類、設備数、滞在時間を点数や金額へ変換していません。</p>
    </section>
  );
}

export function ResultSummary({ result, headingRef, onEdit }: ResultSummaryProps) {
  return (
    <section className="result" aria-labelledby="result-heading">
      <div className="result__heading-row">
        <p className="eyebrow">本人基準による2軸判定</p>
        <h2 id="result-heading" ref={headingRef} tabIndex={-1}>会費の見直し結果</h2>
      </div>

      <section className={`overall-result overall-result--${result.overall.kind}`} aria-labelledby="overall-heading">
        <p className="eyebrow">今回の入力から分かること</p>
        <h3 id="overall-heading">{result.overall.headline}</h3>
        <p>全国共通の相場や総合点ではなく、入力した料金基準と入会目的から出した結果です。</p>
      </section>

      <div className="axis-grid">
        <PriceCard price={result.price} />
        <ValueCard value={result.value} />
      </div>

      <details className="rule-details">
        <summary>利用価値の判定ルール</summary>
        <ul>
          <li>目的を実現でき、代替しにくい・代替に手間がある：根拠が強い</li>
          <li>目的をほとんど実現できず、代替に手間がある・代替しやすい：根拠が弱い</li>
          <li>既知の回答が上のどちらにも揃わない：見直し余地あり</li>
          <li>達成度または代替しにくさが分からない：判断材料不足</li>
        </ul>
      </details>

      <section className="official-check" aria-labelledby="official-check-heading">
        <h3 id="official-check-heading">契約を変える前に公式条件を確認してください</h3>
        <p>料金、必須費用、利用可能時間、サービス内容、休会・変更・退会期限は契約先の最新情報で確認してください。</p>
        {result.price.benchmark.kind === 'alternative-monthly' ? (
          <p>代替案は入力した月額だけを比較しています。設備、距離、営業時間、違約金等が同等とは判定していません。</p>
        ) : null}
      </section>

      <div className="result__actions">
        <button className="button button--primary" type="button" onClick={onEdit}>入力を修正</button>
      </div>
    </section>
  );
}
