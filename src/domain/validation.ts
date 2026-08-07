export type CurrentFieldId = 'current-monthly-fee' | 'visit-0' | 'visit-1' | 'visit-2';
export type G1FieldId = CurrentFieldId | 'drop-in-fee';
export type ErrorMap = Partial<Record<G1FieldId, string>>;

export interface RawCurrentInputs {
  currentMonthlyFee: string;
  visits: [string, string, string];
}

export interface RawG1Inputs extends RawCurrentInputs {
  dropInFee: string;
}

export interface ValidatedCurrentInputs {
  currentMonthlyFeeYen: number;
  visits: [number, number, number];
}

export interface ValidatedG1Inputs extends ValidatedCurrentInputs {
  dropInFeeYen: number;
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: ErrorMap };
export type ValueValidationResult = { ok: true; value: number } | { ok: false; error: string };

const fullWidthZeroCode = '０'.charCodeAt(0);
const asciiZeroCode = '0'.charCodeAt(0);

export function normalizeDigits(rawValue: string): string {
  return rawValue
    .trim()
    .replace(/[０-９]/g, (character) =>
      String.fromCharCode(character.charCodeAt(0) - fullWidthZeroCode + asciiZeroCode),
    );
}

function validateInteger(
  rawValue: string,
  maximum: number,
  emptyMessage: string,
  invalidMessage: string,
): ValueValidationResult {
  const normalized = normalizeDigits(rawValue);
  if (normalized === '') return { ok: false, error: emptyMessage };
  if (normalized.length > String(maximum).length) return { ok: false, error: invalidMessage };
  if (!/^\d+$/.test(normalized)) return { ok: false, error: invalidMessage };

  const value = Number(normalized);
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
    return { ok: false, error: invalidMessage };
  }
  return { ok: true, value };
}

export function validateCurrentInputs(raw: RawCurrentInputs): ValidationResult<ValidatedCurrentInputs> {
  const errors: ErrorMap = {};
  const monthlyFee = validateInteger(
    raw.currentMonthlyFee,
    100_000,
    '月会費を入力してください。',
    '月会費を0～100,000円の整数で入力してください。',
  );
  if (!monthlyFee.ok) errors['current-monthly-fee'] = monthlyFee.error;

  const visits = raw.visits.map((value, index) => {
    const validation = validateInteger(
      value,
      100,
      '来館回数を入力してください。',
      '来館回数を0～100回の整数で入力してください。',
    );
    if (!validation.ok) errors[`visit-${index}` as CurrentFieldId] = validation.error;
    return validation.ok ? validation.value : 0;
  }) as [number, number, number];

  if (Object.keys(errors).length > 0 || !monthlyFee.ok) return { ok: false, errors };
  return {
    ok: true,
    value: { currentMonthlyFeeYen: monthlyFee.value, visits },
  };
}

export function validateDropInFee(rawValue: string): ValueValidationResult {
  return validateInteger(
    rawValue,
    100_000,
    '1回料金を入力してください。',
    '1回料金を0～100,000円の整数で入力してください。',
  );
}

export function validateG1Inputs(raw: RawG1Inputs): ValidationResult<ValidatedG1Inputs> {
  const current = validateCurrentInputs(raw);
  const dropInFee = validateDropInFee(raw.dropInFee);
  const errors: ErrorMap = current.ok ? {} : { ...current.errors };
  if (!dropInFee.ok) errors['drop-in-fee'] = dropInFee.error;

  if (!current.ok || !dropInFee.ok) return { ok: false, errors };
  return {
    ok: true,
    value: { ...current.value, dropInFeeYen: dropInFee.value },
  };
}
