import {
  barrierOptions,
  continuationOptions,
  feeBurdenOptions,
  payReasonOptions,
  requiresBarrier,
  valueFrequencyOptions,
  valueFulfillmentOptions,
  valueOptions,
  visitBandOptions,
  type BarrierId,
  type ContinuationIntent,
  type FeeBurden,
  type PayReason,
  type TimeInput,
  type ValidatedAssessmentInput,
  type ValueAssessmentInput,
  type ValueFrequency,
  type ValueFulfillment,
  type ValueId,
  type VisitBandId,
  type VisitKnowledge,
  type VisitMode,
} from './assessment';

export type ErrorMap = Record<string, string>;
export type TimeMode = TimeInput['kind'] | '';
export type AdditionalFeesMode = 'none' | 'known' | '';

export interface RawValueEntry {
  id: ValueId;
  customLabel: string;
  frequency: ValueFrequency | '';
  fulfillment: ValueFulfillment | '';
  payReason: PayReason | '';
}

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
  values: RawValueEntry[];
  noValueUsed: boolean;
  feeBurden: FeeBurden | '';
  continuation: ContinuationIntent | '';
  barrier: BarrierId | '';
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: ErrorMap };
type ValueValidationResult = { ok: true; value: number } | { ok: false; error: string };

const fullWidthZeroCode = '０'.charCodeAt(0);
const asciiZeroCode = '0'.charCodeAt(0);

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
    values: [],
    noValueUsed: false,
    feeBurden: '',
    continuation: '',
    barrier: '',
  };
}

export function rawRequiresBarrier(raw: RawAssessmentInput): boolean {
  const values = raw.values
    .filter((value) => valueOptions.some((option) => option.id === value.id))
    .map((value): ValueAssessmentInput => ({
      id: value.id,
      customLabel: value.id === 'other' ? value.customLabel.trim() : '',
      frequency: value.frequency || 'unknown',
      fulfillment: value.fulfillment || 'unknown',
      payReason: value.payReason || 'unsure',
    }));
  if (!raw.feeBurden || !raw.continuation) return true;
  return requiresBarrier({ values, feeBurden: raw.feeBurden, continuation: raw.continuation });
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
    && (
      (time?.kind === 'total-hours' && time.totalHours > 0)
      || time?.kind === 'average-minutes'
    )
  ) {
    const fieldId = time.kind === 'average-minutes' ? 'average-minutes' : 'total-hours';
    errors[fieldId] = '来館0回の月に、正の館内利用時間は入力できません。';
  }

  const values = validateValues(raw, errors);
  const validFeeBurdens = new Set(feeBurdenOptions.map((option) => option.id));
  const validContinuations = new Set(continuationOptions.map((option) => option.id));
  const validBarriers = new Set(barrierOptions.map((option) => option.id));
  const feeBurden = raw.feeBurden && validFeeBurdens.has(raw.feeBurden)
    ? raw.feeBurden
    : null;
  const continuation = raw.continuation && validContinuations.has(raw.continuation)
    ? raw.continuation
    : null;

  if (!feeBurden) errors['fee-burden'] = '現在の会費を無理なく払えるか選んでください。';
  if (!continuation) errors.continuation = '同じ条件なら来月も選ぶか選んでください。';

  let barrier: BarrierId | null = null;
  if (values && feeBurden && continuation) {
    const required = requiresBarrier({ values, feeBurden, continuation });
    if (required) {
      if (!raw.barrier || !validBarriers.has(raw.barrier)) {
        errors.barrier = '継続を迷わせる主な要因を選んでください。';
      } else {
        barrier = raw.barrier;
      }
    }
  }

  if (
    Object.keys(errors).length > 0
    || !fees.monthlyFee.ok
    || !fees.monthlyFixedFee.ok
    || !fees.annualFee.ok
    || !visits
    || !time
    || !values
    || !feeBurden
    || !continuation
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
      values,
      feeBurden,
      continuation,
      barrier,
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
  if (normalized.length > String(maximum).length || !/^\d+$/.test(normalized)) {
    return { ok: false, error: invalidMessage };
  }
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
  if (raw.additionalFeesMode !== 'none' && raw.additionalFeesMode !== 'known') {
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
    errors['additional-fees-mode'] = '追加費用がある場合は、少なくとも1つに1円以上を入力してください。';
  }
  return { monthlyFee, monthlyFixedFee, annualFee };
}

function validateVisits(raw: RawAssessmentInput, errors: ErrorMap): VisitKnowledge | null {
  if (!['exact', 'range', 'unknown'].includes(raw.visitMode)) {
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
      errors['visit-band'] = 'だいたいの来館回数を選んでください。';
      return null;
    }
    if (band.id === 'monthly-9-plus') {
      return { kind: 'at-least', bandId: band.id, min: band.min };
    }
    return { kind: 'bounded', bandId: band.id, min: band.min, max: band.max };
  }
  return { kind: 'unknown' };
}

function validateTime(raw: RawAssessmentInput, errors: ErrorMap): TimeInput | null {
  if (!['total-hours', 'average-minutes', 'unknown'].includes(raw.timeMode)) {
    errors['time-mode'] = '館内利用時間の入力方法を選んでください。';
    return null;
  }
  if (raw.timeMode === 'unknown') return { kind: 'unknown' };
  if (raw.timeMode === 'total-hours') {
    const result = validateOneDecimal(
      raw.totalHours,
      1,
      7_440,
      '月の合計館内利用時間を入力してください。',
      '月の合計館内利用時間を0.1～744.0時間、0.1時間刻みで入力してください。',
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
    '1回の平均館内利用時間を入力してください。',
    '1回の平均館内利用時間を1～1,440分の整数で入力してください。',
  );
  if (!result.ok) {
    errors['average-minutes'] = result.error;
    return null;
  }
  return { kind: 'average-minutes', averageMinutes: result.value };
}

function validateValues(
  raw: RawAssessmentInput,
  errors: ErrorMap,
): ValueAssessmentInput[] | null {
  if (raw.noValueUsed && raw.values.length > 0) {
    errors.values = '「今月は特に利用していない」と価値項目は同時に選べません。';
    return null;
  }
  if (raw.noValueUsed) return [];
  if (raw.values.length === 0) {
    errors.values = '今月利用した価値を1つ以上選ぶか、「今月は特に利用していない」を選んでください。';
    return null;
  }

  const validIds = new Set(valueOptions.map((option) => option.id));
  const validFrequencies = new Set(valueFrequencyOptions.map((option) => option.id));
  const validFulfillments = new Set(valueFulfillmentOptions.map((option) => option.id));
  const validPayReasons = new Set(payReasonOptions.map((option) => option.id));
  const ids = raw.values.map((value) => value.id);
  if (new Set(ids).size !== ids.length) {
    errors.values = '同じ価値項目を重複して選ぶことはできません。';
  }

  const values: ValueAssessmentInput[] = [];
  raw.values.forEach((rawValue, index) => {
    if (!validIds.has(rawValue.id)) {
      errors[`value-${index}`] = '利用した価値を選び直してください。';
      return;
    }
    const prefix = `value-${rawValue.id}`;
    const customLabel = rawValue.customLabel.trim();
    if (rawValue.id === 'other' && (customLabel.length < 1 || customLabel.length > 80)) {
      errors[`${prefix}-custom-label`] = 'その他の価値を1～80文字で入力してください。';
    }
    if (!rawValue.frequency || !validFrequencies.has(rawValue.frequency)) {
      errors[`${prefix}-frequency`] = 'この価値をどの程度使ったか選んでください。';
    }
    if (!rawValue.fulfillment || !validFulfillments.has(rawValue.fulfillment)) {
      errors[`${prefix}-fulfillment`] = 'この価値が期待どおりだったか選んでください。';
    }
    if (!rawValue.payReason || !validPayReasons.has(rawValue.payReason)) {
      errors[`${prefix}-pay-reason`] = 'この価値が会費を払って残したいものか選んでください。';
    }
    if (
      rawValue.frequency
      && validFrequencies.has(rawValue.frequency)
      && rawValue.fulfillment
      && validFulfillments.has(rawValue.fulfillment)
      && rawValue.payReason
      && validPayReasons.has(rawValue.payReason)
      && (rawValue.id !== 'other' || (customLabel.length >= 1 && customLabel.length <= 80))
    ) {
      values.push({
        id: rawValue.id,
        customLabel: rawValue.id === 'other' ? customLabel : '',
        frequency: rawValue.frequency,
        fulfillment: rawValue.fulfillment,
        payReason: rawValue.payReason,
      });
    }
  });

  return Object.keys(errors).some((key) => key === 'values' || key.startsWith('value-'))
    ? null
    : values;
}
