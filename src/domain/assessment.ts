import {
  perVisitRoundedYen,
  roundRatioHalfUp,
  unitsToRoundedYen,
  yenToUnits,
} from './money';

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
  | { kind: 'at-least'; bandId: 'monthly-21-plus'; min: number }
  | { kind: 'unknown' };

export interface FeeValues {
  monthlyFeeYen: number;
  monthlyFixedFeeYen: number;
  annualFeeYen: number;
}

export interface MonthlyEquivalent {
  units: number;
  roundedYen: number;
}

export type TimeInput =
  | { kind: 'total-hours'; totalHours: number }
  | { kind: 'average-minutes'; averageMinutes: number }
  | { kind: 'unknown' };

export type MonthlyDuration =
  | { kind: 'exact'; minutes: number }
  | { kind: 'bounded'; minMinutes: number; maxMinutes: number }
  | { kind: 'at-least'; minMinutes: number }
  | { kind: 'unknown' };

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
  | { kind: 'at-least'; bandId: 'monthly-21-plus'; minVisits: number; maxYenPerVisit: number }
  | { kind: 'unknown' };

export type PerHourResult =
  | { kind: 'exact'; minutes: number; yenPerHour: number | null }
  | {
      kind: 'bounded';
      minMinutes: number;
      maxMinutes: number;
      minYenPerHour: number;
      maxYenPerHour: number;
    }
  | { kind: 'at-least'; minMinutes: number; maxYenPerHour: number }
  | { kind: 'unknown' };

export const purposeOptions = [
  { id: 'strength', label: '筋力を高める' },
  { id: 'weight-shape', label: '減量・体型を整える' },
  { id: 'endurance', label: '体力を高める' },
  { id: 'health', label: '健康維持・運動習慣' },
  { id: 'stress', label: 'ストレス解消・気分転換' },
  { id: 'program-amenity', label: 'クラス・プール・温浴等を利用する' },
] as const;

export type PurposeId = (typeof purposeOptions)[number]['id'];
export type CountKnowledge = { kind: 'exact'; count: number } | { kind: 'unknown' };
export type PurposeEvidence = 'improved' | 'unchanged' | 'worse' | 'unknown';

export const purposeEvidenceOptions: ReadonlyArray<{ id: PurposeEvidence; label: string }> = [
  { id: 'improved', label: '目的に沿う良い変化・利用があった' },
  { id: 'unchanged', label: '期待した変化・利用を確認できなかった' },
  { id: 'worse', label: '望んだ方向とは逆だった' },
  { id: 'unknown', label: '判断できない' },
];

export interface PurposeAssessmentInput {
  purpose: PurposeId;
  planned: CountKnowledge;
  achieved: CountKnowledge;
  evidence: PurposeEvidence;
}

export type PlanAchievement =
  | {
      kind: 'known';
      plannedCount: number;
      achievedCount: number;
      percent: number;
      isAtLeastPlan: boolean;
      remainingCount: number;
    }
  | {
      kind: 'unknown';
      reason: 'planned-unknown' | 'achieved-unknown' | 'both-unknown';
    };

export interface PurposeAssessment {
  purpose: PurposeId;
  purposeLabel: string;
  planned: CountKnowledge;
  achieved: CountKnowledge;
  evidence: PurposeEvidence;
  planAchievement: PlanAchievement;
  yenPerAchievedVisit: number | null;
  achievedCostStatus: 'known' | 'zero-achieved' | 'unknown';
}

export const barrierOptions = [
  { id: 'none', label: '特にない' },
  { id: 'schedule', label: '時間を確保できなかった' },
  { id: 'travel', label: '移動が負担だった' },
  { id: 'crowding', label: '混雑していた' },
  { id: 'reservation', label: '予約を取りにくかった' },
  { id: 'equipment', label: '必要な設備を使えなかった' },
  { id: 'cleanliness', label: '故障・清潔さが気になった' },
  { id: 'enjoyment', label: '楽しさ・継続意欲が下がった' },
  { id: 'other', label: 'その他' },
  { id: 'unknown', label: '分からない' },
] as const;

export type BarrierId = (typeof barrierOptions)[number]['id'];

export type EquivalenceAnswer = 'meets' | 'does-not-meet' | 'unknown' | 'not-required';

export interface AlternativeEquivalence {
  equipment: EquivalenceAnswer;
  hours: EquivalenceAnswer;
  location: EquivalenceAnswer;
}

export type EquivalenceDimension = keyof AlternativeEquivalence;
export type EquivalenceStatus = 'equivalent' | 'not-equivalent' | 'unknown';

interface AlternativeSharedValues {
  name: string;
  monthlyFixedFeeYen: number;
  annualFeeYen: number;
  requiredServiceMonthlyYen: number;
  equivalence: AlternativeEquivalence;
}

export type KnownAlternative = AlternativeSharedValues & {
  availability: 'known';
  pricing:
    | { kind: 'monthly'; monthlyFeeYen: number }
    | { kind: 'per-visit'; perVisitFeeYen: number };
};

export type AlternativeInput = { availability: 'unknown' } | KnownAlternative;

export type AlternativeMonthlyCost =
  | { kind: 'exact'; units: number; roundedYen: number }
  | {
      kind: 'bounded';
      minUnits: number;
      maxUnits: number;
      minRoundedYen: number;
      maxRoundedYen: number;
    }
  | { kind: 'at-least'; minUnits: number; minRoundedYen: number }
  | { kind: 'unknown' };

export type RatioResult =
  | { kind: 'exact'; percent: number }
  | { kind: 'bounded'; minPercent: number; maxPercent: number }
  | { kind: 'at-least'; minPercent: number }
  | { kind: 'unknown' };

/**
 * 代替費用 - 現在費用。正なら現在の方が低く、負なら代替の方が低い。
 * 年額差は1/12円単位の月差を12倍した値なので、unitsと同じ整数円になる。
 */
export type DifferenceResult =
  | { kind: 'exact'; units: number; roundedYen: number; annualYen: number }
  | {
      kind: 'bounded';
      minUnits: number;
      maxUnits: number;
      minRoundedYen: number;
      maxRoundedYen: number;
      minAnnualYen: number;
      maxAnnualYen: number;
    }
  | {
      kind: 'at-least';
      minUnits: number;
      minRoundedYen: number;
      minAnnualYen: number;
    }
  | { kind: 'unknown' };

export type PriceStatus =
  | 'current-lower'
  | 'equal'
  | 'alternative-lower'
  | 'depends-on-visits'
  | 'not-equivalent'
  | 'equivalence-unknown'
  | 'insufficient';

export interface PurePerVisitBreakEven {
  equalityVisits: number;
  firstVisitCurrentNoMoreExpensive: number;
  firstVisitCurrentStrictlyCheaper: number;
}

export interface PriceAssessment {
  status: PriceStatus;
  insufficientReason: 'alternative-unknown' | 'visits-unknown' | null;
  current: MonthlyEquivalent & { fees: FeeValues };
  alternative: AlternativeInput;
  equivalenceStatus: EquivalenceStatus | null;
  failedEquivalence: EquivalenceDimension[];
  uncertainEquivalence: EquivalenceDimension[];
  alternativeMonthly: AlternativeMonthlyCost | null;
  alternativeValueRatio: RatioResult | null;
  difference: DifferenceResult | null;
  samePricePerVisit: PerVisitResult;
  purePerVisitBreakEven: PurePerVisitBreakEven | null;
  hasRoundedBoundaryDifference: boolean;
}

export type PrimaryRecommendationKind =
  | 'keep-current-candidate'
  | 'review-barrier-and-recheck'
  | 'compare-lower-plan'
  | 'compare-plan-and-usage'
  | 'check-official-plan'
  | 'confirm-materials';

export interface PrimaryRecommendation {
  kind: PrimaryRecommendationKind;
  headline: string;
  barrier: BarrierId;
  nextStep: string;
  supplementalContractReview: boolean;
}

const barrierNextSteps: Record<BarrierId, string> = {
  none: '次の1か月も同じ予定回数を記録し、今回の結果を再確認する',
  schedule: '利用する曜日と時間を1枠だけ先に予定へ入れる',
  travel: '生活動線上で通える店舗・プランを1件だけ比較する',
  crowding: '混雑を避けられる時間帯を店舗の公式情報で確認する',
  reservation: '予約開始時刻とキャンセル条件を確認し、利用枠を先に確保する',
  equipment: '目的に必要な設備を使える時間帯・店舗を確認する',
  cleanliness: '故障や清潔さの改善予定を店舗へ確認する',
  enjoyment: '続けやすい運動やプログラムを1種類だけ試す',
  other: '妨げた要因を一つメモし、次回の比較条件に加える',
  unknown: '利用しなかった日の理由を1週間だけ記録し、主な妨げを確認する',
};

export interface ValidatedAssessmentInput {
  fees: FeeValues;
  visits: VisitKnowledge;
  time: TimeInput;
  purpose: PurposeAssessmentInput;
  barrier: BarrierId;
  alternative: AlternativeInput;
}

export interface AssessmentResult {
  input: ValidatedAssessmentInput;
  monthly: MonthlyEquivalent;
  duration: MonthlyDuration;
  perVisit: PerVisitResult;
  perHour: PerHourResult;
  purpose: PurposeAssessment;
  price: PriceAssessment;
  recommendation: PrimaryRecommendation;
}

function percentageToOneDecimal(numerator: number, denominator: number): number {
  if (!Number.isSafeInteger(numerator) || numerator < 0) {
    throw new RangeError('percentage numerator must be a non-negative safe integer.');
  }
  if (!Number.isSafeInteger(denominator) || denominator <= 0) {
    throw new RangeError('percentage denominator must be a positive safe integer.');
  }
  return roundRatioHalfUp(numerator * 1_000, denominator) / 10;
}

function signedUnitsToRoundedYen(units: number): number {
  if (!Number.isSafeInteger(units)) throw new RangeError('units must be a safe integer.');
  const rounded = unitsToRoundedYen(Math.abs(units));
  if (rounded === 0) return 0;
  return units < 0 ? -rounded : rounded;
}

function assertTenthHours(hours: number) {
  if (!Number.isFinite(hours) || hours < 0 || Math.abs(hours * 10 - Math.round(hours * 10)) > 1e-9) {
    throw new RangeError('totalHours must be a non-negative number in 0.1-hour increments.');
  }
}

function perHourRoundedYen(totalUnits: number, minutes: number): number | null {
  if (!Number.isSafeInteger(totalUnits) || totalUnits < 0) {
    throw new RangeError('totalUnits must be a non-negative safe integer.');
  }
  if (!Number.isSafeInteger(minutes) || minutes < 0) {
    throw new RangeError('minutes must be a non-negative safe integer.');
  }
  if (minutes === 0) return null;
  return roundRatioHalfUp(totalUnits * 60, 12 * minutes);
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
  return { kind: 'unknown' };
}

export function calculateMonthlyDuration(visits: VisitKnowledge, time: TimeInput): MonthlyDuration {
  if (time.kind === 'unknown') return { kind: 'unknown' };
  if (time.kind === 'total-hours') {
    assertTenthHours(time.totalHours);
    return { kind: 'exact', minutes: Math.round(time.totalHours * 60) };
  }
  if (!Number.isSafeInteger(time.averageMinutes) || time.averageMinutes < 0) {
    throw new RangeError('averageMinutes must be a non-negative safe integer.');
  }
  if (visits.kind === 'exact') {
    return { kind: 'exact', minutes: visits.visits * time.averageMinutes };
  }
  if (visits.kind === 'bounded') {
    return {
      kind: 'bounded',
      minMinutes: visits.min * time.averageMinutes,
      maxMinutes: visits.max * time.averageMinutes,
    };
  }
  if (visits.kind === 'at-least') {
    return { kind: 'at-least', minMinutes: visits.min * time.averageMinutes };
  }
  return { kind: 'unknown' };
}

export function calculatePerHourResult(monthlyUnits: number, duration: MonthlyDuration): PerHourResult {
  if (duration.kind === 'exact') {
    return {
      kind: 'exact',
      minutes: duration.minutes,
      yenPerHour: perHourRoundedYen(monthlyUnits, duration.minutes),
    };
  }
  if (duration.kind === 'bounded') {
    if (duration.minMinutes === 0) return { kind: 'unknown' };
    return {
      kind: 'bounded',
      minMinutes: duration.minMinutes,
      maxMinutes: duration.maxMinutes,
      minYenPerHour: perHourRoundedYen(monthlyUnits, duration.maxMinutes) ?? 0,
      maxYenPerHour: perHourRoundedYen(monthlyUnits, duration.minMinutes) ?? 0,
    };
  }
  if (duration.kind === 'at-least') {
    if (duration.minMinutes === 0) return { kind: 'unknown' };
    return {
      kind: 'at-least',
      minMinutes: duration.minMinutes,
      maxYenPerHour: perHourRoundedYen(monthlyUnits, duration.minMinutes) ?? 0,
    };
  }
  return { kind: 'unknown' };
}

export function assessPurpose(
  monthlyUnits: number,
  input: PurposeAssessmentInput,
): PurposeAssessment {
  let planAchievement: PlanAchievement;
  if (input.planned.kind === 'unknown' || input.achieved.kind === 'unknown') {
    planAchievement = {
      kind: 'unknown',
      reason: input.planned.kind === 'unknown' && input.achieved.kind === 'unknown'
        ? 'both-unknown'
        : input.planned.kind === 'unknown'
          ? 'planned-unknown'
          : 'achieved-unknown',
    };
  } else {
    if (input.planned.count <= 0) {
      throw new RangeError('planned count must be positive when known.');
    }
    planAchievement = {
      kind: 'known',
      plannedCount: input.planned.count,
      achievedCount: input.achieved.count,
      percent: percentageToOneDecimal(input.achieved.count, input.planned.count),
      isAtLeastPlan: input.achieved.count >= input.planned.count,
      remainingCount: Math.max(0, input.planned.count - input.achieved.count),
    };
  }

  const achievedCostStatus = input.achieved.kind === 'unknown'
    ? 'unknown'
    : input.achieved.count === 0
      ? 'zero-achieved'
      : 'known';
  const yenPerAchievedVisit = input.achieved.kind === 'exact' && input.achieved.count > 0
    ? perVisitRoundedYen(monthlyUnits, input.achieved.count)
    : null;

  return {
    ...input,
    purposeLabel: purposeOptions.find((option) => option.id === input.purpose)?.label ?? input.purpose,
    planAchievement,
    yenPerAchievedVisit,
    achievedCostStatus,
  };
}

export function assessEquivalence(equivalence: AlternativeEquivalence): {
  status: EquivalenceStatus;
  failed: EquivalenceDimension[];
  uncertain: EquivalenceDimension[];
} {
  const dimensions = Object.keys(equivalence) as EquivalenceDimension[];
  const failed = dimensions.filter((dimension) => equivalence[dimension] === 'does-not-meet');
  const uncertain = dimensions.filter((dimension) => equivalence[dimension] === 'unknown');
  return {
    status: failed.length > 0 ? 'not-equivalent' : uncertain.length > 0 ? 'unknown' : 'equivalent',
    failed,
    uncertain,
  };
}

function calculateAlternativeBaseUnits(alternative: KnownAlternative): number {
  return yenToUnits(
    alternative.monthlyFixedFeeYen + alternative.requiredServiceMonthlyYen,
  ) + alternative.annualFeeYen;
}

export function calculateAlternativeMonthlyCost(
  alternative: KnownAlternative,
  visits: VisitKnowledge,
): AlternativeMonthlyCost {
  const baseUnits = calculateAlternativeBaseUnits(alternative);
  if (alternative.pricing.kind === 'monthly') {
    const units = baseUnits + yenToUnits(alternative.pricing.monthlyFeeYen);
    return { kind: 'exact', units, roundedYen: unitsToRoundedYen(units) };
  }

  const perVisitUnits = yenToUnits(alternative.pricing.perVisitFeeYen);
  if (perVisitUnits === 0) {
    return { kind: 'exact', units: baseUnits, roundedYen: unitsToRoundedYen(baseUnits) };
  }
  if (visits.kind === 'exact') {
    const units = baseUnits + perVisitUnits * visits.visits;
    return { kind: 'exact', units, roundedYen: unitsToRoundedYen(units) };
  }
  if (visits.kind === 'bounded') {
    const minUnits = baseUnits + perVisitUnits * visits.min;
    const maxUnits = baseUnits + perVisitUnits * visits.max;
    return {
      kind: 'bounded',
      minUnits,
      maxUnits,
      minRoundedYen: unitsToRoundedYen(minUnits),
      maxRoundedYen: unitsToRoundedYen(maxUnits),
    };
  }
  if (visits.kind === 'at-least') {
    const minUnits = baseUnits + perVisitUnits * visits.min;
    return { kind: 'at-least', minUnits, minRoundedYen: unitsToRoundedYen(minUnits) };
  }
  return { kind: 'unknown' };
}

function classifyPrice(currentUnits: number, alternative: AlternativeMonthlyCost): PriceStatus {
  if (alternative.kind === 'unknown') return 'insufficient';
  if (alternative.kind === 'exact') {
    if (alternative.units === currentUnits) return 'equal';
    return alternative.units > currentUnits ? 'current-lower' : 'alternative-lower';
  }
  if (alternative.kind === 'bounded') {
    if (alternative.minUnits >= currentUnits) return 'current-lower';
    if (alternative.maxUnits <= currentUnits) return 'alternative-lower';
    return 'depends-on-visits';
  }
  return alternative.minUnits >= currentUnits ? 'current-lower' : 'depends-on-visits';
}

function calculateRatio(currentUnits: number, alternative: AlternativeMonthlyCost): RatioResult | null {
  if (currentUnits === 0) return null;
  if (alternative.kind === 'unknown') return { kind: 'unknown' };
  if (alternative.kind === 'exact') {
    return { kind: 'exact', percent: percentageToOneDecimal(alternative.units, currentUnits) };
  }
  if (alternative.kind === 'bounded') {
    return {
      kind: 'bounded',
      minPercent: percentageToOneDecimal(alternative.minUnits, currentUnits),
      maxPercent: percentageToOneDecimal(alternative.maxUnits, currentUnits),
    };
  }
  return {
    kind: 'at-least',
    minPercent: percentageToOneDecimal(alternative.minUnits, currentUnits),
  };
}

function calculateDifference(
  currentUnits: number,
  alternative: AlternativeMonthlyCost,
): DifferenceResult {
  if (alternative.kind === 'unknown') return { kind: 'unknown' };
  if (alternative.kind === 'exact') {
    const units = alternative.units - currentUnits;
    return {
      kind: 'exact',
      units,
      roundedYen: signedUnitsToRoundedYen(units),
      annualYen: units,
    };
  }
  if (alternative.kind === 'bounded') {
    const minUnits = alternative.minUnits - currentUnits;
    const maxUnits = alternative.maxUnits - currentUnits;
    return {
      kind: 'bounded',
      minUnits,
      maxUnits,
      minRoundedYen: signedUnitsToRoundedYen(minUnits),
      maxRoundedYen: signedUnitsToRoundedYen(maxUnits),
      minAnnualYen: minUnits,
      maxAnnualYen: maxUnits,
    };
  }
  const minUnits = alternative.minUnits - currentUnits;
  return {
    kind: 'at-least',
    minUnits,
    minRoundedYen: signedUnitsToRoundedYen(minUnits),
    minAnnualYen: minUnits,
  };
}

function calculatePurePerVisitBreakEven(
  currentUnits: number,
  alternative: KnownAlternative,
  equivalenceStatus: EquivalenceStatus,
): PurePerVisitBreakEven | null {
  if (
    equivalenceStatus !== 'equivalent'
    || alternative.pricing.kind !== 'per-visit'
    || calculateAlternativeBaseUnits(alternative) !== 0
    || alternative.pricing.perVisitFeeYen <= 0
  ) {
    return null;
  }
  const perVisitUnits = yenToUnits(alternative.pricing.perVisitFeeYen);
  return {
    equalityVisits: currentUnits / perVisitUnits,
    firstVisitCurrentNoMoreExpensive: Math.ceil(currentUnits / perVisitUnits),
    firstVisitCurrentStrictlyCheaper: Math.floor(currentUnits / perVisitUnits) + 1,
  };
}

export function assessPrice(
  fees: FeeValues,
  visits: VisitKnowledge,
  alternative: AlternativeInput,
): PriceAssessment {
  const monthly = { ...calculateMonthlyEquivalent(fees), fees };
  const samePricePerVisit = calculatePerVisitResult(monthly.units, visits);
  if (alternative.availability === 'unknown') {
    return {
      status: 'insufficient',
      insufficientReason: 'alternative-unknown',
      current: monthly,
      alternative,
      equivalenceStatus: null,
      failedEquivalence: [],
      uncertainEquivalence: [],
      alternativeMonthly: null,
      alternativeValueRatio: null,
      difference: null,
      samePricePerVisit,
      purePerVisitBreakEven: null,
      hasRoundedBoundaryDifference: false,
    };
  }

  const equivalence = assessEquivalence(alternative.equivalence);
  const alternativeMonthly = calculateAlternativeMonthlyCost(alternative, visits);
  const status = equivalence.status === 'not-equivalent'
    ? 'not-equivalent'
    : equivalence.status === 'unknown'
      ? 'equivalence-unknown'
      : classifyPrice(monthly.units, alternativeMonthly);
  const eligibleForComparison = equivalence.status === 'equivalent';
  const exactAlternative = alternativeMonthly.kind === 'exact' ? alternativeMonthly : null;

  return {
    status,
    insufficientReason: status === 'insufficient' ? 'visits-unknown' : null,
    current: monthly,
    alternative,
    equivalenceStatus: equivalence.status,
    failedEquivalence: equivalence.failed,
    uncertainEquivalence: equivalence.uncertain,
    alternativeMonthly,
    alternativeValueRatio: eligibleForComparison
      ? calculateRatio(monthly.units, alternativeMonthly)
      : null,
    difference: eligibleForComparison
      ? calculateDifference(monthly.units, alternativeMonthly)
      : null,
    samePricePerVisit,
    purePerVisitBreakEven: calculatePurePerVisitBreakEven(
      monthly.units,
      alternative,
      equivalence.status,
    ),
    hasRoundedBoundaryDifference: Boolean(
      eligibleForComparison
      && exactAlternative
      && exactAlternative.roundedYen === monthly.roundedYen
      && exactAlternative.units !== monthly.units,
    ),
  };
}

export function buildPrimaryRecommendation(
  priceStatus: PriceStatus,
  planAchievement: PlanAchievement,
  visits: VisitKnowledge,
  achieved: CountKnowledge,
  barrier: BarrierId,
  evidence: PurposeEvidence,
  insufficientReason: PriceAssessment['insufficientReason'] = null,
): PrimaryRecommendation {
  let kind: PrimaryRecommendationKind;
  let headline: string;

  if (planAchievement.kind === 'unknown' || evidence === 'unknown') {
    kind = 'confirm-materials';
    headline = '利用実績を確認してから判断する';
  } else if (priceStatus === 'current-lower' || priceStatus === 'equal') {
    if (planAchievement.isAtLeastPlan && evidence === 'improved') {
      kind = 'keep-current-candidate';
      headline = '今のプランを継続候補にする';
    } else {
      kind = 'review-barrier-and-recheck';
      headline = evidence === 'worse'
        ? '運動内容・プログラムを見直して再確認する'
        : evidence === 'unchanged'
          ? '目的に沿う変化を確認できる方法へ見直す'
          : barrier === 'none'
            ? '利用計画と実行方法を1か月だけ見直して再確認する'
            : '利用を妨げた要因を1か月だけ見直して再確認する';
    }
  } else if (priceStatus === 'alternative-lower') {
    if (planAchievement.isAtLeastPlan && evidence === 'improved') {
      kind = 'compare-lower-plan';
      headline = '同じ利用を保てる低料金プランを比較する';
    } else {
      kind = 'compare-plan-and-usage';
      headline = '低料金プランと利用方法の両方を比較する';
    }
  } else {
    kind = 'check-official-plan';
    headline = priceStatus === 'depends-on-visits'
      ? '正確な来館回数を記録して料金差を再確認する'
      : planAchievement.isAtLeastPlan && evidence === 'improved'
        ? '同額条件を持って公式プランを確認する'
        : '利用方法を見直し、公式プランも確認する';
  }

  const valueReviewStep = evidence === 'worse'
    ? '運動内容・負荷・プログラムが目的に合っているか確認し、回数を増やす前に見直す'
    : evidence === 'unchanged'
      ? '確認したい変化を一つ決め、運動内容を見直して1か月後に再確認する'
      : null;
  const nextStep = kind === 'confirm-materials'
    ? '予定した来館回数・目的に使えた来館回数・具体的な変化のうち、不明なものを1か月だけ記録する'
    : kind === 'compare-lower-plan'
      ? '必要な設備・利用回数・時間帯・店舗範囲を保てる低料金プランを1件、公式条件で比較する'
      : kind === 'compare-plan-and-usage'
        ? `${valueReviewStep ?? barrierNextSteps[barrier]}。そのうえで、同じ条件を満たす低料金プランを1件比較する`
        : kind === 'check-official-plan'
          ? `${valueReviewStep ? `${valueReviewStep}。` : ''}${priceStatus === 'depends-on-visits' || insufficientReason === 'visits-unknown'
              ? '来館回数を1か月だけ記録し、入力済みの都度料金と再比較する'
              : '必要な設備・利用回数・時間帯・店舗範囲を満たす公式プランを1件確認する'}`
          : kind === 'review-barrier-and-recheck'
            ? valueReviewStep
              ? `${valueReviewStep}${barrier === 'none' ? '' : `。${barrierNextSteps[barrier]}`}`
              : barrierNextSteps[barrier]
            : barrierNextSteps[barrier];

  return {
    kind,
    headline,
    barrier,
    nextStep,
    supplementalContractReview:
      visits.kind === 'exact'
      && visits.visits === 0
      && achieved.kind === 'exact'
      && achieved.count === 0,
  };
}

export function buildAssessmentResult(input: ValidatedAssessmentInput): AssessmentResult {
  const monthly = calculateMonthlyEquivalent(input.fees);
  const duration = calculateMonthlyDuration(input.visits, input.time);
  const perVisit = calculatePerVisitResult(monthly.units, input.visits);
  const perHour = calculatePerHourResult(monthly.units, duration);
  const purpose = assessPurpose(monthly.units, input.purpose);
  const price = assessPrice(input.fees, input.visits, input.alternative);
  const recommendation = buildPrimaryRecommendation(
    price.status,
    purpose.planAchievement,
    input.visits,
    input.purpose.achieved,
    input.barrier,
    input.purpose.evidence,
    price.insufficientReason,
  );
  return { input, monthly, duration, perVisit, perHour, purpose, price, recommendation };
}

export function getPurposeLabel(purpose: PurposeId): string {
  return purposeOptions.find((option) => option.id === purpose)?.label ?? purpose;
}

export function getPurposeEvidenceLabel(evidence: PurposeEvidence): string {
  return purposeEvidenceOptions.find((option) => option.id === evidence)?.label ?? evidence;
}

export function getBarrierLabel(barrier: BarrierId): string {
  return barrierOptions.find((option) => option.id === barrier)?.label ?? barrier;
}

export function getVisitBandLabel(bandId: VisitBandId): string {
  return visitBandOptions.find((option) => option.id === bandId)?.label ?? bandId;
}
