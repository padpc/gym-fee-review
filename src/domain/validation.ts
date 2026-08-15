import {
  feeBurdenOptions,
  valueOptions,
  valueStatusOptions,
  visitBandOptions,
  type FeeBurden,
  type FeeEntry,
  type TimeInput,
  type ValidatedAssessmentInput,
  type ValueAssessmentInput,
  type ValueId,
  type ValueRole,
  type ValueStatus,
  type VisitBandId,
  type VisitKnowledge,
  type VisitMode,
} from './assessment';

export type ErrorMap = Record<string, string>;
export type TimeMode = TimeInput['kind'] | '';
export type FeeMode = Exclude<FeeEntry['kind'], 'unknown'> | '';

export interface RawValueEntry {
  id: ValueId;
  customLabel: string;
  role: ValueRole | '';
  status: ValueStatus | '';
}

export interface RawAssessmentInput {
  monthlyFee: string;
  monthlyAdditionalMode: FeeMode;
  monthlyAdditionalFee: string;
  annualFeeMode: FeeMode;
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
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: ErrorMap };
type NumberValidationResult = { ok: true; value: number } | { ok: false; error: string };

const fullWidthZeroCode = '０'.charCodeAt(0);
const asciiZeroCode = '0'.charCodeAt(0);

export function createEmptyRawAssessmentInput(): RawAssessmentInput {
  return {
    monthlyFee: '',
    monthlyAdditionalMode: '',
    monthlyAdditionalFee: '',
    annualFeeMode: '',
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
    && (
      (time?.kind === 'total-hours' && time.totalHours > 0)
      || time?.kind === 'average-minutes'
    )
  ) {
    const fieldId = time.kind === 'average-minutes' ? 'average-minutes' : 'total-hours';
    errors[fieldId] = '来館0回の月に、正の館内利用時間は入力できません。';
  }

  // 来館0回では価値質問自体を行わない。画面切替前の値が残っていても採用しない。
  const values = visits?.kind === 'exact' && visits.visits === 0
    ? []
    : validateValues(raw, errors);
  const validFeeBurdens = new Set(feeBurdenOptions.map((option) => option.id));
  const feeBurden = raw.feeBurden && validFeeBurdens.has(raw.feeBurden)
    ? raw.feeBurden
    : null;
  if (!feeBurden) errors['fee-burden'] = '入力済みの会費を無理なく払えるか選んでください。';

  if (
    Object.keys(errors).length > 0
    || !fees
    || !visits
    || !time
    || !values
    || !feeBurden
  ) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      fees,
      visits,
      time,
      values,
      feeBurden,
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
): NumberValidationResult {
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

function validateOneDecimal(
  rawValue: string,
  minimumTenths: number,
  maximumTenths: number,
  emptyMessage: string,
  invalidMessage: string,
): NumberValidationResult {
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

function validateFeeEntry(
  mode: FeeMode,
  rawValue: string,
  field: 'monthly-additional' | 'annual-fee',
  errors: ErrorMap,
): FeeEntry | null {
  const isMonthly = field === 'monthly-additional';
  const modeField = isMonthly ? 'monthly-additional-mode' : 'annual-fee-mode';
  if (mode !== 'none' && mode !== 'known') {
    errors[modeField] = isMonthly
      ? '毎月の追加費用があるか選んでください。'
      : '年会費等があるか選んでください。';
    return null;
  }
  if (mode === 'none') return { kind: 'none' };

  const result = validateInteger(
    rawValue,
    1,
    isMonthly ? 50_000 : 200_000,
    isMonthly ? '毎月の追加費用を入力してください。' : '年会費等を入力してください。',
    isMonthly
      ? '毎月の追加費用を1～50,000円の整数で入力してください。'
      : '年会費等を1～200,000円の整数で入力してください。',
  );
  if (!result.ok) {
    errors[field] = result.error;
    return null;
  }
  return { kind: 'known', yen: result.value };
}

function validateFees(raw: RawAssessmentInput, errors: ErrorMap) {
  const base = validateInteger(
    raw.monthlyFee,
    0,
    100_000,
    '基本の月会費を入力してください。',
    '基本の月会費を0～100,000円の整数で入力してください。',
  );
  if (!base.ok) errors['monthly-fee'] = base.error;
  const monthlyAdditional = validateFeeEntry(
    raw.monthlyAdditionalMode,
    raw.monthlyAdditionalFee,
    'monthly-additional',
    errors,
  );
  const annualFee = validateFeeEntry(raw.annualFeeMode, raw.annualFee, 'annual-fee', errors);
  if (!base.ok || !monthlyAdditional || !annualFee) return null;
  return {
    baseMonthlyFeeYen: base.value,
    monthlyAdditional,
    annualFee,
  };
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
    if (band.id === 'monthly-21-plus') {
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
    errors.values = '「会費を払う理由になる利用は特にない」と価値項目は同時に選べません。';
    return null;
  }
  if (raw.noValueUsed) return [];
  if (raw.values.length === 0) {
    errors.values = '会費を払う主な理由を1つ選ぶか、「特にない」を選んでください。';
    return null;
  }
  if (raw.values.length > 3) {
    errors.values = '主な理由1つと、追加の理由2つまで選べます。';
  }

  const validIds = new Set(valueOptions.map((option) => option.id));
  const validRoles = new Set<ValueRole>(['primary', 'secondary']);
  const validStatuses = new Set(valueStatusOptions.map((option) => option.id));
  const ids = raw.values.map((value) => value.id);
  if (new Set(ids).size !== ids.length) {
    errors.values = '同じ価値項目を重複して選ぶことはできません。';
  }

  const primaryCount = raw.values.filter((value) => value.role === 'primary').length;
  const secondaryCount = raw.values.filter((value) => value.role === 'secondary').length;
  if (primaryCount !== 1) {
    errors['primary-value'] = '会費を払う主な理由を1つだけ選んでください。';
  }
  if (secondaryCount > 2) {
    errors['secondary-values'] = '追加の理由は2つまで選べます。';
  }

  const values: ValueAssessmentInput[] = [];
  raw.values.forEach((rawValue, index) => {
    if (!validIds.has(rawValue.id)) {
      errors[`value-${index}`] = '価値項目を選び直してください。';
      return;
    }
    const prefix = `value-${rawValue.id}`;
    const customLabel = rawValue.customLabel.trim();
    if (rawValue.id === 'other' && (customLabel.length < 1 || customLabel.length > 80)) {
      errors[`${prefix}-custom-label`] = 'その他の内容を1～80文字で入力してください。';
    }
    if (!rawValue.role || !validRoles.has(rawValue.role)) {
      errors[`${prefix}-role`] = '主な理由か追加の理由か選び直してください。';
    }
    if (!rawValue.status || !validStatuses.has(rawValue.status)) {
      errors[`${prefix}-status`] = 'この利用が期待どおりだったか選んでください。';
    }
    if (
      rawValue.role
      && validRoles.has(rawValue.role)
      && rawValue.status
      && validStatuses.has(rawValue.status)
      && (rawValue.id !== 'other' || (customLabel.length >= 1 && customLabel.length <= 80))
    ) {
      values.push({
        id: rawValue.id,
        customLabel: rawValue.id === 'other' ? customLabel : '',
        role: rawValue.role,
        status: rawValue.status,
      });
    }
  });

  return Object.keys(errors).some((key) => (
    key === 'values'
    || key === 'primary-value'
    || key === 'secondary-values'
    || key.startsWith('value-')
  ))
    ? null
    : values;
}
