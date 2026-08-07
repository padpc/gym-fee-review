import { perVisitRoundedYen, unitsToRoundedYen, yenToUnits } from './money';
import type { ValidatedG1Inputs } from './validation';

export type LowerSide = 'current' | 'candidate' | 'equal';

export interface MoneyComparison {
  lowerSide: LowerSide;
  differenceUnits: number;
  differenceYen: number;
}

export interface PlanCosts {
  threeMonthUnits: number;
  monthlyAverageUnits: number;
  annualUnits: number;
}

export interface CurrentPlanCosts extends PlanCosts {
  perVisitYen: number | null;
}

export interface ComparisonRow {
  visits: number;
  currentUnits: number;
  candidateUnits: number;
  lowerSide: LowerSide;
}

export interface BoundaryResult {
  kind: 'switch-between' | 'switch-at-equal' | 'candidate-only' | 'all-equal';
  message: string;
  boundaryVisits: number | null;
}

export interface G1Result {
  visitsTotal: number;
  visitsAverage: number;
  current: CurrentPlanCosts;
  candidate: PlanCosts;
  threeMonthComparison: MoneyComparison;
  annualComparison: MoneyComparison;
  rows: ComparisonRow[];
  boundary: BoundaryResult;
}

export function compareCosts(currentUnits: number, candidateUnits: number): MoneyComparison {
  if (currentUnits === candidateUnits) {
    return { lowerSide: 'equal', differenceUnits: 0, differenceYen: 0 };
  }
  const differenceUnits = Math.abs(candidateUnits - currentUnits);
  return {
    lowerSide: currentUnits < candidateUnits ? 'current' : 'candidate',
    differenceUnits,
    differenceYen: unitsToRoundedYen(differenceUnits),
  };
}

function createBoundary(rows: ComparisonRow[]): BoundaryResult {
  if (rows.every((row) => row.lowerSide === 'equal')) {
    return { kind: 'all-equal', message: '月0～20回では料金は同額です。', boundaryVisits: null };
  }

  const firstCurrentIndex = rows.findIndex((row) => row.lowerSide === 'current');
  if (firstCurrentIndex === -1) {
    const lastRow = rows.at(-1);
    if (lastRow?.lowerSide === 'equal') {
      return {
        kind: 'switch-at-equal',
        message: `月${lastRow.visits}回で同額です。`,
        boundaryVisits: lastRow.visits,
      };
    }
    return {
      kind: 'candidate-only',
      message: '月0～20回では候補の料金が低いままです。',
      boundaryVisits: null,
    };
  }

  const previous = rows[firstCurrentIndex - 1];
  if (previous?.lowerSide === 'equal') {
    return {
      kind: 'switch-at-equal',
      message: `月${previous.visits}回で同額、月${rows[firstCurrentIndex].visits}回から現在プランの料金が低くなります。`,
      boundaryVisits: previous.visits,
    };
  }

  return {
    kind: 'switch-between',
    message: `月${rows[firstCurrentIndex].visits}回から現在プランの料金が低くなります。`,
    boundaryVisits: rows[firstCurrentIndex].visits,
  };
}

export function calculateG1Result(input: ValidatedG1Inputs): G1Result {
  const visitsTotal = input.visits.reduce((sum, visits) => sum + visits, 0);
  const visitsAverage = Math.round((visitsTotal * 10) / 3) / 10;
  const currentMonthlyUnits = yenToUnits(input.currentMonthlyFeeYen);
  const dropInUnits = yenToUnits(input.dropInFeeYen);
  const currentThreeMonthUnits = currentMonthlyUnits * 3;
  const candidateThreeMonthUnits = dropInUnits * visitsTotal;

  const current: CurrentPlanCosts = {
    threeMonthUnits: currentThreeMonthUnits,
    monthlyAverageUnits: currentThreeMonthUnits / 3,
    annualUnits: currentThreeMonthUnits * 4,
    perVisitYen: perVisitRoundedYen(currentThreeMonthUnits, visitsTotal),
  };
  const candidate: PlanCosts = {
    threeMonthUnits: candidateThreeMonthUnits,
    monthlyAverageUnits: candidateThreeMonthUnits / 3,
    annualUnits: candidateThreeMonthUnits * 4,
  };

  const rows = Array.from({ length: 21 }, (_, visits): ComparisonRow => {
    const candidateUnits = dropInUnits * visits;
    return {
      visits,
      currentUnits: currentMonthlyUnits,
      candidateUnits,
      lowerSide: compareCosts(currentMonthlyUnits, candidateUnits).lowerSide,
    };
  });

  return {
    visitsTotal,
    visitsAverage,
    current,
    candidate,
    threeMonthComparison: compareCosts(current.threeMonthUnits, candidate.threeMonthUnits),
    annualComparison: compareCosts(current.annualUnits, candidate.annualUnits),
    rows,
    boundary: createBoundary(rows),
  };
}
