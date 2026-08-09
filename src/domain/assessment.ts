import { perVisitRoundedYen, unitsToRoundedYen, yenToUnits } from './money';

export type VisitMode = 'exact' | 'range' | 'unknown';

export const visitBandOptions = [
  { id: 'monthly-1-3', label: '月1～3回', min: 1, max: 3 },
  { id: 'weekly-1', label: '週1回前後（月4～6回）', min: 4, max: 6 },
  { id: 'weekly-2', label: '週2回前後（月7～10回）', min: 7, max: 10 },
  { id: 'weekly-3', label: '週3回前後（月11～14回）', min: 11, max: 14 },
  { id: 'weekly-4', label: '週4回前後（月15～20回）', min: 15, max: 20 },
  { id: 'monthly-21-plus', label: '月21回以上', min: 21, max: null },
] as const;

export type VisitBandId = (typeof visitBandOptions)[number]['id'];

export type VisitKnowledge =
  | { kind: 'exact'; visits: number }
  | { kind: 'bounded'; bandId: VisitBandId; min: number; max: number }
  | { kind: 'at-least'; bandId: 'monthly-21-plus'; min: 21 }
  | { kind: 'unknown' };

export const unknownVisitScenarios = [0, 1, 2, 4, 6, 8, 10, 12, 16, 20] as const;

export interface FeeValues {
  monthlyFeeYen: number;
  monthlyFixedFeeYen: number;
  annualFeeYen: number;
}

export interface MonthlyEquivalent {
  units: number;
  roundedYen: number;
}

export type PriceBenchmarkKind = 'monthly-limit' | 'per-visit-limit' | 'alternative-monthly';

export type PriceBenchmark =
  | { kind: 'monthly-limit'; amountYen: number }
  | { kind: 'per-visit-limit'; amountYen: number }
  | { kind: 'alternative-monthly'; amountYen: number };

export const priceBenchmarkOptions: ReadonlyArray<{
  id: PriceBenchmarkKind;
  label: string;
  description: string;
}> = [
  {
    id: 'monthly-limit',
    label: '月会費は月いくらまでなら納得できるか',
    description: '自分の家計や優先順位から決めた月額上限と比べます',
  },
  {
    id: 'per-visit-limit',
    label: '1回あたりいくらまでなら納得できるか',
    description: '先月の回数または頻度範囲から本人の上限と比べます',
  },
  {
    id: 'alternative-monthly',
    label: '実際に検討できる代替案はいくらか',
    description: '候補にできる別プランや別施設の月額相当と比べます',
  },
];

export const purposeOptions = [
  { id: 'strength-training', label: 'マシン・筋力トレーニング' },
  { id: 'classes', label: 'スタジオ・グループレッスン' },
  { id: 'pool', label: 'プール' },
  { id: 'bath-sauna', label: '風呂・サウナ' },
  { id: 'support', label: 'トレーナー・スタッフの支援' },
  { id: 'convenience', label: '24時間・複数店舗・通いやすさ' },
  { id: 'exercise-habit', label: '運動習慣を保つ場所' },
  { id: 'other', label: 'その他' },
] as const;

export type PurposeId = (typeof purposeOptions)[number]['id'];
export type PurposeProgress = 'achieved' | 'partly' | 'hardly' | 'unknown';
export type Replaceability = 'hard' | 'possible' | 'easy' | 'unknown';

export const purposeProgressOptions: ReadonlyArray<{ id: PurposeProgress; label: string }> = [
  { id: 'achieved', label: 'できた' },
  { id: 'partly', label: '一部できた' },
  { id: 'hardly', label: 'ほとんどできなかった' },
  { id: 'unknown', label: '分からない' },
];

export const replaceabilityOptions: ReadonlyArray<{ id: Replaceability; label: string }> = [
  { id: 'hard', label: '代替しにくい' },
  { id: 'possible', label: '代替できるが手間がある' },
  { id: 'easy', label: '代替しやすい' },
  { id: 'unknown', label: '分からない' },
];

export type PerVisitResult =
  | { kind: 'exact'; visits: number; yenPerVisit: number | null; unusedPaymentYen: number }
  | {
      kind: 'bounded';
      bandId: VisitBandId;
      minVisits: number;
      maxVisits: number;
      minYenPerVisit: number;
      maxYenPerVisit: number;
    }
  | { kind: 'at-least'; bandId: 'monthly-21-plus'; minVisits: 21; maxYenPerVisit: number }
  | {
      kind: 'unknown';
      rows: Array<{ visits: number; yenPerVisit: number | null; unusedPaymentYen: number | null }>;
    };

export type PriceStatus = 'within' | 'over' | 'mixed' | 'insufficient';
export type DifferenceDirection = 'within-by' | 'over-by' | 'equal';

export interface PriceAssessment {
  status: PriceStatus;
  monthly: MonthlyEquivalent & { fees: FeeValues };
  benchmark: PriceBenchmark;
  difference: { direction: DifferenceDirection; amountUnits: number; amountYen: number } | null;
  requiredVisits: number | null;
  perVisit: PerVisitResult | null;
  hasRoundedBoundaryDifference: boolean;
}

export type ValueStatus = 'strong' | 'mixed' | 'weak' | 'insufficient';

export interface ValueAssessment {
  status: ValueStatus;
  purpose: PurposeId;
  purposeLabel: string;
  progress: PurposeProgress;
  replaceability: Replaceability;
}

export type OverallKind =
  | 'both-supported'
  | 'value-review'
  | 'price-review-value-strong'
  | 'price-review'
  | 'both-review'
  | 'inconclusive';

export interface OverallAssessment {
  kind: OverallKind;
  headline: string;
}

export interface ValidatedAssessmentInput {
  fees: FeeValues;
  visits: VisitKnowledge | null;
  benchmark: PriceBenchmark;
  purpose: PurposeId;
  purposeProgress: PurposeProgress;
  replaceability: Replaceability;
}

export interface AssessmentResult {
  input: ValidatedAssessmentInput;
  price: PriceAssessment;
  value: ValueAssessment;
  overall: OverallAssessment;
}

export function calculateMonthlyEquivalent(fees: FeeValues): MonthlyEquivalent {
  const units = yenToUnits(fees.monthlyFeeYen + fees.monthlyFixedFeeYen) + fees.annualFeeYen;
  return { units, roundedYen: unitsToRoundedYen(units) };
}

export function calculatePerVisitResult(monthlyUnits: number, visits: VisitKnowledge): PerVisitResult {
  if (visits.kind === 'exact') {
    return {
      kind: 'exact',
      visits: visits.visits,
      yenPerVisit: perVisitRoundedYen(monthlyUnits, visits.visits),
      unusedPaymentYen: unitsToRoundedYen(monthlyUnits),
    };
  }
  if (visits.kind === 'bounded') {
    return {
      kind: 'bounded',
      bandId: visits.bandId,
      minVisits: visits.min,
      maxVisits: visits.max,
      minYenPerVisit: perVisitRoundedYen(monthlyUnits, visits.max) ?? 0,
      maxYenPerVisit: perVisitRoundedYen(monthlyUnits, visits.min) ?? 0,
    };
  }
  if (visits.kind === 'at-least') {
    return {
      kind: 'at-least',
      bandId: visits.bandId,
      minVisits: visits.min,
      maxYenPerVisit: perVisitRoundedYen(monthlyUnits, visits.min) ?? 0,
    };
  }
  return {
    kind: 'unknown',
    rows: unknownVisitScenarios.map((scenarioVisits) => ({
      visits: scenarioVisits,
      yenPerVisit: perVisitRoundedYen(monthlyUnits, scenarioVisits),
      unusedPaymentYen: scenarioVisits === 0 ? unitsToRoundedYen(monthlyUnits) : null,
    })),
  };
}

function compareMonthlyUnits(monthlyUnits: number, benchmarkUnits: number) {
  if (monthlyUnits === benchmarkUnits) {
    return {
      status: 'within' as const,
      difference: { direction: 'equal' as const, amountUnits: 0, amountYen: 0 },
    };
  }
  const monthlyIsLower = monthlyUnits < benchmarkUnits;
  return {
    status: monthlyIsLower ? ('within' as const) : ('over' as const),
    difference: {
      direction: monthlyIsLower ? ('within-by' as const) : ('over-by' as const),
      amountUnits: Math.abs(monthlyUnits - benchmarkUnits),
      amountYen: unitsToRoundedYen(Math.abs(monthlyUnits - benchmarkUnits)),
    },
  };
}

function calculateRequiredVisits(monthlyUnits: number, limitYen: number): number {
  if (!Number.isSafeInteger(limitYen) || limitYen <= 0) {
    throw new RangeError('per-visit limit must be a positive safe integer.');
  }
  if (monthlyUnits === 0) return 1;
  return Math.ceil(monthlyUnits / yenToUnits(limitYen));
}

export function assessPrice(
  fees: FeeValues,
  visits: VisitKnowledge | null,
  benchmark: PriceBenchmark,
): PriceAssessment {
  const monthlyEquivalent = calculateMonthlyEquivalent(fees);
  const monthly = { ...monthlyEquivalent, fees };
  const perVisit = visits ? calculatePerVisitResult(monthly.units, visits) : null;

  if (benchmark.kind === 'monthly-limit' || benchmark.kind === 'alternative-monthly') {
    const benchmarkUnits = yenToUnits(benchmark.amountYen);
    const comparison = compareMonthlyUnits(monthly.units, benchmarkUnits);
    return {
      ...comparison,
      monthly,
      benchmark,
      requiredVisits: null,
      perVisit,
      hasRoundedBoundaryDifference:
        monthly.roundedYen === benchmark.amountYen && monthly.units !== benchmarkUnits,
    };
  }

  if (!visits || !perVisit) {
    throw new RangeError('visit knowledge is required for a per-visit benchmark.');
  }

  const requiredVisits = calculateRequiredVisits(monthly.units, benchmark.amountYen);
  const limitUnits = yenToUnits(benchmark.amountYen);
  let status: PriceStatus;

  if (visits.kind === 'exact') {
    if (visits.visits === 0) status = monthly.units === 0 ? 'insufficient' : 'over';
    else status = monthly.units <= limitUnits * visits.visits ? 'within' : 'over';
  } else if (visits.kind === 'bounded') {
    if (monthly.units <= limitUnits * visits.min) status = 'within';
    else if (monthly.units > limitUnits * visits.max) status = 'over';
    else status = 'mixed';
  } else if (visits.kind === 'at-least') {
    status = monthly.units <= limitUnits * visits.min ? 'within' : 'mixed';
  } else {
    status = 'insufficient';
  }

  const isRoundedBoundaryDifference = (scenarioVisits: number, roundedYen: number | null) =>
    scenarioVisits > 0
    && roundedYen === benchmark.amountYen
    && monthly.units !== limitUnits * scenarioVisits;
  let hasRoundedBoundaryDifference: boolean;
  if (perVisit.kind === 'exact') {
    hasRoundedBoundaryDifference = isRoundedBoundaryDifference(
      perVisit.visits,
      perVisit.yenPerVisit,
    );
  } else if (perVisit.kind === 'bounded') {
    hasRoundedBoundaryDifference = isRoundedBoundaryDifference(
      perVisit.minVisits,
      perVisit.maxYenPerVisit,
    ) || isRoundedBoundaryDifference(perVisit.maxVisits, perVisit.minYenPerVisit);
  } else if (perVisit.kind === 'at-least') {
    hasRoundedBoundaryDifference = isRoundedBoundaryDifference(
      perVisit.minVisits,
      perVisit.maxYenPerVisit,
    );
  } else {
    hasRoundedBoundaryDifference = perVisit.rows.some((row) =>
      isRoundedBoundaryDifference(row.visits, row.yenPerVisit),
    );
  }

  return {
    status,
    monthly,
    benchmark,
    difference: null,
    requiredVisits,
    perVisit,
    hasRoundedBoundaryDifference,
  };
}

export function assessValue(
  purpose: PurposeId,
  progress: PurposeProgress,
  replaceability: Replaceability,
): ValueAssessment {
  let status: ValueStatus;
  if (progress === 'unknown' || replaceability === 'unknown') {
    status = 'insufficient';
  } else if (progress === 'achieved' && (replaceability === 'hard' || replaceability === 'possible')) {
    status = 'strong';
  } else if (progress === 'hardly' && (replaceability === 'possible' || replaceability === 'easy')) {
    status = 'weak';
  } else {
    status = 'mixed';
  }

  return {
    status,
    purpose,
    purposeLabel: purposeOptions.find((option) => option.id === purpose)?.label ?? purpose,
    progress,
    replaceability,
  };
}

export function buildOverallAssessment(
  priceStatus: PriceStatus,
  valueStatus: ValueStatus,
): OverallAssessment {
  if (priceStatus === 'mixed' || priceStatus === 'insufficient' || valueStatus === 'insufficient') {
    const priceClause = priceStatus === 'mixed'
      ? '料金は利用回数によって基準内か超過かが変わります'
      : priceStatus === 'insufficient'
        ? '料金は判断材料が不足しています'
        : priceStatus === 'within'
          ? '料金はあなたの基準内です'
          : '料金はあなたの基準を超えています';
    const valueClause = valueStatus === 'strong'
      ? '通う価値の根拠は強い状態です'
      : valueStatus === 'mixed'
        ? '通う価値には見直し余地があります'
        : valueStatus === 'weak'
          ? 'この入力では通う価値の根拠が弱い状態です'
          : '通う価値は判断材料が不足しています';
    return { kind: 'inconclusive', headline: `${priceClause}。${valueClause}` };
  }
  if (priceStatus === 'within' && valueStatus === 'strong') {
    return {
      kind: 'both-supported',
      headline: 'あなたの基準では、料金にも利用価値にも納得しやすい状態です',
    };
  }
  if (priceStatus === 'within') {
    return {
      kind: 'value-review',
      headline: '料金は基準内ですが、通う価値には見直し余地があります',
    };
  }
  if (valueStatus === 'strong') {
    return {
      kind: 'price-review-value-strong',
      headline: '通う価値の根拠はありますが、料金は基準を超えています',
    };
  }
  if (valueStatus === 'weak') {
    return {
      kind: 'both-review',
      headline: '料金は基準を超え、この入力では通う価値の根拠も弱い状態です',
    };
  }
  return {
    kind: 'price-review',
    headline: '料金は基準を超え、通う価値には見直し余地があります',
  };
}

export function buildAssessmentResult(input: ValidatedAssessmentInput): AssessmentResult {
  const price = assessPrice(input.fees, input.visits, input.benchmark);
  const value = assessValue(input.purpose, input.purposeProgress, input.replaceability);
  return {
    input,
    price,
    value,
    overall: buildOverallAssessment(price.status, value.status),
  };
}

export function getBenchmarkLabel(kind: PriceBenchmarkKind): string {
  return priceBenchmarkOptions.find((option) => option.id === kind)?.label ?? kind;
}

export function getProgressLabel(progress: PurposeProgress): string {
  return purposeProgressOptions.find((option) => option.id === progress)?.label ?? progress;
}

export function getReplaceabilityLabel(replaceability: Replaceability): string {
  return replaceabilityOptions.find((option) => option.id === replaceability)?.label ?? replaceability;
}

export function getVisitBandLabel(bandId: VisitBandId): string {
  return visitBandOptions.find((option) => option.id === bandId)?.label ?? bandId;
}
