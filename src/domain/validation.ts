import {
  barrierOptions,
  purposeEvidenceOptions,
  purposeOptions,
  visitBandOptions,
  type AlternativeInput,
  type BarrierId,
  type CountKnowledge,
  type EquivalenceAnswer,
  type KnownAlternative,
  type PurposeEvidence,
  type PurposeId,
  type TimeInput,
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
  plannedMode: CountMode;
  plannedCount: string;
  achievedMode: CountMode;
  achievedCount: string;
  purposeEvidence: PurposeEvidence | '';
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
  equivalenceEquipment: EquivalenceAnswer | '';
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
    plannedMode: '',
    plannedCount: '',
    achievedMode: '',
    achievedCount: '',
    purposeEvidence: '',
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
    equivalenceEquipment: '',
    equivalenceHours: '',
    equivalenceLocation: '',
    alternativeSourceConfirmed: false,
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
      '月の合計滞在時間を入力してください。',
      '月の合計滞在時間を0.1～744.0時間、0.1時間刻みで入力してください。',
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
    '1回の平均滞在時間を入力してください。',
    '1回の平均滞在時間を1～1,440分の整数で入力してください。',
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

  const equipment = validateEquivalence(
    raw.equivalenceEquipment,
    'equivalence-equipment',
    '必要な設備・サービス',
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
    || !equipment
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
    equivalence: { equipment, hours, location },
  };
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
    errors['total-hours'] = '来館0回の月に、正の合計滞在時間は入力できません。';
  }

  const validPurposes = new Set(purposeOptions.map((option) => option.id));
  const validEvidence = new Set(purposeEvidenceOptions.map((option) => option.id));
  const validBarriers = new Set(barrierOptions.map((option) => option.id));
  if (!raw.purpose || !validPurposes.has(raw.purpose)) {
    errors.purpose = '主な目的を選んでください。';
  }
  const planned = validateCountKnowledge(
    raw.plannedMode,
    raw.plannedCount,
    1,
    'planned-mode',
    'planned-count',
    '予定回数',
    errors,
  );
  const achieved = validateCountKnowledge(
    raw.achievedMode,
    raw.achievedCount,
    0,
    'achieved-mode',
    'achieved-count',
    '目的に使えた来館回数',
    errors,
  );
  if (!raw.purposeEvidence || !validEvidence.has(raw.purposeEvidence)) {
    errors['purpose-evidence'] = '目的に関する具体的な変化を選んでください。';
  }
  if (!raw.barrier || !validBarriers.has(raw.barrier)) {
    errors.barrier = '利用を妨げた主な要因を選んでください。';
  }

  if (visits && achieved?.kind === 'exact') {
    const knownMaximum = visits.kind === 'exact'
      ? visits.visits
      : visits.kind === 'bounded'
        ? visits.max
        : null;
    if (knownMaximum !== null && achieved.count > knownMaximum) {
      errors['achieved-count'] = `目的に使えた来館回数は、来館回数の上限${knownMaximum}回以下で入力してください。`;
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
    || !planned
    || !achieved
    || !raw.purposeEvidence
    || !validEvidence.has(raw.purposeEvidence)
    || !raw.barrier
    || !validBarriers.has(raw.barrier)
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
        planned,
        achieved,
        evidence: raw.purposeEvidence,
      },
      barrier: raw.barrier,
      alternative,
    },
  };
}
