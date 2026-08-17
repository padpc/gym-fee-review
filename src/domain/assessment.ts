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
export type BoundedVisitBandId = Exclude<VisitBandId, 'monthly-21-plus'>;

export type VisitKnowledge =
  | { kind: 'exact'; visits: number }
  | { kind: 'bounded'; bandId: BoundedVisitBandId; min: number; max: number }
  | { kind: 'at-least'; bandId: 'monthly-21-plus'; min: number }
  | { kind: 'unknown' };

export type FeeEntry =
  | { kind: 'none' }
  | { kind: 'known'; yen: number }
  | { kind: 'unknown' };

export interface FeeValues {
  baseMonthlyFeeYen: number;
  monthlyAdditional: FeeEntry;
  annualFee: FeeEntry;
}

export type UnknownFeeId = 'monthly-additional' | 'annual-fee';

interface MonthlyEquivalentBase {
  /** 1 unit = 1/12円。年会費÷12を小数で丸めずに保持する。 */
  units: number;
  roundedYen: number;
}

export type MonthlyEquivalent =
  | (MonthlyEquivalentBase & { kind: 'complete' })
  | (MonthlyEquivalentBase & { kind: 'known-subtotal'; unknownFees: UnknownFeeId[] });

/**
 * 館内利用時間。トレーニングだけでなく、着替え、プール、風呂、温泉、
 * サウナ、休憩など、施設内で過ごした時間を含む。
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
      bandId: BoundedVisitBandId;
      minVisits: number;
      maxVisits: number;
      minYenPerVisit: number;
      maxYenPerVisit: number;
    }
  | {
      kind: 'at-least';
      bandId: 'monthly-21-plus';
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

export interface CostUnavailableReasons {
  perVisit: 'visits-unknown' | 'zero-visits' | null;
  perHour: FacilityTimeUnavailableReason | null;
}

export const valueOptions = [
  { id: 'training', label: 'トレーニング設備・フリーウェイト' },
  { id: 'studio', label: 'スタジオ・プログラム' },
  { id: 'pool', label: 'プール・水中運動' },
  { id: 'bath-sauna', label: '風呂・温泉・サウナ・休憩' },
  { id: 'coaching', label: '指導・フォーム確認' },
  { id: 'social', label: '友人・コミュニティ' },
  { id: 'convenience', label: '立地・営業時間・通いやすさ' },
  { id: 'other', label: 'その他' },
] as const;

export type ValueId = (typeof valueOptions)[number]['id'];
export type ValueRole = 'primary' | 'secondary';

export const valueStatusOptions = [
  { id: 'fulfilled' },
  { id: 'partial' },
  { id: 'quality-below' },
  { id: 'not-used' },
  { id: 'unknown' },
] as const;

export type ValueStatus = (typeof valueStatusOptions)[number]['id'];

interface ValueAssessmentCopy {
  question: (customLabel: string) => string;
  statusLabels: Record<ValueStatus, string>;
}

export const valueAssessmentCopy = {
  training: {
    question: () => 'トレーニング設備・フリーウェイトは、期待どおり使えましたか',
    statusLabels: {
      fulfilled: '期待どおり使えた',
      partial: '一部の設備・時間帯だけ使えた',
      'quality-below': '使えたが、設備や混雑状況が期待以下だった',
      'not-used': '使いたかったが、ほとんど使えなかった',
      unknown: 'まだ判断できない',
    },
  },
  studio: {
    question: () => 'スタジオ・プログラムは、期待どおり参加できましたか',
    statusLabels: {
      fulfilled: '期待どおり参加できた',
      partial: '一部のプログラム・日時だけ参加できた',
      'quality-below': '参加できたが、内容や進め方が期待以下だった',
      'not-used': '参加したかったが、ほとんど参加できなかった',
      unknown: 'まだ判断できない',
    },
  },
  pool: {
    question: () => 'プール・水中運動は、期待どおり利用できましたか',
    statusLabels: {
      fulfilled: '期待どおり利用できた',
      partial: '一部の時間・内容だけ利用できた',
      'quality-below': '利用できたが、混雑や利用環境が期待以下だった',
      'not-used': '利用したかったが、ほとんど利用できなかった',
      unknown: 'まだ判断できない',
    },
  },
  'bath-sauna': {
    question: () => '風呂・温泉・サウナ・休憩設備は、期待どおり利用できましたか',
    statusLabels: {
      fulfilled: '期待どおり利用できた',
      partial: '一部の設備・時間だけ利用できた',
      'quality-below': '利用できたが、混雑・清潔さ・設備が期待以下だった',
      'not-used': '利用したかったが、ほとんど利用できなかった',
      unknown: 'まだ判断できない',
    },
  },
  coaching: {
    question: () => '指導・フォーム確認は、期待どおり受けられましたか',
    statusLabels: {
      fulfilled: '必要な指導・確認を受けられた',
      partial: '必要な指導・確認を一部受けられた',
      'quality-below': '受けられたが、内容や分かりやすさが期待以下だった',
      'not-used': '受けたかったが、ほとんど受けられなかった',
      unknown: 'まだ判断できない',
    },
  },
  social: {
    question: () => '期待していた交流やコミュニティとの関わりができましたか',
    statusLabels: {
      fulfilled: '期待していた交流ができた',
      partial: '期待していた交流が一部できた',
      'quality-below': '交流できたが、雰囲気や関わり方が期待以下だった',
      'not-used': '交流したかったが、ほとんど機会がなかった',
      unknown: 'まだ判断できない',
    },
  },
  convenience: {
    question: () => '立地・営業時間・通いやすさは、実際の生活に合っていましたか',
    statusLabels: {
      fulfilled: '生活に合い、無理なく通えた',
      partial: '一部の曜日・時間帯だけ生活に合っていた',
      'quality-below': '通えたが、立地や営業時間が期待ほど便利ではなかった',
      'not-used': '生活に合わず、ほとんど通えなかった',
      unknown: 'まだ判断できない',
    },
  },
  other: {
    question: (customLabel) => {
      const label = customLabel.trim();
      return label
        ? `「${label}」は、期待どおりでしたか`
        : 'その他の利用は、期待どおりでしたか';
    },
    statusLabels: {
      fulfilled: '期待どおりだった',
      partial: '一部は期待どおりだった',
      'quality-below': '利用できたが、内容や状態が期待以下だった',
      'not-used': '期待していたが、ほとんど実現しなかった',
      unknown: 'まだ判断できない',
    },
  },
} satisfies Record<ValueId, ValueAssessmentCopy>;

export interface ValueAssessmentInput {
  id: ValueId;
  customLabel: string;
  role: ValueRole;
  status: ValueStatus;
}

export interface ValueAssessment extends ValueAssessmentInput {
  label: string;
  statusLabel: string;
}

export type ValueEvidence = 'strong' | 'mixed' | 'weak' | 'uncertain' | 'none';

export interface ValueSummary {
  assessments: ValueAssessment[];
  primary: ValueAssessment | null;
  secondary: ValueAssessment[];
  evidence: ValueEvidence;
  supportReasons: string[];
  gapReasons: string[];
}

export const feeBurdenOptions = [
  { id: 'comfortable', label: '無理なく払える' },
  { id: 'slight-burden', label: '少し負担に感じる' },
  { id: 'review-needed', label: '家計上、見直しが必要' },
] as const;

export type FeeBurden = (typeof feeBurdenOptions)[number]['id'];

export type RecommendationKind =
  | 'keep'
  | 'keep-check-fees'
  | 'verify-value'
  | 'review-contract';

export const recommendationHeadlines: Record<RecommendationKind, string> = {
  keep: '今の会費を続ける根拠があります',
  'keep-check-fees': '価値はあります。料金条件を見直しましょう',
  'verify-value': 'あと1か月だけ、重要な利用を確認しましょう',
  'review-contract': '今の会費は見直し候補です',
};

export interface Recommendation {
  kind: RecommendationKind;
  headline: string;
  supportReasons: string[];
  reviewReasons: string[];
  nextActionTitle: string;
  nextAction: string;
}

export interface ValidatedAssessmentInput {
  fees: FeeValues;
  visits: VisitKnowledge;
  time: TimeInput;
  values: ValueAssessmentInput[];
  feeBurden: FeeBurden;
}

export interface AssessmentResult {
  input: ValidatedAssessmentInput;
  monthly: MonthlyEquivalent;
  duration: MonthlyDuration;
  perVisit: PerVisitResult;
  perHour: PerHourResult;
  costUnavailableReasons: CostUnavailableReasons;
  valueSummary: ValueSummary;
  recommendation: Recommendation;
}

function assertTenthHours(hours: number) {
  if (!Number.isFinite(hours) || hours < 0 || Math.abs(hours * 10 - Math.round(hours * 10)) > 1e-9) {
    throw new RangeError('totalHours must be a non-negative number in 0.1-hour increments.');
  }
}

function assertFeeEntry(entry: FeeEntry, name: string) {
  if (entry.kind === 'known' && (!Number.isSafeInteger(entry.yen) || entry.yen < 0)) {
    throw new RangeError(`${name}.yen must be a non-negative safe integer.`);
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
  if (!Number.isSafeInteger(fees.baseMonthlyFeeYen) || fees.baseMonthlyFeeYen < 0) {
    throw new RangeError('baseMonthlyFeeYen must be a non-negative safe integer.');
  }
  assertFeeEntry(fees.monthlyAdditional, 'monthlyAdditional');
  assertFeeEntry(fees.annualFee, 'annualFee');

  let units = yenToUnits(fees.baseMonthlyFeeYen);
  if (fees.monthlyAdditional.kind === 'known') {
    units += yenToUnits(fees.monthlyAdditional.yen);
  }
  if (fees.annualFee.kind === 'known') {
    units += fees.annualFee.yen;
  }

  const unknownFees: UnknownFeeId[] = [];
  if (fees.monthlyAdditional.kind === 'unknown') unknownFees.push('monthly-additional');
  if (fees.annualFee.kind === 'unknown') unknownFees.push('annual-fee');
  const base = { units, roundedYen: unitsToRoundedYen(units) };
  return unknownFees.length === 0
    ? { ...base, kind: 'complete' }
    : { ...base, kind: 'known-subtotal', unknownFees };
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

export function getValueLabel(id: ValueId): string {
  return valueOptions.find((option) => option.id === id)?.label ?? id;
}

export function getValueQuestion(id: ValueId, customLabel = ''): string {
  return valueAssessmentCopy[id].question(customLabel);
}

export function getValueStatusLabel(id: ValueId, status: ValueStatus): string {
  return valueAssessmentCopy[id].statusLabels[status];
}

function describeValue(value: ValueAssessment): string {
  return `「${value.label}」は${value.statusLabel}`;
}

function describeSupportValue(value: ValueAssessment): string {
  return value.status === 'partial'
    ? `「${value.label}」は${value.statusLabel}ため、会費を支える材料がある`
    : describeValue(value);
}

function describeGapValue(value: ValueAssessment): string {
  return value.status === 'partial'
    ? `「${value.label}」は${value.statusLabel}が、満たしていない点が残る`
    : describeValue(value);
}

export function buildValueSummary(values: ValueAssessmentInput[]): ValueSummary {
  const assessments = values.map((value): ValueAssessment => ({
    ...value,
    label: value.id === 'other' && value.customLabel.trim()
      ? value.customLabel.trim()
      : getValueLabel(value.id),
    statusLabel: getValueStatusLabel(value.id, value.status),
  }));
  const primary = assessments.find((value) => value.role === 'primary') ?? null;
  const secondary = assessments.filter((value) => value.role === 'secondary');
  if (!primary) {
    return {
      assessments,
      primary: null,
      secondary,
      evidence: 'none',
      supportReasons: [],
      gapReasons: [],
    };
  }

  const positiveStatuses = new Set<ValueStatus>(['fulfilled', 'partial']);
  const weakStatuses = new Set<ValueStatus>(['quality-below', 'not-used']);
  let evidence: ValueEvidence;
  if (primary.status === 'fulfilled') {
    evidence = 'strong';
  } else if (primary.status === 'partial') {
    evidence = 'mixed';
  } else if (weakStatuses.has(primary.status)) {
    evidence = 'weak';
  } else {
    evidence = 'uncertain';
  }

  return {
    assessments,
    primary,
    secondary,
    evidence,
    supportReasons: assessments
      .filter((value) => positiveStatuses.has(value.status))
      .map(describeSupportValue),
    gapReasons: assessments
      .filter((value) => value.status !== 'fulfilled')
      .map(describeGapValue),
  };
}

function describeUnknownFees(monthly: MonthlyEquivalent): string | null {
  if (monthly.kind === 'complete') return null;
  const labels = monthly.unknownFees.map((fee) => (
    fee === 'monthly-additional' ? '毎月の追加費用' : '年会費等'
  ));
  return `${labels.join('と')}が不明なため、表示額は入力済み金額だけの月額です`;
}

function buildRecommendation(
  monthly: MonthlyEquivalent,
  valueSummary: ValueSummary,
  feeBurden: FeeBurden,
  visits: VisitKnowledge,
): Recommendation {
  const supportReasons = [...valueSummary.supportReasons];
  const reviewReasons = [...valueSummary.gapReasons];
  const unknownFeeReason = describeUnknownFees(monthly);
  if (unknownFeeReason) reviewReasons.push(unknownFeeReason);

  if (feeBurden === 'comfortable') {
    supportReasons.push('入力済みの会費は家計上、無理なく払える');
  } else if (feeBurden === 'slight-burden') {
    reviewReasons.push('会費を少し負担に感じている');
  } else {
    reviewReasons.push('会費は家計上、見直しが必要');
  }

  if (visits.kind === 'exact' && visits.visits === 0) {
    reviewReasons.push('最近1か月の来館回数は0回');
  } else if (visits.kind === 'exact') {
    supportReasons.push(`最近1か月は${visits.visits}回来館した`);
  } else if (visits.kind === 'bounded') {
    supportReasons.push(`最近1か月の来館回数は月${visits.min}～${visits.max}回程度`);
  } else if (visits.kind === 'at-least') {
    supportReasons.push(`最近1か月の来館回数は月${visits.min}回以上`);
  } else {
    reviewReasons.push('最近1か月の来館回数が分からず、1回あたり料金は確定できない');
  }

  const incompleteFeeAction = monthly.kind === 'known-subtotal'
    ? {
        title: '支払総額を確定する',
        description: `次の支払い前に、契約書または直近の料金明細で${monthly.unknownFees.includes('monthly-additional') ? '毎月の追加費用' : ''}${monthly.unknownFees.length === 2 ? 'と' : ''}${monthly.unknownFees.includes('annual-fee') ? '年会費等' : ''}の金額を確認し、この診断へ入力し直す。`,
      }
    : null;

  const primaryStatus = valueSummary.primary?.status;
  const primaryLabel = valueSummary.primary?.label ?? '主な利用';
  const mustReview = (
    (visits.kind === 'exact' && visits.visits === 0)
    || primaryStatus === undefined
    || primaryStatus === 'quality-below'
    || primaryStatus === 'not-used'
    || ((primaryStatus === 'partial' || primaryStatus === 'unknown')
      && feeBurden === 'review-needed')
  );

  if (mustReview) {
    if (!primaryStatus) reviewReasons.unshift('会費を払う主な理由になる利用は特にない');
    let nextActionTitle = '休会・変更・退会の条件を比べる';
    let nextAction = '次の会費が発生する前に、会員ページまたは契約書で、休会・低料金プラン・退会の費用・申請期限・適用日を確認し、今の実質月額と比べる。';
    const hasNoRecentUse = visits.kind === 'exact' && visits.visits === 0;
    if (!hasNoRecentUse && primaryStatus === 'quality-below') {
      nextActionTitle = '期待以下だった条件を一つ変えて確かめる';
      nextAction = `次の利用前に、会員ページまたは受付で、「${primaryLabel}」の曜日・時間帯・担当・混雑など変更できる条件を一つ確認する。次の利用ではその条件だけを変え、期待に近づくか確かめる。`;
    } else if (!hasNoRecentUse && primaryStatus === 'not-used') {
      nextActionTitle = '一番大事な利用を実現できる条件を確認する';
      nextAction = `次の利用を決める前に、会員ページまたは受付で「${primaryLabel}」を利用できる曜日・時間・予約条件を確認し、自分の予定に合う枠があるか確かめる。`;
    }
    return {
      kind: 'review-contract',
      headline: recommendationHeadlines['review-contract'],
      supportReasons,
      reviewReasons,
      nextActionTitle: incompleteFeeAction?.title ?? nextActionTitle,
      nextAction: incompleteFeeAction?.description ?? nextAction,
    };
  }

  if (primaryStatus === 'partial' || primaryStatus === 'unknown') {
    return {
      kind: 'verify-value',
      headline: recommendationHeadlines['verify-value'],
      supportReasons,
      reviewReasons,
      nextActionTitle: incompleteFeeAction?.title ?? '一番大事な利用を1か月記録する',
      nextAction: incompleteFeeAction?.description
        ?? `次の1か月、ジムへ行った日と「${primaryLabel}」を使えたか・期待どおりだったかをスマホのカレンダーへ短く記録し、1か月後にもう一度診断する。`,
    };
  }

  if (monthly.kind === 'complete' && feeBurden === 'comfortable') {
    const visitsAreUnknown = visits.kind === 'unknown';
    return {
      kind: 'keep',
      headline: recommendationHeadlines.keep,
      supportReasons,
      reviewReasons,
      nextActionTitle: visitsAreUnknown
        ? '来館日を1か月記録する'
        : '次の確認日をカレンダーへ入れる',
      nextAction: visitsAreUnknown
        ? `次の1か月、ジムへ行った日と「${primaryLabel}」を使えたかをスマホのカレンダーへ記録し、1か月後に1回あたり料金をこの診断で確認する。`
        : `契約更新日の1か月前（更新日がなければ1か月後）を、実質月額・来館回数・「${primaryLabel}」をこの診断で確認する日としてカレンダーへ登録する。`,
    };
  }

  const visitsAreUnknown = visits.kind === 'unknown';
  return {
    kind: 'keep-check-fees',
    headline: recommendationHeadlines['keep-check-fees'],
    supportReasons,
    reviewReasons,
    nextActionTitle: incompleteFeeAction?.title
      ?? (visitsAreUnknown ? '来館日を1か月記録する' : '同じ利用を続けられる安い条件を探す'),
    nextAction: incompleteFeeAction?.description
      ?? (visitsAreUnknown
        ? `次の1か月、ジムへ行った日と「${primaryLabel}」を使えたかをスマホのカレンダーへ記録し、1か月後に1回あたり料金をこの診断で確認する。`
        : `次の契約更新前に、施設の料金表または会員ページで「${primaryLabel}」を使える低料金プランか割引を一つ探し、今の実質月額と比べる。`),
  };
}

export function buildAssessmentResult(input: ValidatedAssessmentInput): AssessmentResult {
  const monthly = calculateMonthlyEquivalent(input.fees);
  const duration = calculateMonthlyDuration(input.visits, input.time);
  const perVisit = calculatePerVisitResult(monthly.units, input.visits);
  const perHour = calculatePerHourResult(
    monthly.units,
    duration,
    input.time.kind === 'average-minutes' ? input.time.averageMinutes : undefined,
  );
  const valueSummary = buildValueSummary(input.values);
  return {
    input,
    monthly,
    duration,
    perVisit,
    perHour,
    costUnavailableReasons: {
      perVisit: perVisit.kind === 'unknown'
        ? 'visits-unknown'
        : perVisit.kind === 'exact' && perVisit.visits === 0
          ? 'zero-visits'
          : null,
      perHour: perHour.kind === 'unknown' ? perHour.reason : null,
    },
    valueSummary,
    recommendation: buildRecommendation(monthly, valueSummary, input.feeBurden, input.visits),
  };
}
