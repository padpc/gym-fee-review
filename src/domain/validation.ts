import {
  activityOptions,
  barrierOptions,
  contentFitOptions,
  continuationOptions,
  purposeEvidenceOptions,
  purposeOptions,
  requiresBarrier,
  safetyOptions,
  usedServiceOptions,
  visitBandOptions,
  type ActivityId,
  type AlternativeInput,
  type BarrierId,
  type ContentFit,
  type CountKnowledge,
  type ContinuationIntent,
  type EquivalenceAnswer,
  type KnownAlternative,
  type PurposeEvidence,
  type PurposeId,
  type SafetyAnswer,
  type TimeInput,
  type UsedServiceId,
  type ValidatedAssessmentInput,
  type VisitBandId,
  type VisitKnowledge,
  type VisitMode,
} from './assessment';

export type ErrorMap = Record<string, string>;
export type TimeMode = TimeInput['kind'] | '';
export type CountMode = CountKnowledge['kind'] | '';
export type AlternativeAvailability = AlternativeInput['availability'] | '';
export type AlternativeKind = KnownAlternative['pricing']['kind'] | '';
export type AdditionalFeesMode = 'none' | 'known' | '';

export interface RawAssessmentInput {
  monthlyFee: string;
  additionalFeesMode: AdditionalFeesMode;
  monthlyFixedFee: string;
  annualFee: string;
  visitMode: VisitMode | '';
  visitBand: VisitBandId | '';
  exactVisits: string;
  timeMode: TimeMode;
  totalHours: string;
  averageMinutes: string;
  purpose: PurposeId | '';
  activity: ActivityId | '';
  performedMode: CountMode;
  performedCount: string;
  completedMode: CountMode;
  completedCount: string;
  contentFit: ContentFit | '';
  purposeEvidence: PurposeEvidence | '';
  usedServices: UsedServiceId[];
  continuation: ContinuationIntent | '';
  safety: SafetyAnswer | '';
  barrier: BarrierId | '';
  alternativeAvailability: AlternativeAvailability;
  alternativeKind: AlternativeKind;
  alternativeName: string;
  alternativeMonthlyFee: string;
  alternativePerVisitFee: string;
  alternativeAdditionalFeesMode: AdditionalFeesMode;
  alternativeMonthlyFixedFee: string;
  alternativeAnnualFee: string;
  alternativeServiceMonthlyFee: string;
  equivalenceServices: EquivalenceAnswer | '';
  equivalenceHours: EquivalenceAnswer | '';
  equivalenceLocation: EquivalenceAnswer | '';
  alternativeSourceConfirmed: boolean;
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: ErrorMap };
type ValueValidationResult = { ok: true; value: number } | { ok: false; error: string };

const fullWidthZeroCode = '０'.charCodeAt(0);
const asciiZeroCode = '0'.charCodeAt(0);
const equivalenceAnswers = new Set<EquivalenceAnswer>([
  'meets',
  'does-not-meet',
  'unknown',
  'not-required',
]);

export function createEmptyRawAssessmentInput(): RawAssessmentInput {
  return {
    monthlyFee: '',
    additionalFeesMode: '',
    monthlyFixedFee: '',
    annualFee: '',
    visitMode: '',
    visitBand: '',
    exactVisits: '',
    timeMode: 'unknown',
    totalHours: '',
    averageMinutes: '',
    purpose: '',
    activity: '',
    performedMode: '',
    performedCount: '',
    completedMode: '',
    completedCount: '',
    contentFit: '',
    purposeEvidence: '',
    usedServices: [],
    continuation: '',
    safety: '',
    barrier: '',
    alternativeAvailability: 'unknown',
    alternativeKind: '',
    alternativeName: '',
    alternativeMonthlyFee: '',
    alternativePerVisitFee: '',
    alternativeAdditionalFeesMode: '',
    alternativeMonthlyFixedFee: '',
    alternativeAnnualFee: '',
    alternativeServiceMonthlyFee: '',
    equivalenceServices: '',
    equivalenceHours: '',
    equivalenceLocation: '',
    alternativeSourceConfirmed: false,
  };
}

function countFromRaw(mode: CountMode, rawValue: string): CountKnowledge | null {
  if (mode === 'unknown') return { kind: 'unknown' };
  if (mode !== 'exact') return null;
  const normalized = normalizeDigits(rawValue);
  if (!/^\d+$/.test(normalized)) return null;
  const count = Number(normalized);
  return Number.isSafeInteger(count) && count >= 0 && count <= 100
    ? { kind: 'exact', count }
    : null;
}

export function rawRequiresBarrier(raw: RawAssessmentInput): boolean {
  if (raw.safety === 'concern') return false;
  const performed = countFromRaw(raw.performedMode, raw.performedCount);
  const completed = countFromRaw(raw.completedMode, raw.completedCount);
  if (performed?.kind === 'exact' && performed.count === 0) return true;
  if (completed?.kind === 'exact' && completed.count === 0) return true;
  if (
    performed?.kind === 'exact'
    && completed?.kind === 'exact'
    && completed.count < performed.count
  ) {
    return true;
  }
  if (raw.contentFit && raw.contentFit !== 'fits') return true;
  if (raw.purposeEvidence && raw.purposeEvidence !== 'improved') return true;
  return Boolean(raw.continuation && raw.continuation !== 'choose');
}

export function validateAssessmentInput(
  raw: RawAssessmentInput,
): ValidationResult<ValidatedAssessmentInput> {
  const errors: ErrorMap = {};
  const fees = validateFees(raw, errors);
  const visits = validateVisits(raw, errors);
  const time = validateTime(raw, errors);

  if (
    visits?.kind === 'exact'
    && visits.visits === 0
    && time?.kind === 'total-hours'
    && time.totalHours > 0
  ) {
    errors['total-hours'] = '来館0回の月に、正の実運動時間は入力できません。';
  }

  const validPurposes = new Set(purposeOptions.map((option) => option.id));
  const validActivities = new Set(activityOptions.map((option) => option.id));
  const validFit = new Set(contentFitOptions.map((option) => option.id));
  const validEvidence = new Set(purposeEvidenceOptions.map((option) => option.id));
  const validContinuation = new Set(continuationOptions.map((option) => option.id));
  const validSafety = new Set(safetyOptions.map((option) => option.id));
  const validBarriers = new Set(barrierOptions.map((option) => option.id));
  const validServices = new Set(usedServiceOptions.map((option) => option.id));
  const contentFit = raw.contentFit && validFit.has(raw.contentFit) ? raw.contentFit : null;
  const purposeEvidence = raw.purposeEvidence && validEvidence.has(raw.purposeEvidence)
    ? raw.purposeEvidence
    : null;
  const continuation = raw.continuation && validContinuation.has(raw.continuation)
    ? raw.continuation
    : null;
  const safety = raw.safety && validSafety.has(raw.safety) ? raw.safety : null;

  if (!raw.purpose || !validPurposes.has(raw.purpose)) {
    errors.purpose = '主な目的を選んでください。';
  }
  if (!raw.activity || !validActivities.has(raw.activity)) {
    errors.activity = '主な活動を選んでください。';
  }
  const performed = validateCountKnowledge(
    raw.performedMode,
    raw.performedCount,
    0,
    'performed-mode',
    'performed-count',
    '目的活動を行った回数S',
    errors,
  );
  const completed = validateCountKnowledge(
    raw.completedMode,
    raw.completedCount,
    0,
    'completed-mode',
    'completed-count',
    '予定内容を完了した回数F',
    errors,
  );
  if (!contentFit) {
    errors['content-fit'] = '活動の内容・強度・難易度が合っていたか選んでください。';
  }
  if (!purposeEvidence) {
    errors['purpose-evidence'] = '目的に沿う変化を選んでください。';
  }
  if (!continuation) {
    errors.continuation = '同じ条件なら来月も選びたいか選んでください。';
  }
  if (!safety) {
    errors.safety = '運動中・後に確認したい症状があったか選んでください。';
  }

  const uniqueServices = [...new Set(raw.usedServices)];
  if (
    uniqueServices.length === 0
    || uniqueServices.some((service) => !validServices.has(service))
  ) {
    errors['used-services'] = '実際に使った付帯サービスを選んでください。該当しない場合は「特になし」を選びます。';
  } else if (uniqueServices.includes('none') && uniqueServices.length > 1) {
    errors['used-services'] = '「特になし」と他の付帯サービスは同時に選べません。';
  }

  const knownVisitMaximum = visits?.kind === 'exact'
    ? visits.visits
    : visits?.kind === 'bounded'
      ? visits.max
      : null;
  if (
    knownVisitMaximum !== null
    && performed?.kind === 'exact'
    && performed.count > knownVisitMaximum
  ) {
    errors['performed-count'] = '目的活動回数Sは、来館回数の上限' + knownVisitMaximum + '回以下で入力してください。';
  }
  if (
    knownVisitMaximum !== null
    && completed?.kind === 'exact'
    && completed.count > knownVisitMaximum
  ) {
    errors['completed-count'] = '内容完了回数Fは、来館回数の上限' + knownVisitMaximum + '回以下で入力してください。';
  }
  if (
    performed?.kind === 'exact'
    && completed?.kind === 'exact'
    && completed.count > performed.count
  ) {
    errors['completed-count'] = '内容完了回数Fは、目的活動回数S以下で入力してください。';
  }

  let barrier: BarrierId | null = null;
  if (performed && completed && contentFit && purposeEvidence && continuation && safety) {
    const required = requiresBarrier({
      performed,
      completed,
      contentFit,
      evidence: purposeEvidence,
      continuation,
      safety,
    });
    if (required) {
      if (!raw.barrier || !validBarriers.has(raw.barrier)) {
        errors.barrier = '利用を妨げた主な要因を選んでください。';
      } else {
        barrier = raw.barrier;
      }
    }
  }

  const alternative = validateAlternative(raw, errors);
  if (
    Object.keys(errors).length > 0
    || !fees.monthlyFee.ok
    || !fees.monthlyFixedFee.ok
    || !fees.annualFee.ok
    || !visits
    || !time
    || !raw.purpose
    || !validPurposes.has(raw.purpose)
    || !raw.activity
    || !validActivities.has(raw.activity)
    || !performed
    || !completed
    || !contentFit
    || !purposeEvidence
    || !continuation
    || !safety
    || uniqueServices.length === 0
    || uniqueServices.some((service) => !validServices.has(service))
    || (uniqueServices.includes('none') && uniqueServices.length > 1)
    || !alternative
  ) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      fees: {
        monthlyFeeYen: fees.monthlyFee.value,
        monthlyFixedFeeYen: fees.monthlyFixedFee.value,
        annualFeeYen: fees.annualFee.value,
      },
      visits,
      time,
      purpose: {
        purpose: raw.purpose,
        activity: raw.activity,
        performed,
        completed,
        contentFit,
        evidence: purposeEvidence,
      },
      usedServices: uniqueServices,
      continuation,
      safety,
      barrier,
      alternative,
    },
  };
}

export function normalizeDigits(rawValue: string): string {
  return rawValue
    .trim()
    .replace(/[０-９]/g, (character) =>
      String.fromCharCode(character.charCodeAt(0) - fullWidthZeroCode + asciiZeroCode),
    )
    .replace(/．/g, '.');
}

function validateInteger(
  rawValue: string,
  minimum: number,
  maximum: number,
  emptyMessage: string,
  invalidMessage: string,
): ValueValidationResult {
  const normalized = normalizeDigits(rawValue);
  if (normalized === '') return { ok: false, error: emptyMessage };
  if (normalized.length > String(maximum).length) return { ok: false, error: invalidMessage };
  if (!/^\d+$/.test(normalized)) return { ok: false, error: invalidMessage };

  const value = Number(normalized);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    return { ok: false, error: invalidMessage };
  }
  return { ok: true, value };
}

function validateOptionalInteger(
  rawValue: string,
  maximum: number,
  invalidMessage: string,
): ValueValidationResult {
  if (normalizeDigits(rawValue) === '') return { ok: true, value: 0 };
  return validateInteger(rawValue, 0, maximum, '', invalidMessage);
}

function validateOneDecimal(
  rawValue: string,
  minimumTenths: number,
  maximumTenths: number,
  emptyMessage: string,
  invalidMessage: string,
): ValueValidationResult {
  const normalized = normalizeDigits(rawValue);
  if (normalized === '') return { ok: false, error: emptyMessage };
  if (!/^\d+(?:\.\d)?$/.test(normalized)) return { ok: false, error: invalidMessage };
  const value = Number(normalized);
  const tenths = Math.round(value * 10);
  if (
    !Number.isSafeInteger(tenths)
    || Math.abs(value * 10 - tenths) > 1e-9
    || tenths < minimumTenths
    || tenths > maximumTenths
  ) {
    return { ok: false, error: invalidMessage };
  }
  return { ok: true, value: tenths / 10 };
}

function validateFees(raw: RawAssessmentInput, errors: ErrorMap) {
  const monthlyFee = validateInteger(
    raw.monthlyFee,
    0,
    100_000,
    '月会費を入力してください。',
    '月会費を0～100,000円の整数で入力してください。',
  );
  if (!raw.additionalFeesMode) {
    errors['additional-fees-mode'] = '月会費以外の継続必須費用があるか選んでください。';
  }
  const monthlyFixedFee = raw.additionalFeesMode === 'known'
    ? validateOptionalInteger(
        raw.monthlyFixedFee,
        50_000,
        '毎月必要な追加費用を0～50,000円の整数で入力してください。',
      )
    : { ok: true as const, value: 0 };
  const annualFee = raw.additionalFeesMode === 'known'
    ? validateOptionalInteger(
        raw.annualFee,
        200_000,
        '年会費等を0～200,000円の整数で入力してください。',
      )
    : { ok: true as const, value: 0 };

  if (!monthlyFee.ok) errors['monthly-fee'] = monthlyFee.error;
  if (!monthlyFixedFee.ok) errors['monthly-fixed-fee'] = monthlyFixedFee.error;
  if (!annualFee.ok) errors['annual-fee'] = annualFee.error;
  if (
    raw.additionalFeesMode === 'known'
    && monthlyFixedFee.ok
    && annualFee.ok
    && monthlyFixedFee.value + annualFee.value === 0
  ) {
    errors['additional-fees-mode'] = '追加費用・年会費がある場合は、少なくとも1つに1円以上を入力してください。';
  }
  return { monthlyFee, monthlyFixedFee, annualFee };
}

function validateVisits(raw: RawAssessmentInput, errors: ErrorMap): VisitKnowledge | null {
  if (!raw.visitMode) {
    errors['visit-mode'] = '回数の分かり方を選んでください。';
    return null;
  }
  if (raw.visitMode === 'exact') {
    const exactVisits = validateInteger(
      raw.exactVisits,
      0,
      100,
      '来館回数を入力してください。',
      '来館回数を0～100回の整数で入力してください。',
    );
    if (!exactVisits.ok) {
      errors['exact-visits'] = exactVisits.error;
      return null;
    }
    return { kind: 'exact', visits: exactVisits.value };
  }
  if (raw.visitMode === 'range') {
    const band = visitBandOptions.find((option) => option.id === raw.visitBand);
    if (!band) {
      errors['visit-band'] = 'だいたいの頻度を選んでください。';
      return null;
    }
    if (band.max === null) return { kind: 'at-least', bandId: band.id, min: band.min };
    return { kind: 'bounded', bandId: band.id, min: band.min, max: band.max };
  }
  return { kind: 'unknown' };
}

function validateTime(raw: RawAssessmentInput, errors: ErrorMap): TimeInput | null {
  if (!raw.timeMode || raw.timeMode === 'unknown') return { kind: 'unknown' };
  if (raw.timeMode === 'total-hours') {
    const result = validateOneDecimal(
      raw.totalHours,
      1,
      7_440,
      '月の合計実運動時間を入力してください。',
      '月の合計実運動時間を0.1～744.0時間、0.1時間刻みで入力してください。',
    );
    if (!result.ok) {
      errors['total-hours'] = result.error;
      return null;
    }
    return { kind: 'total-hours', totalHours: result.value };
  }
  const result = validateInteger(
    raw.averageMinutes,
    1,
    1_440,
    '1回の平均実運動時間を入力してください。',
    '1回の平均実運動時間を1～1,440分の整数で入力してください。',
  );
  if (!result.ok) {
    errors['average-minutes'] = result.error;
    return null;
  }
  return { kind: 'average-minutes', averageMinutes: result.value };
}

function validateCountKnowledge(
  mode: CountMode,
  rawValue: string,
  minimum: number,
  modeFieldId: string,
  valueFieldId: string,
  label: string,
  errors: ErrorMap,
): CountKnowledge | null {
  if (!mode) {
    errors[modeFieldId] = `${label}が分かるか選んでください。`;
    return null;
  }
  if (mode === 'unknown') return { kind: 'unknown' };
  const count = validateInteger(
    rawValue,
    minimum,
    100,
    `${label}を入力してください。`,
    `${label}を${minimum}～100回の整数で入力してください。`,
  );
  if (!count.ok) {
    errors[valueFieldId] = count.error;
    return null;
  }
  return { kind: 'exact', count: count.value };
}

function validateEquivalence(
  rawValue: EquivalenceAnswer | '',
  fieldId: string,
  label: string,
  errors: ErrorMap,
): EquivalenceAnswer | null {
  if (!rawValue || !equivalenceAnswers.has(rawValue)) {
    errors[fieldId] = `${label}を満たすか選んでください。`;
    return null;
  }
  return rawValue;
}

function validateAlternative(
  raw: RawAssessmentInput,
  errors: ErrorMap,
): AlternativeInput | null {
  if (!raw.alternativeAvailability) {
    errors['alternative-availability'] = '実在する代替プランが分かるか選んでください。';
    return null;
  }
  if (raw.alternativeAvailability === 'unknown') return { availability: 'unknown' };

  const name = raw.alternativeName.trim();
  if (!name || name.length > 80) {
    errors['alternative-name'] = '代替プラン名を1～80文字で入力してください。';
  }
  if (!raw.alternativeKind) {
    errors['alternative-kind'] = '代替プランの料金種類を選んでください。';
  }

  if (!raw.alternativeSourceConfirmed) {
    errors['alternative-source-confirmed'] = '通常料金と利用条件を公式ページまたは契約書で確認してください。';
  }
  if (!raw.alternativeAdditionalFeesMode) {
    errors['alternative-additional-fees-mode'] = '表示料金以外の必須費用があるか選んでください。';
  }

  const monthlyFixedFee = raw.alternativeAdditionalFeesMode === 'known'
    ? validateOptionalInteger(
        raw.alternativeMonthlyFixedFee,
        50_000,
        '代替プランの毎月必須費用を0～50,000円の整数で入力してください。',
      )
    : { ok: true as const, value: 0 };
  const annualFee = raw.alternativeAdditionalFeesMode === 'known'
    ? validateOptionalInteger(
        raw.alternativeAnnualFee,
        200_000,
        '代替プランの年会費を0～200,000円の整数で入力してください。',
      )
    : { ok: true as const, value: 0 };
  const serviceMonthlyFee = raw.alternativeAdditionalFeesMode === 'known'
    ? validateOptionalInteger(
        raw.alternativeServiceMonthlyFee,
        50_000,
        '必要な追加サービス月額を0～50,000円の整数で入力してください。',
      )
    : { ok: true as const, value: 0 };
  if (!monthlyFixedFee.ok) errors['alternative-monthly-fixed-fee'] = monthlyFixedFee.error;
  if (!annualFee.ok) errors['alternative-annual-fee'] = annualFee.error;
  if (!serviceMonthlyFee.ok) {
    errors['alternative-service-monthly-fee'] = serviceMonthlyFee.error;
  }
  if (
    raw.alternativeAdditionalFeesMode === 'known'
    && monthlyFixedFee.ok
    && annualFee.ok
    && serviceMonthlyFee.ok
    && monthlyFixedFee.value + annualFee.value + serviceMonthlyFee.value === 0
  ) {
    errors['alternative-additional-fees-mode'] = '必須費用がある場合は、少なくとも1つに1円以上を入力してください。';
  }

  let pricing: KnownAlternative['pricing'] | null = null;
  if (raw.alternativeKind === 'monthly') {
    const monthlyFee = validateInteger(
      raw.alternativeMonthlyFee,
      0,
      100_000,
      '代替プランの月会費を入力してください。',
      '代替プランの月会費を0～100,000円の整数で入力してください。',
    );
    if (!monthlyFee.ok) errors['alternative-monthly-fee'] = monthlyFee.error;
    else pricing = { kind: 'monthly', monthlyFeeYen: monthlyFee.value };
  } else if (raw.alternativeKind === 'per-visit') {
    const perVisitFee = validateInteger(
      raw.alternativePerVisitFee,
      0,
      100_000,
      '代替プランの1回料金を入力してください。',
      '代替プランの1回料金を0～100,000円の整数で入力してください。',
    );
    if (!perVisitFee.ok) errors['alternative-per-visit-fee'] = perVisitFee.error;
    else pricing = { kind: 'per-visit', perVisitFeeYen: perVisitFee.value };
  }

  const services = validateEquivalence(
    raw.equivalenceServices,
    'equivalence-services',
    '実利用サービスと主な活動の条件',
    errors,
  );
  const hours = validateEquivalence(
    raw.equivalenceHours,
    'equivalence-hours',
    '必要な時間帯',
    errors,
  );
  const location = validateEquivalence(
    raw.equivalenceLocation,
    'equivalence-location',
    '必要な店舗範囲',
    errors,
  );

  if (
    !name
    || name.length > 80
    || !raw.alternativeSourceConfirmed
    || !raw.alternativeAdditionalFeesMode
    || !pricing
    || !monthlyFixedFee.ok
    || !annualFee.ok
    || !serviceMonthlyFee.ok
    || !services
    || !hours
    || !location
  ) {
    return null;
  }

  return {
    availability: 'known',
    name,
    pricing,
    monthlyFixedFeeYen: monthlyFixedFee.value,
    annualFeeYen: annualFee.value,
    requiredServiceMonthlyYen: serviceMonthlyFee.value,
    equivalence: { services, hours, location },
  };
}
