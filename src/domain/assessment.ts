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

export const activityOptions = [
  { id: 'strength-training', label: '筋力トレーニング', completionExample: '予定した主な種目とセット・回数を終えた', qualityQuestion: '種目、負荷、フォームは目的に合っていましたか', alternativeRequirement: '同じ筋力トレーニングに必要な器具・負荷を使える', reviewStep: '予定した主な種目・セットと負荷が目的に合うか一度確認する' },
  { id: 'cardio', label: '有酸素運動', completionExample: '予定した時間または距離を終えた', qualityQuestion: '運動の種類、強度、時間は目的に合っていましたか', alternativeRequirement: '同じ有酸素運動の種類・強度・時間を再現できる', reviewStep: '予定した時間・距離と無理なく続けられる強度が合うか一度確認する' },
  { id: 'studio-class', label: 'スタジオクラス', completionExample: '目的のクラスへ参加し、予定した範囲を終えた', qualityQuestion: 'クラスの内容と難易度は目的に合っていましたか', alternativeRequirement: '同じ目的・時間帯のクラスへ参加できる', reviewStep: 'クラスの内容・難易度・時間帯が目的に合うか一度確認する' },
  { id: 'pool', label: 'プール', completionExample: '予定した時間または距離を実施した', qualityQuestion: '泳法、水中運動の内容、強度は目的に合っていましたか', alternativeRequirement: '同じ時間帯にプールまたは同等の水中運動を利用できる', reviewStep: '予定した時間・距離と水中運動の強度が目的に合うか一度確認する' },
  { id: 'coached-training', label: '指導付きトレーニング', completionExample: '指導を受け、当日の主な内容を実行した', qualityQuestion: '指導内容と難易度は目的や現在の状態に合っていましたか', alternativeRequirement: '同等の指導・フォーム確認を同じ回数受けられる', reviewStep: '指導で確認した内容を一つ選び、次回に実行できるか確認する' },
  { id: 'recovery', label: '回復設備', completionExample: '目的としていた回復設備を利用できた', qualityQuestion: '設備の内容と利用時間は目的に合っていましたか', alternativeRequirement: '実際に使った回復設備を同じ条件で利用できる', reviewStep: '利用した設備・時間帯・利用後の実感が目的に合うか一度確認する' },
  { id: 'other', label: 'その他', completionExample: '自分で予定した主な内容を終えた', qualityQuestion: '行った内容、強度、難易度は目的に合っていましたか', alternativeRequirement: '同じ主な活動を再現できる', reviewStep: '予定した内容と実際に行った内容の差を一つだけ確認する' },
] as const;

export type ActivityId = (typeof activityOptions)[number]['id'];
export type ContentFit = 'fits' | 'partly-fits' | 'does-not-fit' | 'unknown';
export const contentFitOptions: ReadonlyArray<{ id: ContentFit; label: string }> = [
  { id: 'fits', label: '合っていた' },
  { id: 'partly-fits', label: '一部合っていた' },
  { id: 'does-not-fit', label: '合っていなかった' },
  { id: 'unknown', label: '判断できない' },
];

export const usedServiceOptions = [
  { id: 'classes', label: 'クラス' },
  { id: 'pool', label: 'プール' },
  { id: 'coaching', label: '指導・フォーム確認' },
  { id: 'specialty-equipment', label: '専門設備' },
  { id: 'recovery', label: '温浴・サウナ' },
  { id: 'extended-access', label: '複数店舗・深夜早朝' },
  { id: 'other', label: 'その他' },
  { id: 'none', label: '特になし' },
] as const;
export type UsedServiceId = (typeof usedServiceOptions)[number]['id'];

export type ContinuationIntent = 'choose' | 'unsure' | 'not-choose' | 'unknown';
export const continuationOptions: ReadonlyArray<{ id: ContinuationIntent; label: string }> = [
  { id: 'choose', label: '選びたい' },
  { id: 'unsure', label: '迷う' },
  { id: 'not-choose', label: '選ばない' },
  { id: 'unknown', label: '判断できない' },
];
export type SafetyAnswer = 'no-concern' | 'concern' | 'unknown';
export const safetyOptions: ReadonlyArray<{ id: SafetyAnswer; label: string }> = [
  { id: 'no-concern', label: 'なかった' },
  { id: 'concern', label: 'あった' },
  { id: 'unknown', label: '判断できない' },
];

const purposeGuidance: Record<PurposeId, { changeExamples: string; recheckStep: string }> = {
  strength: {
    changeExamples: '重量、回数、フォームの安定など',
    recheckStep: '重量・回数・フォームのどれか一つを次の1か月だけ記録する',
  },
  'weight-shape': {
    changeExamples: '服のゆとり、腹囲の方向、運動を続けられた実感など',
    recheckStep: '服のゆとり・腹囲の方向・運動記録のどれか一つを同じ条件で確認する',
  },
  endurance: {
    changeExamples: '継続時間、距離、速度、息切れの変化など',
    recheckStep: '時間・距離・速度のどれか一つを次の1か月だけ記録する',
  },
  health: {
    changeExamples: '運動した日数、実運動時間、無理なく続けられた週など',
    recheckStep: '運動した日数か実運動時間のどちらか一つを次の1か月だけ記録する',
  },
  stress: {
    changeExamples: '利用前後の気分、楽しさ、休息感など',
    recheckStep: '利用前後の気分か楽しさのどちらか一つを次の1か月だけ確認する',
  },
  'program-amenity': {
    changeExamples: '目的の設備を使えた回数、内容への満足、利用しやすさなど',
    recheckStep: '目的の設備・プログラムを使えた回数と利用後の実感を次の1か月だけ記録する',
  },
};

export const purposeEvidenceOptions: ReadonlyArray<{ id: PurposeEvidence; label: string }> = [
  { id: 'improved', label: '良い方向' },
  { id: 'unchanged', label: 'ほぼ変わらない' },
  { id: 'worse', label: '望んだ方向と逆' },
  { id: 'unknown', label: 'まだ判断できない' },
];

export interface PurposeAssessmentInput {
  purpose: PurposeId;
  activity: ActivityId;
  performed: CountKnowledge;
  completed: CountKnowledge;
  contentFit: ContentFit;
  evidence: PurposeEvidence;
}

export type UsageRateResult =
  | { kind: 'exact'; numerator: number; denominator: number; percent: number }
  | {
      kind: 'bounded';
      numerator: number;
      minDenominator: number;
      maxDenominator: number;
      minPercent: number;
      maxPercent: number;
    }
  | { kind: 'at-most'; numerator: number; minDenominator: number; maxPercent: number }
  | { kind: 'zero-denominator'; numerator: number }
  | { kind: 'unknown'; reason: 'visits-unknown' | 'performed-unknown' | 'completed-unknown' };

export type CountCostStatus = 'known' | 'zero-count' | 'unknown';

export type CompletionOpportunity =
  | {
      kind: 'available';
      performedCount: number;
      completedCount: number;
      incompleteCount: number;
      currentYenPerCompleted: number | null;
      ifAllPerformedCompletedYen: number;
    }
  | { kind: 'not-applicable' }
  | { kind: 'unknown' };

export interface PurposeAssessment {
  purpose: PurposeId;
  purposeLabel: string;
  activity: ActivityId;
  activityLabel: string;
  performed: CountKnowledge;
  completed: CountKnowledge;
  contentFit: ContentFit;
  evidence: PurposeEvidence;
  changeExamples: string;
  completionExample: string;
  qualityQuestion: string;
  alternativeRequirement: string;
  activityRate: UsageRateResult;
  completionRate: UsageRateResult;
  yenPerPerformed: number | null;
  performedCostStatus: CountCostStatus;
  yenPerCompleted: number | null;
  completedCostStatus: CountCostStatus;
  completionOpportunity: CompletionOpportunity;
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
  services: EquivalenceAnswer;
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
  insufficientReason: 'alternative-unknown' | 'activity-count-unknown' | null;
  current: MonthlyEquivalent & { fees: FeeValues };
  alternative: AlternativeInput;
  equivalenceStatus: EquivalenceStatus | null;
  failedEquivalence: EquivalenceDimension[];
  uncertainEquivalence: EquivalenceDimension[];
  requiredAlternativeServiceLabels: string[];
  alternativeMonthly: AlternativeMonthlyCost | null;
  alternativeValueRatio: RatioResult | null;
  difference: DifferenceResult | null;
  samePricePerActivity: PerActivityCostResult;
  purePerVisitBreakEven: PurePerVisitBreakEven | null;
  hasRoundedBoundaryDifference: boolean;
}

export type PerActivityCostResult =
  | {
      kind: 'exact';
      activities: number;
      yenPerActivity: number | null;
      unusedPaymentYen: number;
    }
  | { kind: 'unknown' };

export type PrimaryRecommendationKind =
  | 'safety-first'
  | 'keep-current-candidate'
  | 'review-training'
  | 'compare-lower-plan'
  | 'review-access'
  | 'review-contract'
  | 'confirm-materials';

export interface PrimaryRecommendation {
  kind: PrimaryRecommendationKind;
  headline: string;
  reason: string;
  nextStep: string;
  changeCondition: string;
  barrier: BarrierId | null;
}

export interface BarrierConditionInput {
  performed: CountKnowledge;
  completed: CountKnowledge;
  contentFit: ContentFit;
  evidence: PurposeEvidence;
  continuation: ContinuationIntent;
  safety: SafetyAnswer;
}

export interface ValidatedAssessmentInput {
  fees: FeeValues;
  visits: VisitKnowledge;
  time: TimeInput;
  purpose: PurposeAssessmentInput;
  usedServices: UsedServiceId[];
  continuation: ContinuationIntent;
  safety: SafetyAnswer;
  barrier: BarrierId | null;
  alternative: AlternativeInput;
}

export interface AssessmentResult {
  input: ValidatedAssessmentInput;
  monthly: MonthlyEquivalent;
  duration: MonthlyDuration;
  perVisit: PerVisitResult;
  perHour: PerHourResult;
  purpose: PurposeAssessment;
  usedServiceLabels: string[];
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

export function calculateActivityRate(
  performed: CountKnowledge,
  visits: VisitKnowledge,
): UsageRateResult {
  if (performed.kind === 'unknown') return { kind: 'unknown', reason: 'performed-unknown' };
  if (visits.kind === 'unknown') return { kind: 'unknown', reason: 'visits-unknown' };
  if (visits.kind === 'exact') {
    if (performed.count > visits.visits) throw new RangeError('performed count must not exceed visits.');
    if (visits.visits === 0) return { kind: 'zero-denominator', numerator: performed.count };
    return {
      kind: 'exact',
      numerator: performed.count,
      denominator: visits.visits,
      percent: percentageToOneDecimal(performed.count, visits.visits),
    };
  }
  if (visits.kind === 'bounded') {
    if (performed.count > visits.max) throw new RangeError('performed count must not exceed visit maximum.');
    const minDenominator = Math.max(visits.min, performed.count);
    if (minDenominator === 0) return { kind: 'zero-denominator', numerator: performed.count };
    return {
      kind: 'bounded',
      numerator: performed.count,
      minDenominator,
      maxDenominator: visits.max,
      minPercent: percentageToOneDecimal(performed.count, visits.max),
      maxPercent: percentageToOneDecimal(performed.count, minDenominator),
    };
  }
  const minDenominator = Math.max(visits.min, performed.count);
  if (minDenominator === 0) return { kind: 'zero-denominator', numerator: performed.count };
  return {
    kind: 'at-most',
    numerator: performed.count,
    minDenominator,
    maxPercent: percentageToOneDecimal(performed.count, minDenominator),
  };
}

export function calculateCompletionRate(
  completed: CountKnowledge,
  performed: CountKnowledge,
): UsageRateResult {
  if (performed.kind === 'unknown') return { kind: 'unknown', reason: 'performed-unknown' };
  if (completed.kind === 'unknown') return { kind: 'unknown', reason: 'completed-unknown' };
  if (completed.count > performed.count) throw new RangeError('completed count must not exceed performed count.');
  if (performed.count === 0) return { kind: 'zero-denominator', numerator: completed.count };
  return {
    kind: 'exact',
    numerator: completed.count,
    denominator: performed.count,
    percent: percentageToOneDecimal(completed.count, performed.count),
  };
}

function countCost(
  monthlyUnits: number,
  count: CountKnowledge,
): { value: number | null; status: CountCostStatus } {
  if (count.kind === 'unknown') return { value: null, status: 'unknown' };
  if (count.count === 0) return { value: null, status: 'zero-count' };
  return { value: perVisitRoundedYen(monthlyUnits, count.count), status: 'known' };
}

export function assessPurpose(
  monthlyUnits: number,
  visits: VisitKnowledge,
  input: PurposeAssessmentInput,
): PurposeAssessment {
  if (
    input.performed.kind === 'exact'
    && input.completed.kind === 'exact'
    && input.completed.count > input.performed.count
  ) {
    throw new RangeError('completed count must not exceed performed count.');
  }
  const performedCost = countCost(monthlyUnits, input.performed);
  const completedCost = countCost(monthlyUnits, input.completed);
  let completionOpportunity: CompletionOpportunity = { kind: 'unknown' };
  if (input.performed.kind === 'exact' && input.completed.kind === 'exact') {
    completionOpportunity = input.completed.count < input.performed.count
      ? {
          kind: 'available',
          performedCount: input.performed.count,
          completedCount: input.completed.count,
          incompleteCount: input.performed.count - input.completed.count,
          currentYenPerCompleted: completedCost.value,
          ifAllPerformedCompletedYen: input.performed.count === 0
            ? 0
            : perVisitRoundedYen(monthlyUnits, input.performed.count) ?? 0,
        }
      : { kind: 'not-applicable' };
  }
  return {
    ...input,
    purposeLabel: getPurposeLabel(input.purpose),
    activityLabel: getActivityLabel(input.activity),
    changeExamples: getPurposeChangeExamples(input.purpose),
    completionExample: getActivityCompletionExample(input.activity),
    qualityQuestion: getActivityQualityQuestion(input.activity),
    alternativeRequirement: getActivityAlternativeRequirement(input.activity),
    activityRate: calculateActivityRate(input.performed, visits),
    completionRate: calculateCompletionRate(input.completed, input.performed),
    yenPerPerformed: performedCost.value,
    performedCostStatus: performedCost.status,
    yenPerCompleted: completedCost.value,
    completedCostStatus: completedCost.status,
    completionOpportunity,
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
  performed: CountKnowledge,
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
  if (performed.kind === 'exact') {
    const units = baseUnits + perVisitUnits * performed.count;
    return { kind: 'exact', units, roundedYen: unitsToRoundedYen(units) };
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

export function calculatePerActivityCost(
  monthlyUnits: number,
  performed: CountKnowledge,
): PerActivityCostResult {
  if (performed.kind === 'unknown') return { kind: 'unknown' };
  return {
    kind: 'exact',
    activities: performed.count,
    yenPerActivity: perVisitRoundedYen(monthlyUnits, performed.count),
    unusedPaymentYen: unitsToRoundedYen(monthlyUnits),
  };
}

export function assessPrice(
  fees: FeeValues,
  performed: CountKnowledge,
  alternative: AlternativeInput,
  usedServices: readonly UsedServiceId[] = [],
): PriceAssessment {
  const monthly = { ...calculateMonthlyEquivalent(fees), fees };
  const samePricePerActivity = calculatePerActivityCost(monthly.units, performed);
  const requiredAlternativeServiceLabels = usedServices
    .filter((service) => service !== 'none')
    .map(getUsedServiceLabel);
  if (alternative.availability === 'unknown') {
    return {
      status: 'insufficient',
      insufficientReason: 'alternative-unknown',
      current: monthly,
      alternative,
      equivalenceStatus: null,
      failedEquivalence: [],
      uncertainEquivalence: [],
      requiredAlternativeServiceLabels,
      alternativeMonthly: null,
      alternativeValueRatio: null,
      difference: null,
      samePricePerActivity,
      purePerVisitBreakEven: null,
      hasRoundedBoundaryDifference: false,
    };
  }

  const equivalence = assessEquivalence(alternative.equivalence);
  const alternativeMonthly = calculateAlternativeMonthlyCost(alternative, performed);
  const status = equivalence.status === 'not-equivalent'
    ? 'not-equivalent'
    : equivalence.status === 'unknown'
      ? 'equivalence-unknown'
      : classifyPrice(monthly.units, alternativeMonthly);
  const eligibleForComparison = equivalence.status === 'equivalent';
  const exactAlternative = alternativeMonthly.kind === 'exact' ? alternativeMonthly : null;

  return {
    status,
    insufficientReason: status === 'insufficient' ? 'activity-count-unknown' : null,
    current: monthly,
    alternative,
    equivalenceStatus: equivalence.status,
    failedEquivalence: equivalence.failed,
    uncertainEquivalence: equivalence.uncertain,
    requiredAlternativeServiceLabels,
    alternativeMonthly,
    alternativeValueRatio: eligibleForComparison
      ? calculateRatio(monthly.units, alternativeMonthly)
      : null,
    difference: eligibleForComparison
      ? calculateDifference(monthly.units, alternativeMonthly)
      : null,
    samePricePerActivity,
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


export function requiresBarrier(input: BarrierConditionInput): boolean {
  if (input.safety === 'concern') return false;
  if (input.performed.kind === 'exact' && input.performed.count === 0) return true;
  if (input.completed.kind === 'exact' && input.completed.count === 0) return true;
  if (
    input.performed.kind === 'exact'
    && input.completed.kind === 'exact'
    && input.completed.count < input.performed.count
  ) {
    return true;
  }
  return input.contentFit !== 'fits'
    || input.evidence !== 'improved'
    || input.continuation !== 'choose';
}

function withBarrierFocus(focus: string, barrier: BarrierId | null): string {
  switch (barrier) {
    case 'schedule':
      return '次の1か月は利用枠を一つだけ先に予定へ入れ、その枠で' + focus;
    case 'travel':
      return '生活動線上で通える条件を一つ確認し、その条件で' + focus;
    case 'crowding':
      return '混雑を避けられる時間帯を一つ確認し、その時間帯で' + focus;
    case 'reservation':
      return '予約できる枠を一つだけ先に確保し、その枠で' + focus;
    case 'equipment':
      return '必要な設備を使える時間帯を一つ確認し、その時間帯で' + focus;
    case 'cleanliness':
      return '設備状態を店舗へ一度確認し、利用できる状態なら' + focus;
    case 'enjoyment':
      return '続けやすい活動を一種類だけ選び、その活動で' + focus;
    case 'other':
      return '妨げた要因を一つだけ具体化し、それを避けた条件で' + focus;
    case 'unknown':
      return '利用できなかった日の理由を1週間だけ記録し、理由が分かった条件で' + focus;
    case 'none':
    case null:
      return focus;
  }
}

function exactCount(count: CountKnowledge): number | null {
  return count.kind === 'exact' ? count.count : null;
}

function materialRecommendation(input: ValidatedAssessmentInput): {
  reason: string;
  focus: string;
  changeCondition: string;
} {
  if (input.safety === 'unknown') {
    return {
      reason: '安全上の懸念がなかったか判断できないため、継続候補を確定していません。',
      focus: '運動中・後に確認したい症状がなかったかを次回一度だけ確認する',
      changeCondition: '安全上の懸念がなかったと確認できた場合',
    };
  }
  if (input.purpose.performed.kind === 'unknown') {
    return {
      reason: '目的活動を行った回数が不明です。',
      focus: '目的活動を行った日だけを次の1か月記録する',
      changeCondition: '目的活動回数Sが分かった場合',
    };
  }
  if (input.purpose.completed.kind === 'unknown') {
    return {
      reason: '予定内容を完了した回数が不明です。',
      focus: '予定内容を完了できた日だけを次の1か月記録する',
      changeCondition: '内容完了回数Fが分かった場合',
    };
  }
  if (input.purpose.contentFit === 'unknown') {
    return {
      reason: '活動の内容が目的に合っていたか判断できません。',
      focus: getActivityReviewStep(input.purpose.activity),
      changeCondition: '活動の内容・強度・難易度が目的に合うと確認できた場合',
    };
  }
  if (input.purpose.evidence === 'unknown') {
    return {
      reason: '目的に沿う変化（' + getPurposeChangeExamples(input.purpose.purpose) + '）がまだ判断できません。',
      focus: getPurposeRecheckStep(input.purpose.purpose),
      changeCondition: '目的に沿う変化の方向を確認できた場合',
    };
  }
  return {
    reason: '同じ条件でも来月このジムを選びたいか判断できません。',
    focus: '迷っている理由を一つだけ確認する',
    changeCondition: '再選択意向が「選びたい」または「選ばない」に変わった場合',
  };
}

export function buildPrimaryRecommendation(
  input: ValidatedAssessmentInput,
  purpose: PurposeAssessment,
  price: PriceAssessment,
): PrimaryRecommendation {
  const barrier = input.barrier;
  const performed = exactCount(input.purpose.performed);
  const completed = exactCount(input.purpose.completed);

  if (input.safety === 'concern') {
    return {
      kind: 'safety-first',
      headline: '安全確認を優先する',
      reason: '運動中・後に、続ける前に確認したい症状があったという回答です。',
      nextStep: '運動を中止し、再開・増量の前に医療機関等へ確認する',
      changeCondition: '安全上の懸念がないと確認でき、ほかの入力を再確認した場合',
      barrier: null,
    };
  }
  if (input.purpose.evidence === 'worse') {
    return {
      kind: 'review-training',
      headline: '料金判断より先に、目的に合う内容か確認する',
      reason: '目的に沿う変化（' + purpose.changeExamples + '）が望んだ方向と逆でした。',
      nextStep: withBarrierFocus(getPurposeRecheckStep(input.purpose.purpose), barrier),
      changeCondition: '目的に沿う変化が良い方向へ変わった場合',
      barrier,
    };
  }
  if (input.continuation === 'not-choose') {
    return {
      kind: 'review-contract',
      headline: '今の契約が必要か確認する',
      reason: '同じ条件なら来月はこのジムを選ばないという回答です。',
      nextStep: withBarrierFocus('今の契約で保持したい条件があるか一度確認する', barrier),
      changeCondition: '同じ条件でも来月このジムを選びたいと変わった場合',
      barrier,
    };
  }
  if (performed === 0) {
    const hasBarrier = barrier !== null && barrier !== 'none';
    return {
      kind: hasBarrier ? 'review-access' : 'review-contract',
      headline: hasBarrier ? '混雑・時間帯等、通い方を1か月だけ見直す' : '今の契約が必要か確認する',
      reason: '来館の有無にかかわらず、目的活動を行った回数Sが0回でした。',
      nextStep: withBarrierFocus('目的活動を実施できるか一度確認する', barrier),
      changeCondition: '目的活動を行った回数Sが1回以上になった場合',
      barrier,
    };
  }
  if (completed === 0) {
    return {
      kind: 'review-training',
      headline: '目的活動は行えているが、内容を見直す',
      reason: '目的活動は行いましたが、予定内容を完了した回数Fが0回でした。',
      nextStep: withBarrierFocus(getActivityReviewStep(input.purpose.activity), barrier),
      changeCondition: '予定内容を完了できた回が1回以上になった場合',
      barrier,
    };
  }
  if (performed !== null && completed !== null && completed < performed) {
    return {
      kind: 'review-training',
      headline: '目的活動は行えているが、内容を見直す',
      reason: '目的活動' + performed + '回のうち、予定内容を完了したのは' + completed + '回でした。',
      nextStep: withBarrierFocus(getActivityReviewStep(input.purpose.activity), barrier),
      changeCondition: '既に始めた目的活動S回で予定内容をすべて完了できた場合',
      barrier,
    };
  }
  if (input.purpose.contentFit === 'partly-fits' || input.purpose.contentFit === 'does-not-fit') {
    return {
      kind: 'review-training',
      headline: '目的活動は行えているが、内容を見直す',
      reason: purpose.activityLabel + 'の内容・強度・難易度が目的に十分合っていませんでした。',
      nextStep: withBarrierFocus(getActivityReviewStep(input.purpose.activity), barrier),
      changeCondition: '活動の内容・強度・難易度が目的に合うと確認できた場合',
      barrier,
    };
  }
  if (input.purpose.evidence === 'unchanged') {
    return {
      kind: 'review-training',
      headline: '目的活動は行えているが、変化の確認方法を見直す',
      reason: '目的に沿う変化（' + purpose.changeExamples + '）は、ほぼ変わらないという回答です。',
      nextStep: withBarrierFocus(getPurposeRecheckStep(input.purpose.purpose), barrier),
      changeCondition: '目的に沿う変化が良い方向へ変わった場合',
      barrier,
    };
  }
  if (
    input.safety === 'unknown'
    || input.purpose.performed.kind === 'unknown'
    || input.purpose.completed.kind === 'unknown'
    || input.purpose.contentFit === 'unknown'
    || input.purpose.evidence === 'unknown'
    || input.continuation === 'unknown'
  ) {
    const material = materialRecommendation(input);
    return {
      kind: 'confirm-materials',
      headline: '判断材料を一つ記録して再確認する',
      reason: material.reason,
      nextStep: withBarrierFocus(material.focus, barrier),
      changeCondition: material.changeCondition,
      barrier,
    };
  }
  if (input.continuation === 'unsure') {
    const hasBarrier = barrier !== null && barrier !== 'none';
    return {
      kind: hasBarrier ? 'review-access' : 'confirm-materials',
      headline: hasBarrier ? '混雑・時間帯等、通い方を1か月だけ見直す' : '判断材料を一つ記録して再確認する',
      reason: '同じ条件なら来月もこのジムを選ぶか迷うという回答です。',
      nextStep: withBarrierFocus('迷っている理由を一つだけ確認する', barrier),
      changeCondition: '再選択意向が「選びたい」または「選ばない」に変わった場合',
      barrier,
    };
  }
  if (price.status === 'alternative-lower') {
    return {
      kind: 'compare-lower-plan',
      headline: '内容には価値があるが、料金プランを比較する',
      reason: '実際に使った条件を満たす公式代替の方が、同じ目的活動回数では低料金です。',
      nextStep: '失う設備・サービスがないか公式条件を一度確認する',
      changeCondition: '同じ利用条件で現在プランが同額以下になる場合',
      barrier,
    };
  }
  if (
    performed !== null
    && performed > 0
    && completed === performed
    && input.purpose.contentFit === 'fits'
    && input.purpose.evidence === 'improved'
    && input.continuation === 'choose'
  ) {
    return {
      kind: 'keep-current-candidate',
      headline: '今のプランを継続候補にする',
      reason: '内容完了、目的に沿う良い変化、再選択意向がそろっています。',
      nextStep: '次の1か月もSとFだけを同じ方法で記録する',
      changeCondition: '内容完了・目的に沿う変化・再選択意向のいずれかが変わった場合',
      barrier,
    };
  }
  const material = materialRecommendation(input);
  return {
    kind: 'confirm-materials',
    headline: '判断材料を一つ記録して再確認する',
    reason: material.reason,
    nextStep: withBarrierFocus(material.focus, barrier),
    changeCondition: material.changeCondition,
    barrier,
  };
}

export function buildAssessmentResult(input: ValidatedAssessmentInput): AssessmentResult {
  const monthly = calculateMonthlyEquivalent(input.fees);
  const duration = calculateMonthlyDuration(input.visits, input.time);
  const perVisit = calculatePerVisitResult(monthly.units, input.visits);
  const perHour = calculatePerHourResult(monthly.units, duration);
  const purpose = assessPurpose(monthly.units, input.visits, input.purpose);
  const price = assessPrice(
    input.fees,
    input.purpose.performed,
    input.alternative,
    input.usedServices,
  );
  const recommendation = buildPrimaryRecommendation(input, purpose, price);
  return {
    input,
    monthly,
    duration,
    perVisit,
    perHour,
    purpose,
    usedServiceLabels: input.usedServices.map(getUsedServiceLabel),
    price,
    recommendation,
  };
}

export function getPurposeLabel(purpose: PurposeId): string {
  return purposeOptions.find((option) => option.id === purpose)?.label ?? purpose;
}

export function getPurposeChangeExamples(purpose: PurposeId): string {
  return purposeGuidance[purpose].changeExamples;
}

export function getPurposeRecheckStep(purpose: PurposeId): string {
  return purposeGuidance[purpose].recheckStep;
}

export function getActivityLabel(activity: ActivityId): string {
  return activityOptions.find((option) => option.id === activity)?.label ?? activity;
}

export function getActivityCompletionExample(activity: ActivityId): string {
  return activityOptions.find((option) => option.id === activity)?.completionExample ?? '';
}

export function getActivityQualityQuestion(activity: ActivityId): string {
  return activityOptions.find((option) => option.id === activity)?.qualityQuestion ?? '';
}

export function getActivityAlternativeRequirement(activity: ActivityId): string {
  return activityOptions.find((option) => option.id === activity)?.alternativeRequirement ?? '';
}

export function getActivityReviewStep(activity: ActivityId): string {
  return activityOptions.find((option) => option.id === activity)?.reviewStep ?? '予定と実績の差を一つ確認する';
}

export function getContentFitLabel(contentFit: ContentFit): string {
  return contentFitOptions.find((option) => option.id === contentFit)?.label ?? contentFit;
}

export function getPurposeEvidenceLabel(evidence: PurposeEvidence): string {
  return purposeEvidenceOptions.find((option) => option.id === evidence)?.label ?? evidence;
}

export function getUsedServiceLabel(service: UsedServiceId): string {
  return usedServiceOptions.find((option) => option.id === service)?.label ?? service;
}

export function getContinuationLabel(continuation: ContinuationIntent): string {
  return continuationOptions.find((option) => option.id === continuation)?.label ?? continuation;
}

export function getSafetyLabel(safety: SafetyAnswer): string {
  return safetyOptions.find((option) => option.id === safety)?.label ?? safety;
}

export function getBarrierLabel(barrier: BarrierId): string {
  return barrierOptions.find((option) => option.id === barrier)?.label ?? barrier;
}

export function getVisitBandLabel(bandId: VisitBandId): string {
  return visitBandOptions.find((option) => option.id === bandId)?.label ?? bandId;
}
