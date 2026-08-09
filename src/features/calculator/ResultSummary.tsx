import type { RefObject } from 'react';
import {
  getCriterionLabel,
  type PerHourResult,
  type PerVisitResult,
  type ReviewResult,
} from '../../domain/review';
import { formatNumber, formatYen } from '../../shared/format';

interface ResultSummaryProps {
  result: ReviewResult;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onEdit: () => void;
  onChangeCriterion: () => void;
}

function formatDuration(minutes: number): string {
  if (minutes === 0) return '0分';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours}時間`;
  if (hours === 0) return `${remainingMinutes}分`;
  return `${hours}時間${remainingMinutes}分`;
}

function formatDurationRange(minMinutes: number, maxMinutes: number): string {
  if (minMinutes % 60 === 0 && maxMinutes % 60 === 0) {
    return `${minMinutes / 60}～${maxMinutes / 60}時間`;
  }
  if (minMinutes < 60 && maxMinutes < 60) return `${minMinutes}～${maxMinutes}分`;
  return `${formatDuration(minMinutes)}～${formatDuration(maxMinutes)}`;
}

function VisitKnowledgeLabel({ result }: { result: ReviewResult }) {
  const visits = result.visits;
  if (!visits) return null;
  if (visits.kind === 'exact') return <p className="method-label">先月実数（{visits.visits}回）</p>;
  if (visits.kind === 'bounded') {
    return <p className="method-label">概数（月{visits.min}～{visits.max}回）</p>;
  }
  if (visits.kind === 'at-least') return <p className="method-label">概数（月{visits.min}回以上）</p>;
  return <p className="method-label">回数不明</p>;
}

function PerVisitSection({ result }: { result: PerVisitResult }) {
  return (
    <section className="result-section" aria-labelledby="per-visit-heading">
      <div className="section-heading">
        <p className="eyebrow">料金の見え方</p>
        <h3 id="per-visit-heading">1回あたり</h3>
      </div>
      {result.kind === 'exact' && result.yenPerVisit === null ? (
        <div className="metric-card metric-card--neutral">
          <strong>1回あたりは算出できません</strong>
          <p>先月は0回でした。未利用月の月額相当は{formatYen(result.unusedPaymentYen)}です。</p>
        </div>
      ) : null}
      {result.kind === 'exact' && result.yenPerVisit !== null ? (
        <div className="metric-card">
          <strong>約{formatNumber(result.yenPerVisit)}円／回</strong>
          <p>月額相当 ÷ 先月の{result.visits}回。表示時に1円へ四捨五入しています。</p>
        </div>
      ) : null}
      {result.kind === 'bounded' ? (
        <div className="metric-card">
          <strong>約{formatNumber(result.minYenPerVisit)}～{formatNumber(result.maxYenPerVisit)}円／回</strong>
          <p>月{result.minVisits}～{result.maxVisits}回の両端で計算した範囲です。中央値を実績として扱っていません。</p>
        </div>
      ) : null}
      {result.kind === 'at-least' ? (
        <div className="metric-card">
          <strong>約{formatNumber(result.maxYenPerVisit)}円以下／回</strong>
          <p>月{result.minVisits}回で計算した上限です。実際の回数が多いほど単価は下がります。</p>
        </div>
      ) : null}
      {result.kind === 'unknown' ? (
        <div>
          <p className="result-note">実績ではありません。回数別の目安です。</p>
          <div className="scenario-table-wrap">
            <table className="scenario-table">
              <caption>月の回数別・1回あたり料金の目安</caption>
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
        </div>
      ) : null}
    </section>
  );
}

function PerHourSection({ result }: { result: PerHourResult }) {
  return (
    <section className="result-section" aria-labelledby="per-hour-heading">
      <div className="section-heading">
        <p className="eyebrow">滞在時間から確認</p>
        <h3 id="per-hour-heading">1時間あたり</h3>
      </div>
      {result.kind === 'total' ? (
        <div className="metric-card">
          <strong>約{formatNumber(result.yenPerHour)}円／時間</strong>
          <p>先月の合計滞在時間：{formatDuration(result.totalMinutes)}</p>
        </div>
      ) : null}
      {result.kind === 'exact' && result.yenPerHour === null ? (
        <div className="metric-card metric-card--neutral">
          <strong>1時間あたりは算出できません</strong>
          <p>先月0回のため、平均滞在時間から合計時間を算出できません。</p>
        </div>
      ) : null}
      {result.kind === 'exact' && result.yenPerHour !== null ? (
        <div className="metric-card">
          <strong>約{formatNumber(result.yenPerHour)}円／時間</strong>
          <p>平均{result.averageMinutes}分 × {result.visits}回 ＝ {formatDuration(result.totalMinutes)}</p>
        </div>
      ) : null}
      {result.kind === 'bounded' ? (
        <div className="metric-card">
          <strong>約{formatNumber(result.minYenPerHour)}～{formatNumber(result.maxYenPerHour)}円／時間</strong>
          <p>合計滞在時間の目安：{formatDurationRange(result.minTotalMinutes, result.maxTotalMinutes)}</p>
          <p>回数範囲の両端で計算し、中央値へ丸めていません。</p>
        </div>
      ) : null}
      {result.kind === 'at-least' ? (
        <div className="metric-card">
          <strong>約{formatNumber(result.maxYenPerHour)}円以下／時間</strong>
          <p>合計滞在時間は{formatDuration(result.minTotalMinutes)}以上の目安です。</p>
        </div>
      ) : null}
      {result.kind === 'unknown' ? (
        <div>
          <p className="result-note">実績ではありません。平均{result.averageMinutes}分として回数別に計算しています。</p>
          <div className="scenario-table-wrap">
            <table className="scenario-table">
              <caption>月の回数別・1時間あたり料金の目安</caption>
              <thead>
                <tr>
                  <th scope="col">月の回数</th>
                  <th scope="col">合計滞在</th>
                  <th scope="col">1時間あたり</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={row.visits}>
                    <th scope="row">月{row.visits}回</th>
                    <td>{formatDuration(row.totalMinutes)}</td>
                    <td>{row.yenPerHour === null ? '算出不可' : formatYen(row.yenPerHour)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      <p className="scope-note">ここで使うのは滞在時間であり、運動時間や健康効果の評価ではありません。</p>
    </section>
  );
}

export function ResultSummary({ result, headingRef, onEdit, onChangeCriterion }: ResultSummaryProps) {
  return (
    <section className="result" aria-labelledby="result-heading">
      <div className="result__heading-row">
        <p className="eyebrow">基準ごとに分けて表示</p>
        <h2 id="result-heading" ref={headingRef} tabIndex={-1}>会費の見え方</h2>
        <p>{getCriterionLabel(result.criterion)}</p>
        <VisitKnowledgeLabel result={result} />
      </div>

      <section className="monthly-summary" aria-labelledby="monthly-summary-heading">
        <div>
          <p className="eyebrow">共通の計算元</p>
          <h3 id="monthly-summary-heading">月額相当</h3>
        </div>
        <strong>{formatYen(result.monthly.roundedYen)}</strong>
        <p>月会費、毎月必須の固定費、年会費等の12分の1を含めた金額です。</p>
      </section>

      {result.perVisit ? <PerVisitSection result={result.perVisit} /> : null}
      {result.perHour ? <PerHourSection result={result.perHour} /> : null}

      {result.services ? (
        <section className="result-section" aria-labelledby="services-result-heading">
          <div className="section-heading">
            <p className="eyebrow">利用と重要性は別表示</p>
            <h3 id="services-result-heading">設備・プログラム</h3>
          </div>
          <div className="review-list-grid">
            <section aria-labelledby="used-services-heading">
              <h4 id="used-services-heading">そのひと月に使ったもの</h4>
              {result.services.used.length ? (
                <ul>{result.services.used.map((item) => <li key={item.id}>{item.label}：{item.frequencyLabel}</li>)}</ul>
              ) : <p>選択された設備はありません。未選択を「価値なし」とは判定しません。</p>}
            </section>
            <section aria-labelledby="important-services-heading">
              <h4 id="important-services-heading">会費を払う理由として重要なもの</h4>
              {result.services.important.length ? (
                <ul>{result.services.important.map((item) => <li key={item.id}>{item.label}</li>)}</ul>
              ) : <p>選択された項目はありません。重要なものがないとは判定しません。</p>}
            </section>
          </div>
          {result.services.importantButUnused.length ? (
            <div className="important-unused">
              <p>重要だが、そのひと月は使っていないもの</p>
              <ul>{result.services.importantButUnused.map((item) => <li key={item.id}>{item.label}</li>)}</ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {result.continuation ? (
        <section className="result-section" aria-labelledby="continuation-result-heading">
          <div className="section-heading">
            <p className="eyebrow">金額へ換算しない確認</p>
            <h3 id="continuation-result-heading">料金以外で失いたくない条件</h3>
          </div>
          {result.continuation.length ? (
            <ul className="continuation-result-list">
              {result.continuation.map((item) => <li key={item.id}>{item.label}</li>)}
            </ul>
          ) : <p>選択された条件はありません。続けやすさがないとは判定しません。</p>}
        </section>
      ) : null}

      <section className="official-check" aria-labelledby="official-check-heading">
        <h3 id="official-check-heading">最後は公式条件を確認してください</h3>
        <p>この結果は入力内容を基準別に整理したものです。一つの評価へまとめたり、継続・休会・退会を自動で勧めたりしません。</p>
        <p>料金、利用可能時間、休会・変更・退会期限は契約先の最新情報で確認してください。</p>
      </section>

      <div className="result__actions">
        <button className="button button--primary" type="button" onClick={onEdit}>入力を修正</button>
        <button className="button button--secondary" type="button" onClick={onChangeCriterion}>基準を選び直す</button>
      </div>
    </section>
  );
}
