import type { RefObject } from 'react';
import type { G1Result } from '../../domain/comparison';
import { unitsToRoundedYen } from '../../domain/money';
import { formatNumber, formatYen } from '../../shared/format';
import { BreakEvenTable } from './BreakEvenTable';
import { createAnnualComparisonText, createThreeMonthComparisonText } from './result-copy';

interface ResultSummaryProps {
  result: G1Result;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onEditCandidate: () => void;
  onEditCurrent: () => void;
}

export function ResultSummary({ result, headingRef, onEditCandidate, onEditCurrent }: ResultSummaryProps) {
  const currentThreeMonth = unitsToRoundedYen(result.current.threeMonthUnits);
  const candidateThreeMonth = unitsToRoundedYen(result.candidate.threeMonthUnits);

  return (
    <section className="result" aria-labelledby="result-heading">
      <div className="result__heading-row">
        <p className="eyebrow">料金比較</p>
        <h2 id="result-heading" ref={headingRef} tabIndex={-1}>
          比較結果
        </h2>
      </div>

      <div className="result__usage">
        {result.visitsTotal === 0 ? (
          <>
            <p className="result__usage-main">直近3か月の利用は0回でした。</p>
            <p>{`1回あたり費用は算出できません。利用がなかった3か月の支払額は${formatYen(currentThreeMonth)}です。`}</p>
          </>
        ) : (
          <>
            <p className="result__usage-main">
              直近3か月は合計{result.visitsTotal}回、平均{result.visitsAverage.toFixed(1)}回／月でした。
            </p>
            <p>{`現在プランの支払額は、1回あたり約${formatNumber(result.current.perVisitYen ?? 0)}円です。`}</p>
          </>
        )}
      </div>

      <div className="result__verdict">
        <p>{createAnnualComparisonText(result.annualComparison)}</p>
        <span>費用以外の価値は判定していません</span>
      </div>

      <section className="result-section" aria-labelledby="breakdown-heading">
        <div className="section-heading">
          <p className="eyebrow">内訳</p>
          <h3 id="breakdown-heading">直近3か月と年間予測</h3>
          <p>{createThreeMonthComparisonText(result.threeMonthComparison)}</p>
        </div>
        <div className="cost-grid">
          <article>
            <h4>現在プラン</h4>
            <dl>
              <div>
                <dt>直近3か月</dt>
                <dd>{formatYen(currentThreeMonth)}</dd>
              </div>
              <div>
                <dt>3か月平均月額</dt>
                <dd>{formatYen(unitsToRoundedYen(result.current.monthlyAverageUnits))}</dd>
              </div>
              <div>
                <dt>年間予測</dt>
                <dd>{formatYen(unitsToRoundedYen(result.current.annualUnits))}</dd>
              </div>
            </dl>
          </article>
          <article>
            <h4>都度払い候補</h4>
            <dl>
              <div>
                <dt>直近3か月</dt>
                <dd>{formatYen(candidateThreeMonth)}</dd>
              </div>
              <div>
                <dt>3か月平均月額</dt>
                <dd>{formatYen(unitsToRoundedYen(result.candidate.monthlyAverageUnits))}</dd>
              </div>
              <div>
                <dt>年間予測</dt>
                <dd>{formatYen(unitsToRoundedYen(result.candidate.annualUnits))}</dd>
              </div>
            </dl>
          </article>
        </div>
      </section>

      <section className="result-section" aria-labelledby="boundary-heading">
        <div className="section-heading">
          <p className="eyebrow">利用回数ごとの比較</p>
          <h3 id="boundary-heading">月何回で料金の低い側が変わるか</h3>
          <p className="boundary-message">{result.boundary.message}</p>
        </div>
        <details open>
          <summary>月0～20回の料金表</summary>
          <BreakEvenTable rows={result.rows} boundaryVisits={result.boundary.boundaryVisits} />
        </details>
      </section>

      <section className="assumptions" aria-labelledby="assumptions-heading">
        <h3 id="assumptions-heading">この試算に含めたもの・含めないもの</h3>
        <div className="assumptions__grid">
          <div>
            <h4>含めた料金</h4>
            <ul>
              <li>現在の月会費</li>
              <li>候補の1回料金</li>
            </ul>
          </div>
          <div>
            <h4>含めていない条件</h4>
            <ul>
              <li>年会費、オプション、一時費用</li>
              <li>キャンペーン、日割り、値上げ</li>
              <li>健康効果、設備、混雑、通いやすさ</li>
            </ul>
          </div>
        </div>
        <div className="official-check">
          <p>
            これは入力した料金だけの試算です。健康効果、設備、混雑、距離、通いやすさ、キャンペーン、日割り、値上げ、違約金、退会期限は自動判定していません。
          </p>
          <p>契約変更の前に、契約先の最新料金と条件を公式情報で確認してください。</p>
          <p>年間予測は、直近3か月の各月の利用回数が同じパターンで続く仮定です。</p>
        </div>
      </section>

      <div className="result__actions">
        <button className="button button--primary" type="button" onClick={onEditCandidate}>
          都度料金を修正
        </button>
        <button className="button button--secondary" type="button" onClick={onEditCurrent}>
          現在の料金・回数を修正
        </button>
      </div>
    </section>
  );
}
