import {
  perVisitRoundedYen,
  roundRatioHalfUp,
  unitsToRoundedYen,
  yenToUnits,
} from './money';

export type VisitMode = 'exact' | 'range' | 'unknown';

export const visitBandOptions = [
  { id: 'monthly-1-2', label: '月1〜2回', min: 1, max: 2 },
  { id: 'monthly-3-4', label: '月3〜4回', min: 3, max: 4 },
  { id: 'monthly-5-8', label: '月5〜8回', min: 5, max: 8 },
  { id: 'monthly-9-plus', label: '月9回以上', min: 9, max: null },
] as const;

export type VisitBandId = (typeof visitBandOptions)[number]['id'];

export type VisitKnowledge =
  | { kind: 'exact'; visits: number }
  | { kind: 'bounded'; bandId: Exclude<VisitBandId, 'monthly-9-plus'>; min: number; max: number }
  | { kind: 'at-least'; bandId: 'monthly-9-plus'; min: number }
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

/**
 * 館内利用時間。トレーニングだけでなく、着替え、プール、風呂、温泉、
 * サウナ、休憩など、施設内で得た利用価値に使った時間を含む。
 */
export type TimeInput =
  | { kind: 'total-hours'; totalHours: number }
  | { kind: 'average-minutes'; averageMinutes: number }
  | { kind: 'unknown' };

export type FacilityTimeUnavailableReason =
  | 'facility-time-not-entered'
  | 'average-needs-visits'
  | 'zero-time';

export type MonthlyDuration =
  | { kind: 'exact'; minutes: number }
  | { kind: 'bounded'; minMinutes: number; maxMinutes: number }
  | { kind: 'at-least'; minMinutes: number }
  | { kind: 'unknown'; reason: Exclude<FacilityTimeUnavailableReason, 'zero-time'> };

export interface PerVisitScenario {
  visits: 1 | 2 | 4 | 8 | 12;
  yenPerVisit: number;
}

export interface PerHourScenario {
  visits: 1 | 2 | 4 | 8 | 12;
  totalMinutes: number;
  yenPerHour: number;
}

export type PerVisitResult =
  | { kind: 'exact'; visits: number; yenPerVisit: number | null; unusedPaymentYen: number }
  | {
      kind: 'bounded';
      bandId: Exclude<VisitBandId, 'monthly-9-plus'>;
      minVisits: number;
      maxVisits: number;
      minYenPerVisit: number;
      maxYenPerVisit: number;
    }
  | {
      kind: 'at-least';
      bandId: 'monthly-9-plus';
      minVisits: number;
      maxYenPerVisit: number;
    }
  | { kind: 'unknown'; reason: 'visits-unknown'; scenarios: PerVisitScenario[] };

export type PerHourResult =
  | { kind: 'exact'; minutes: number; yenPerHour: number }
  | {
      kind: 'bounded';
      minMinutes: number;
      maxMinutes: number;
      minYenPerHour: number;
      maxYenPerHour: number;
    }
  | { kind: 'at-least'; minMinutes: number; maxYenPerHour: number }
  | {
      kind: 'unknown';
      reason: FacilityTimeUnavailableReason;
      scenarios?: PerHourScenario[];
    };

export type CostUnavailableReason =
  | 'visits-unknown'
  | 'zero-visits'
  | FacilityTimeUnavailableReason;

export interface CostUnavailableReasons {
  perVisit: 'visits-unknown' | 'zero-visits' | null;
  perHour: FacilityTimeUnavailableReason | null;
}

export const valueOptions = [
  { id: 'training', label: 'トレーニング設備' },
  { id: 'studio', label: 'スタジオ・プログラム' },
  { id: 'pool', label: 'プール・水中運動' },
  { id: 'bath-sauna', label: '風呂・温泉・サウナ・休憩' },
  { id: 'coaching', label: '指導・フォーム確認' },
  { id: 'social', label: '友人・コミュニティ' },
  { id: 'convenience', label: '立地・営業時間・通いやすさ' },
  { id: 'other', label: 'その他' },
] as const;

export type ValueId = (typeof valueOptions)[number]['id'];

export const valueFrequencyOptions = [
  { id: 'once', label: '1回程度' },
  { id: 'several', label: '複数回' },
  { id: 'often', label: '多くの来館・日常で役立った' },
  { id: 'unknown', label: '覚えていない' },
] as const;
export type ValueFrequency = (typeof valueFrequencyOptions)[number]['id'];

export const valueFulfillmentOptions = [
  { id: 'met', label: '期待どおりだった' },
  { id: 'partly', label: '一部は期待どおりだった' },
  { id: 'unmet', label: '期待どおりではなかった' },
  { id: 'unknown', label: 'まだ判断できない' },
] as const;
export type ValueFulfillment = (typeof valueFulfillmentOptions)[number]['id'];

export const payReasonOptions = [
  { id: 'yes', label: '会費を払ってでも残したい' },
  { id: 'unsure', label: 'まだ判断できない' },
  { id: 'no', label: '会費を払う理由にはならない' },
] as const;
export type PayReason = (typeof payReasonOptions)[number]['id'];

export interface ValueAssessmentInput {
  id: ValueId;
  customLabel: string;
  frequency: ValueFrequency;
  fulfillment: ValueFulfillment;
  payReason: PayReason;
}

export interface ValueAssessment extends ValueAssessmentInput {
  label: string;
  frequencyLabel: string;
  fulfillmentLabel: string;
  payReasonLabel: string;
}

export interface TransparentCount<T> {
  id: T;
  count: number;
}

export interface ValueSummary {
  assessedCount: number;
  assessments: ValueAssessment[];
  strongValues: ValueAssessment[];
  tentativeValues: ValueAssessment[];
  nonPayingValues: ValueAssessment[];
  frequencyCounts: TransparentCount<ValueFrequency>[];
  fulfillmentCounts: TransparentCount<ValueFulfillment>[];
  importantFulfillmentCounts: TransparentCount<ValueFulfillment>[];
}

export const feeBurdenOptions = [
  { id: 'comfortable', label: '無理なく払える' },
  { id: 'slight-burden', label: '少し負担に感じる' },
  { id: 'review-needed', label: '家計上、見直しが必要' },
] as const;
export type FeeBurden = (typeof feeBurdenOptions)[number]['id'];

export const continuationOptions = [
  { id: 'choose', label: '同じ条件でも来月また選ぶ' },
  { id: 'unsure', label: '迷っている' },
  { id: 'not-choose', label: '同じ条件なら選ばない' },
] as const;
export type ContinuationIntent = (typeof continuationOptions)[number]['id'];

export const barrierOptions = [
  { id: 'price', label: '料金・会費' },
  { id: 'travel', label: '距離・移動' },
  { id: 'hours-reservation', label: '営業時間・予約' },
  { id: 'crowding', label: '混雑' },
  { id: 'offering', label: '設備・プログラム' },
  { id: 'cleanliness-comfort', label: '清潔さ・快適さ' },
  { id: 'schedule-habit', label: '予定・習慣化' },
  { id: 'temporary', label: '一時的に利用できなかった' },
  { id: 'other', label: 'その他' },
] as const;
export type BarrierId = (typeof barrierOptions)[number]['id'];

export interface BarrierConditionInput {
  values: ValueAssessmentInput[];
  feeBurden: FeeBurden;
  continuation: ContinuationIntent;
}

export type PrimaryRecommendationKind =
  | 'keep-reason'
  | 'keep-review-price'
  | 'preserve-value-reduce-cost'
  | 'review-use'
  | 'review-contract'
  | 'confirm-use-condition';

export const decisionRuleOptions = [
  { id: 'rule-1', label: '今月利用した価値がない' },
  { id: 'rule-2', label: '残したい価値があり、会費は家計上の見直しが必要' },
  { id: 'rule-3', label: '残したい価値があり、同じ条件なら来月は選ばない' },
  { id: 'rule-4', label: '残したい価値が期待未達または未確認' },
  { id: 'rule-5', label: '残したい価値があり、継続を迷うか会費を少し負担に感じる' },
  { id: 'rule-6', label: '残したい価値があり、来月も選び、会費を無理なく払える' },
  { id: 'rule-7', label: '残したい価値がなく、会費負担があるか来月は選ばない' },
  { id: 'rule-8', label: '会費を払う理由になるか確認中の価値がある' },
  { id: 'rule-9', label: '利用したが、会費を払って残したい価値はない' },
] as const;
export type DecisionRuleId = (typeof decisionRuleOptions)[number]['id'];

export interface PrimaryRecommendation {
  kind: PrimaryRecommendationKind;
  decisionRuleId: DecisionRuleId;
  decisionRuleLabel: string;
  headline: string;
  reason: string;
  nextStep: string;
  changeCondition: string;
  barrier: BarrierId | null;
}

export interface ValidatedAssessmentInput {
  fees: FeeValues;
  visits: VisitKnowledge;
  time: TimeInput;
  values: ValueAssessmentInput[];
  feeBurden: FeeBurden;
  continuation: ContinuationIntent;
  barrier: BarrierId | null;
}

export interface AssessmentResult {
  input: ValidatedAssessmentInput;
  monthly: MonthlyEquivalent;
  duration: MonthlyDuration;
  perVisit: PerVisitResult;
  perHour: PerHourResult;
  costUnavailableReasons: CostUnavailableReasons;
  valueSummary: ValueSummary;
  recommendation: PrimaryRecommendation;
}

function assertTenthHours(hours: number) {
  if (!Number.isFinite(hours) || hours < 0 || Math.abs(hours * 10 - Math.round(hours * 10)) > 1e-9) {
    throw new RangeError('totalHours must be a non-negative number in 0.1-hour increments.');
  }
}

function perHourRoundedYen(totalUnits: number, minutes: number): number {
  if (!Number.isSafeInteger(totalUnits) || totalUnits < 0) {
    throw new RangeError('totalUnits must be a non-negative safe integer.');
  }
  if (!Number.isSafeInteger(minutes) || minutes <= 0) {
    throw new RangeError('minutes must be a positive safe integer.');
  }
  return roundRatioHalfUp(totalUnits * 60, 12 * minutes);
}

export function calculateMonthlyEquivalent(fees: FeeValues): MonthlyEquivalent {
  const units = yenToUnits(fees.monthlyFeeYen + fees.monthlyFixedFeeYen) + fees.annualFeeYen;
  return { units, roundedYen: unitsToRoundedYen(units) };
}

export function calculatePerVisitResult(
  monthlyUnits: number,
  visits: VisitKnowledge,
): PerVisitResult {
  if (visits.kind === 'unknown') {
    const scenarios = ([1, 2, 4, 8, 12] as const).map((scenarioVisits) => ({
      visits: scenarioVisits,
      yenPerVisit: perVisitRoundedYen(monthlyUnits, scenarioVisits) ?? 0,
    }));
    return { kind: 'unknown', reason: 'visits-unknown', scenarios };
  }
  if (visits.kind === 'exact') {
    return {
      kind: 'exact',
      visits: visits.visits,
      yenPerVisit: perVisitRoundedYen(monthlyUnits, visits.visits),
      unusedPaymentYen: visits.visits === 0 ? unitsToRoundedYen(monthlyUnits) : 0,
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
  return {
    kind: 'at-least',
    bandId: visits.bandId,
    minVisits: visits.min,
    maxYenPerVisit: perVisitRoundedYen(monthlyUnits, visits.min) ?? 0,
  };
}

export function calculateMonthlyDuration(
  visits: VisitKnowledge,
  time: TimeInput,
): MonthlyDuration {
  if (time.kind === 'unknown') {
    return { kind: 'unknown', reason: 'facility-time-not-entered' };
  }
  if (time.kind === 'total-hours') {
    assertTenthHours(time.totalHours);
    return { kind: 'exact', minutes: Math.round(time.totalHours * 60) };
  }
  if (!Number.isSafeInteger(time.averageMinutes) || time.averageMinutes <= 0) {
    throw new RangeError('averageMinutes must be a positive safe integer.');
  }
  if (visits.kind === 'unknown') {
    return { kind: 'unknown', reason: 'average-needs-visits' };
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
  return { kind: 'at-least', minMinutes: visits.min * time.averageMinutes };
}

export function calculatePerHourResult(
  monthlyUnits: number,
  duration: MonthlyDuration,
  averageMinutes?: number,
): PerHourResult {
  if (duration.kind === 'unknown') {
    if (duration.reason === 'average-needs-visits' && averageMinutes !== undefined) {
      if (!Number.isSafeInteger(averageMinutes) || averageMinutes <= 0) {
        throw new RangeError('averageMinutes must be a positive safe integer.');
      }
      const scenarios = ([1, 2, 4, 8, 12] as const).map((visits) => {
        const totalMinutes = visits * averageMinutes;
        return { visits, totalMinutes, yenPerHour: perHourRoundedYen(monthlyUnits, totalMinutes) };
      });
      return { kind: 'unknown', reason: duration.reason, scenarios };
    }
    return { kind: 'unknown', reason: duration.reason };
  }
  if (duration.kind === 'exact') {
    if (duration.minutes === 0) return { kind: 'unknown', reason: 'zero-time' };
    return {
      kind: 'exact',
      minutes: duration.minutes,
      yenPerHour: perHourRoundedYen(monthlyUnits, duration.minutes),
    };
  }
  if (duration.kind === 'bounded') {
    if (duration.minMinutes <= 0 || duration.maxMinutes <= 0) {
      return { kind: 'unknown', reason: 'zero-time' };
    }
    return {
      kind: 'bounded',
      minMinutes: duration.minMinutes,
      maxMinutes: duration.maxMinutes,
      minYenPerHour: perHourRoundedYen(monthlyUnits, duration.maxMinutes),
      maxYenPerHour: perHourRoundedYen(monthlyUnits, duration.minMinutes),
    };
  }
  if (duration.minMinutes <= 0) return { kind: 'unknown', reason: 'zero-time' };
  return {
    kind: 'at-least',
    minMinutes: duration.minMinutes,
    maxYenPerHour: perHourRoundedYen(monthlyUnits, duration.minMinutes),
  };
}

function countBy<T extends string>(items: readonly T[], options: readonly T[]): TransparentCount<T>[] {
  return options.map((id) => ({ id, count: items.filter((item) => item === id).length }));
}

export function buildValueSummary(values: ValueAssessmentInput[]): ValueSummary {
  const assessments = values.map((value): ValueAssessment => ({
    ...value,
    label: value.id === 'other' && value.customLabel.trim()
      ? value.customLabel.trim()
      : getValueLabel(value.id),
    frequencyLabel: getValueFrequencyLabel(value.frequency),
    fulfillmentLabel: getValueFulfillmentLabel(value.fulfillment),
    payReasonLabel: getPayReasonLabel(value.payReason),
  }));
  const important = assessments.filter((value) => value.payReason !== 'no');
  return {
    assessedCount: assessments.length,
    assessments,
    strongValues: assessments.filter((value) => value.payReason === 'yes'),
    tentativeValues: assessments.filter((value) => value.payReason === 'unsure'),
    nonPayingValues: assessments.filter((value) => value.payReason === 'no'),
    frequencyCounts: countBy(
      assessments.map((value) => value.frequency),
      valueFrequencyOptions.map((option) => option.id),
    ),
    fulfillmentCounts: countBy(
      assessments.map((value) => value.fulfillment),
      valueFulfillmentOptions.map((option) => option.id),
    ),
    importantFulfillmentCounts: countBy(
      important.map((value) => value.fulfillment),
      valueFulfillmentOptions.map((option) => option.id),
    ),
  };
}

export function requiresBarrier(input: BarrierConditionInput): boolean {
  return (
    !input.values.some((value) => value.payReason === 'yes')
    || input.feeBurden !== 'comfortable'
    || input.continuation !== 'choose'
  );
}

const barrierGuidance: Record<BarrierId, { nextStep: string; changeCondition: string }> = {
  price: {
    nextStep: '休会・低料金プラン・割引の条件を公式料金表か契約書で1つ確認する。',
    changeCondition: '残したい価値を保ったまま、無理なく払える費用になれば継続を再判断する。',
  },
  travel: {
    nextStep: '実際に通える曜日と移動時間を1回分だけ予定表に置いてみる。',
    changeCondition: '移動を含めても無理なく通える見通しが立てば継続を再判断する。',
  },
  'hours-reservation': {
    nextStep: '使いたい設備・プログラムを利用できる曜日、時間、予約条件を確認する。',
    changeCondition: '使いたい価値を必要な時間帯に確保できれば継続を再判断する。',
  },
  crowding: {
    nextStep: '混雑しにくい候補時間を1つ決め、その時間に一度利用して確かめる。',
    changeCondition: '必要な設備や場所を待ちすぎず使えれば継続を再判断する。',
  },
  offering: {
    nextStep: '残したい価値に必要な設備・プログラム・指導が使えるか1つ確認する。',
    changeCondition: '残したい価値を期待どおり得られる条件が整えば継続を再判断する。',
  },
  'cleanliness-comfort': {
    nextStep: '気になった場所と時間帯を1つ特定し、別の時間帯でも同じか確かめる。',
    changeCondition: '継続を妨げない清潔さ・居心地だと確認できれば再判断する。',
  },
  'schedule-habit': {
    nextStep: '無理のない利用予定を次の1か月に1回だけ先に入れる。',
    changeCondition: '予定どおり利用でき、残したい価値を得られれば継続を再判断する。',
  },
  temporary: {
    nextStep: '今月だけ使えなかった事情が解消する時期を決め、その後に1回利用する。',
    changeCondition: '一時的な事情が解消した後も使えなければ契約を見直す。',
  },
  other: {
    nextStep: '継続を迷わせる条件を一文で書き、その条件を次の1回で確かめる。',
    changeCondition: '書き出した条件が解消し、残したい価値を得られれば継続を再判断する。',
  },
};

function listValueEvidence(values: ValueAssessment[]): string {
  return values
    .map((value) => `「${value.label}」（${value.frequencyLabel}、${value.fulfillmentLabel}）`)
    .join('、');
}

function describeFrequencyUse(values: ValueAssessment[]): string {
  return values
    .map((value) => {
      if (value.frequency === 'unknown') {
        return value.payReason === 'no'
          ? `「${value.label}」は利用頻度を覚えておらず、会費を払う理由にはならないという回答です`
          : `「${value.label}」は利用頻度の記録が不足しています`;
      }
      if (value.frequency === 'once') {
        return value.payReason === 'no'
          ? `「${value.label}」は1回程度利用しましたが、会費を払う理由にはならないという回答です`
          : `「${value.label}」は低頻度でも会費を払う理由になるかの確認が必要です`;
      }
      return value.payReason === 'no'
        ? `「${value.label}」は繰り返し利用しましたが、会費を払う理由にはならないという回答です`
        : `「${value.label}」は繰り返し利用しても会費を払う理由が定まっていません`;
    })
    .join('。');
}

function describeAllFrequencyEvidence(values: ValueAssessment[]): string {
  if (values.length === 0) return '';
  const evidence = values.map((value) => {
    if (value.payReason === 'yes') {
      if (value.frequency === 'unknown') {
        return `「${value.label}」は利用頻度を覚えていませんが、残したい価値と回答`;
      }
      if (value.frequency === 'often') {
        return `「${value.label}」は多くの来館または日常で役立ち、残したい価値と回答`;
      }
      return `「${value.label}」は${value.frequencyLabel}利用し、残したい価値と回答`;
    }
    if (value.payReason === 'unsure') {
      return describeFrequencyUse([value]);
    }
    return describeFrequencyUse([value]);
  });
  return `利用頻度を結論の根拠へ反映：${evidence.join('。')}。`;
}

function describeDecisionInputs(
  summary: ValueSummary,
  feeBurden: FeeBurden,
  continuation: ContinuationIntent,
): string {
  const strongLabels = summary.strongValues.length > 0
    ? summary.strongValues.map((value) => `「${value.label}」`).join('、')
    : 'ありません';
  return `判断材料：会費を払って残したい価値は${strongLabels}。継続意向は「${getContinuationLabel(continuation)}」、会費負担は「${getFeeBurdenLabel(feeBurden)}」です。`;
}

function valueBasedNextStep(
  summary: ValueSummary,
  costReasons: CostUnavailableReasons,
): string {
  const unmet = summary.strongValues.find((value) => value.fulfillment === 'unmet');
  if (unmet) return `次の1回で「${unmet.label}」が期待どおりになる条件を1つ試す。`;
  const fulfillmentUnknown = summary.strongValues.find(
    (value) => value.fulfillment === 'unknown',
  );
  if (fulfillmentUnknown) {
    return `次の利用直後に「${fulfillmentUnknown.label}」が期待どおりだったか記録する。`;
  }
  const frequencyUnknown = summary.strongValues.find((value) => value.frequency === 'unknown');
  if (frequencyUnknown) {
    return `次の1か月だけ「${frequencyUnknown.label}」を使った日を記録する。`;
  }
  const once = summary.strongValues.find((value) => value.frequency === 'once');
  if (once) {
    return `月末に「${once.label}」が同じ頻度でも会費を払う理由になるか再確認する。`;
  }
  if (costReasons.perVisit === 'visits-unknown') {
    return '次の1か月だけ来館日を記録し、1回あたり料金を確定する。';
  }
  if (costReasons.perHour === 'facility-time-not-entered') {
    return '時間あたり料金も知りたい場合だけ、次の利用で館内利用時間を記録する。';
  }
  return '次の1か月も同じ使い方を続け、月末に同じ条件で再確認する。';
}

export function buildPrimaryRecommendation(
  summary: ValueSummary,
  feeBurden: FeeBurden,
  continuation: ContinuationIntent,
  barrier: BarrierId | null,
  costReasons: CostUnavailableReasons = { perVisit: null, perHour: null },
): PrimaryRecommendation {
  const strong = summary.strongValues;
  const guidance = barrier ? barrierGuidance[barrier] : null;

  let kind: PrimaryRecommendationKind;
  let decisionRuleId: DecisionRuleId;
  let headline: string;
  let reason: string;

  // R5の決定木は、ここに記載した順序そのものを優先順位として扱う。
  if (summary.assessedCount === 0) {
    decisionRuleId = 'rule-1';
    kind = 'confirm-use-condition';
    headline = '今月は利用できていません。続ける条件を確認しましょう';
    const burdenReason = feeBurden === 'comfortable'
      ? '会費は無理なく払える'
      : feeBurden === 'slight-burden'
        ? '会費を少し負担に感じている'
        : '会費は家計上の見直しが必要';
    const continuationReason = continuation === 'choose'
      ? '同じ条件でも来月は選ぶ意向です'
      : continuation === 'unsure'
        ? '来月も選ぶか迷っています'
        : '同じ条件なら来月は選ばない意向です';
    reason = `今月利用した価値項目はありません。${burdenReason}一方、${continuationReason}。`;
  } else if (strong.length > 0 && feeBurden === 'review-needed') {
    decisionRuleId = 'rule-2';
    kind = 'preserve-value-reduce-cost';
    headline = '価値を残しながら費用を見直す段階です';
    reason = `${listValueEvidence(strong)}は会費を払って残したい価値ですが、現在の会費は家計上の見直しが必要です。`;
  } else if (strong.length > 0 && continuation === 'not-choose') {
    decisionRuleId = 'rule-3';
    kind = 'review-contract';
    headline = '残したい価値はありますが、今の条件での継続は見直し候補です';
    reason = `${listValueEvidence(strong)}は会費を払って残したい価値ですが、同じ条件なら来月は選ばないという回答です。`;
  } else if (strong.some((value) => value.fulfillment === 'unmet' || value.fulfillment === 'unknown')) {
    decisionRuleId = 'rule-4';
    kind = 'review-use';
    headline = '払う理由にしたい価値が、期待を満たすか確認が必要です';
    const needsConfirmation = strong.filter(
      (value) => value.fulfillment === 'unmet' || value.fulfillment === 'unknown',
    );
    reason = `${listValueEvidence(needsConfirmation)}は会費を払って残したい価値ですが、期待充足が未達または未確認です。`;
  } else if (strong.length > 0 && (continuation === 'unsure' || feeBurden === 'slight-burden')) {
    decisionRuleId = 'rule-5';
    kind = feeBurden === 'slight-burden' ? 'keep-review-price' : 'review-use';
    headline = '価値はあります。迷いの原因と料金条件を確認しましょう';
    reason = feeBurden === 'slight-burden'
      ? `${listValueEvidence(strong)}は会費を払って残したい価値ですが、会費を少し負担に感じています。`
      : `${listValueEvidence(strong)}は会費を払って残したい価値ですが、同じ条件で来月も選ぶか迷っています。`;
  } else if (strong.length > 0 && continuation === 'choose' && feeBurden === 'comfortable') {
    decisionRuleId = 'rule-6';
    kind = 'keep-reason';
    headline = 'あなたには、この会費を払って続ける理由があります';
    reason = `${listValueEvidence(strong)}は、あなたが会費を払ってでも残したい価値です。会費も無理なく払え、来月も同じ条件で選ぶ意向があります。`;
  } else if (feeBurden !== 'comfortable' || continuation === 'not-choose') {
    decisionRuleId = 'rule-7';
    kind = 'review-contract';
    headline = '今の契約は見直し候補です';
    reason = feeBurden === 'review-needed'
      ? '会費は家計上の見直しが必要で、会費を払って残したいと決めた価値もありません。'
      : continuation === 'not-choose'
        ? '同じ条件なら来月は選ばず、会費を払って残したいと決めた価値もありません。'
        : '会費を少し負担に感じ、会費を払って残したいと決めた価値もありません。';
  } else if (summary.tentativeValues.length > 0) {
    decisionRuleId = 'rule-8';
    kind = 'review-use';
    headline = '1か月だけ、残したい価値が得られるか確かめましょう';
    reason = `${listValueEvidence(summary.tentativeValues)}を会費の理由にできるか、まだ判断が定まっていません。`;
  } else {
    decisionRuleId = 'rule-9';
    kind = 'review-use';
    headline = '利用はしていますが、会費を払う理由はまだ見つかっていません';
    reason = '利用した内容はありますが、会費を払って残したい価値にはなっていません。';
  }

  reason = `${reason} ${describeAllFrequencyEvidence(summary.assessments)} ${describeDecisionInputs(summary, feeBurden, continuation)}`;

  return {
    kind,
    decisionRuleId,
    decisionRuleLabel: decisionRuleOptions.find((rule) => rule.id === decisionRuleId)?.label ?? '',
    headline,
    reason,
    nextStep: guidance?.nextStep ?? valueBasedNextStep(summary, costReasons),
    changeCondition: guidance?.changeCondition
      ?? (kind === 'keep-reason'
        ? '会費負担が増える、残したい価値を得られない、または来月は選ばないと感じたら見直す。'
        : '次の確認後も会費を払う理由になる価値がなければ、休会・プラン変更・退会を検討する。'),
    barrier,
  };
}

export function buildAssessmentResult(input: ValidatedAssessmentInput): AssessmentResult {
  const monthly = calculateMonthlyEquivalent(input.fees);
  const perVisit = calculatePerVisitResult(monthly.units, input.visits);
  const duration = calculateMonthlyDuration(input.visits, input.time);
  const perHour = calculatePerHourResult(
    monthly.units,
    duration,
    input.time.kind === 'average-minutes' ? input.time.averageMinutes : undefined,
  );
  const valueSummary = buildValueSummary(input.values);
  const costUnavailableReasons: CostUnavailableReasons = {
    perVisit: perVisit.kind === 'unknown'
      ? 'visits-unknown'
      : perVisit.kind === 'exact' && perVisit.visits === 0
        ? 'zero-visits'
        : null,
    perHour: perHour.kind === 'unknown' ? perHour.reason : null,
  };
  return {
    input,
    monthly,
    duration,
    perVisit,
    perHour,
    costUnavailableReasons,
    valueSummary,
    recommendation: buildPrimaryRecommendation(
      valueSummary,
      input.feeBurden,
      input.continuation,
      input.barrier,
      costUnavailableReasons,
    ),
  };
}

export function getVisitBandLabel(id: VisitBandId): string {
  return visitBandOptions.find((option) => option.id === id)?.label ?? id;
}

export function getValueLabel(id: ValueId): string {
  return valueOptions.find((option) => option.id === id)?.label ?? id;
}

export function getValueFrequencyLabel(id: ValueFrequency): string {
  return valueFrequencyOptions.find((option) => option.id === id)?.label ?? id;
}

export function getValueFulfillmentLabel(id: ValueFulfillment): string {
  return valueFulfillmentOptions.find((option) => option.id === id)?.label ?? id;
}

export function getPayReasonLabel(id: PayReason): string {
  return payReasonOptions.find((option) => option.id === id)?.label ?? id;
}

export function getFeeBurdenLabel(id: FeeBurden): string {
  return feeBurdenOptions.find((option) => option.id === id)?.label ?? id;
}

export function getContinuationLabel(id: ContinuationIntent): string {
  return continuationOptions.find((option) => option.id === id)?.label ?? id;
}

export function getBarrierLabel(id: BarrierId): string {
  return barrierOptions.find((option) => option.id === id)?.label ?? id;
}
