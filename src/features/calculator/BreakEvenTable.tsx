import type { ComparisonRow, LowerSide } from '../../domain/comparison';
import { unitsToRoundedYen } from '../../domain/money';
import { formatYen } from '../../shared/format';

const lowerSideLabels: Record<LowerSide, string> = {
  current: '現在プラン',
  candidate: '候補',
  equal: '同額',
};

interface BreakEvenTableProps {
  rows: ComparisonRow[];
  boundaryVisits: number | null;
}

export function BreakEvenTable({ rows, boundaryVisits }: BreakEvenTableProps) {
  return (
    <div className="comparison-table-wrap">
      <table className="comparison-table">
        <caption className="sr-only">月0回から20回までの料金比較</caption>
        <thead>
          <tr>
            <th scope="col">月の利用回数</th>
            <th scope="col">現在プラン</th>
            <th scope="col">候補</th>
            <th scope="col">料金が低い側</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isBoundary = row.visits === boundaryVisits;
            return (
              <tr
                className={`comparison-table__row comparison-table__row--${row.lowerSide}${isBoundary ? ' comparison-table__row--boundary' : ''}`}
                key={row.visits}
              >
                <th scope="row">
                  <span>
                    月{row.visits}回
                    {isBoundary ? <span className="comparison-table__boundary-label">料金境界</span> : null}
                  </span>
                </th>
                <td data-label="現在プラン">{formatYen(unitsToRoundedYen(row.currentUnits))}</td>
                <td data-label="候補">{formatYen(unitsToRoundedYen(row.candidateUnits))}</td>
                <td data-label="料金が低い側">
                  <span className="comparison-table__label">{lowerSideLabels[row.lowerSide]}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
