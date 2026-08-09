import {
  priceBenchmarkOptions,
  purposeOptions,
  purposeProgressOptions,
  replaceabilityOptions,
  visitBandOptions,
  type PriceBenchmark,
  type PriceBenchmarkKind,
  type PurposeId,
  type PurposeProgress,
  type Replaceability,
  type ValidatedAssessmentInput,
  type VisitBandId,
  type VisitKnowledge,
  type VisitMode,
} from './assessment';

export type ErrorMap = Record<string, string>;

export interface RawAssessmentInput {
  monthlyFee: string;
  monthlyFixedFee: string;
  annualFee: string;
  benchmarkKind: PriceBenchmarkKind | '';
  monthlyLimit: string;
  perVisitLimit: string;
  alternativeMonthly: string;
  visitMode: VisitMode | '';
  visitBand: VisitBandId | '';
  exactVisits: string;
  purpose: PurposeId | '';
  purposeProgress: PurposeProgress | '';
  replaceability: Replaceability | '';
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: ErrorMap };
type ValueValidationResult = { ok: true; value: number } | { ok: false; error: string };

const fullWidthZeroCode = '０'.charCodeAt(0);
const asciiZeroCode = '0'.charCodeAt(0);

export function createEmptyRawAssessmentInput(): RawAssessmentInput {
  return {
    monthlyFee: '',
    monthlyFixedFee: '',
    annualFee: '',
    benchmarkKind: '',
    monthlyLimit: '',
    perVisitLimit: '',
    alternativeMonthly: '',
    visitMode: '',
    visitBand: '',
    exactVisits: '',
    purpose: '',
    purposeProgress: '',
    replaceability: '',
  };
}

export function normalizeDigits(rawValue: string): string {
  return rawValue
    .trim()
    .replace(/[０-９]/g, (character) =>
      String.fromCharCode(character.charCodeAt(0) - fullWidthZeroCode + asciiZeroCode),
    );
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

function validateFees(raw: RawAssessmentInput, errors: ErrorMap) {
  const monthlyFee = validateInteger(
    raw.monthlyFee,
    0,
    100_000,
    '月会費を入力してください。',
    '月会費を0～100,000円の整数で入力してください。',
  );
  const monthlyFixedFee = validateOptionalInteger(
    raw.monthlyFixedFee,
    50_000,
    '毎月必須の固定費を0～50,000円の整数で入力してください。',
  );
  const annualFee = validateOptionalInteger(
    raw.annualFee,
    200_000,
    '年会費等を0～200,000円の整数で入力してください。',
  );

  if (!monthlyFee.ok) errors['monthly-fee'] = monthlyFee.error;
  if (!monthlyFixedFee.ok) errors['monthly-fixed-fee'] = monthlyFixedFee.error;
  if (!annualFee.ok) errors['annual-fee'] = annualFee.error;
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
      '先月の来館回数を入力してください。',
      '先月の来館回数を0～100回の整数で入力してください。',
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
    if (band.max === null) return { kind: 'at-least', bandId: band.id, min: 21 };
    return { kind: 'bounded', bandId: band.id, min: band.min, max: band.max };
  }
  return { kind: 'unknown' };
}

function validateBenchmark(raw: RawAssessmentInput, errors: ErrorMap): PriceBenchmark | null {
  const validKinds = new Set(priceBenchmarkOptions.map((option) => option.id));
  if (!raw.benchmarkKind || !validKinds.has(raw.benchmarkKind)) {
    errors['benchmark-kind'] = '料金の判断基準を選んでください。';
    return null;
  }

  if (raw.benchmarkKind === 'monthly-limit') {
    const amount = validateInteger(
      raw.monthlyLimit,
      0,
      100_000,
      '納得できる月額上限を入力してください。',
      '月額上限を0～100,000円の整数で入力してください。',
    );
    if (!amount.ok) {
      errors['monthly-limit'] = amount.error;
      return null;
    }
    return { kind: 'monthly-limit', amountYen: amount.value };
  }

  if (raw.benchmarkKind === 'per-visit-limit') {
    const amount = validateInteger(
      raw.perVisitLimit,
      1,
      100_000,
      '納得できる1回上限を入力してください。',
      '1回上限を1～100,000円の整数で入力してください。',
    );
    if (!amount.ok) {
      errors['per-visit-limit'] = amount.error;
      return null;
    }
    return { kind: 'per-visit-limit', amountYen: amount.value };
  }

  const amount = validateInteger(
    raw.alternativeMonthly,
    0,
    100_000,
    '代替案の月額相当を入力してください。',
    '代替案の月額相当を0～100,000円の整数で入力してください。',
  );
  if (!amount.ok) {
    errors['alternative-monthly'] = amount.error;
    return null;
  }
  return { kind: 'alternative-monthly', amountYen: amount.value };
}

export function validateAssessmentInput(
  raw: RawAssessmentInput,
): ValidationResult<ValidatedAssessmentInput> {
  const errors: ErrorMap = {};
  const fees = validateFees(raw, errors);
  const benchmark = validateBenchmark(raw, errors);
  const visits = raw.benchmarkKind === 'per-visit-limit' ? validateVisits(raw, errors) : null;

  const validPurposes = new Set(purposeOptions.map((option) => option.id));
  const validProgress = new Set(purposeProgressOptions.map((option) => option.id));
  const validReplaceability = new Set(replaceabilityOptions.map((option) => option.id));

  if (!raw.purpose || !validPurposes.has(raw.purpose)) {
    errors.purpose = '主な入会目的を選んでください。';
  }
  if (!raw.purposeProgress || !validProgress.has(raw.purposeProgress)) {
    errors['purpose-progress'] = '入会目的を実現できたか選んでください。';
  }
  if (!raw.replaceability || !validReplaceability.has(raw.replaceability)) {
    errors.replaceability = '今のジム以外で代替できるか選んでください。';
  }

  if (
    Object.keys(errors).length > 0
    || !fees.monthlyFee.ok
    || !fees.monthlyFixedFee.ok
    || !fees.annualFee.ok
    || !benchmark
    || (raw.benchmarkKind === 'per-visit-limit' && !visits)
    || !raw.purpose
    || !raw.purposeProgress
    || !raw.replaceability
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
      benchmark,
      purpose: raw.purpose,
      purposeProgress: raw.purposeProgress,
      replaceability: raw.replaceability,
    },
  };
}
