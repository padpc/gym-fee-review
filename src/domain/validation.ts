import {
  continuationCatalog,
  serviceCatalog,
  visitBandOptions,
  type ContinuationId,
  type Criterion,
  type ServiceId,
  type TimeMode,
  type UsageFrequency,
  type ValidatedReviewInput,
  type VisitBandId,
  type VisitKnowledge,
  type VisitMode,
} from './review';

export type ErrorMap = Record<string, string>;
export type RawUsedServices = Partial<Record<ServiceId, UsageFrequency | ''>>;

export interface RawReviewInput {
  criterion: Criterion | '';
  monthlyFee: string;
  monthlyFixedFee: string;
  annualFee: string;
  visitMode: VisitMode | '';
  visitBand: VisitBandId | '';
  exactVisits: string;
  includeTime: boolean;
  timeMode: TimeMode | '';
  totalHours: string;
  averageMinutes: string;
  usedServices: RawUsedServices;
  importantServices: ServiceId[];
  continuation: ContinuationId[];
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: ErrorMap };
type ValueValidationResult = { ok: true; value: number } | { ok: false; error: string };

const fullWidthZeroCode = '０'.charCodeAt(0);
const asciiZeroCode = '0'.charCodeAt(0);

export function createEmptyRawReviewInput(criterion: Criterion | '' = ''): RawReviewInput {
  return {
    criterion,
    monthlyFee: '',
    monthlyFixedFee: '',
    annualFee: '',
    visitMode: '',
    visitBand: '',
    exactVisits: '',
    includeTime: false,
    timeMode: '',
    totalHours: '',
    averageMinutes: '',
    usedServices: {},
    importantServices: [],
    continuation: [],
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

function validateOptionalInteger(
  rawValue: string,
  maximum: number,
  invalidMessage: string,
): ValueValidationResult {
  if (normalizeDigits(rawValue) === '') return { ok: true, value: 0 };
  return validateInteger(rawValue, maximum, '', invalidMessage);
}

function validateTenthsHours(rawValue: string): ValueValidationResult {
  const normalized = normalizeDigits(rawValue);
  if (normalized === '') return { ok: false, error: '先月の合計滞在時間を入力してください。' };
  if (!/^\d+(?:\.\d)?$/.test(normalized)) {
    return { ok: false, error: '合計滞在時間を0.1～600.0時間、小数1桁までで入力してください。' };
  }
  const [wholePart, decimalPart = '0'] = normalized.split('.');
  const tenths = Number(wholePart) * 10 + Number(decimalPart);
  if (!Number.isSafeInteger(tenths) || tenths < 1 || tenths > 6_000) {
    return { ok: false, error: '合計滞在時間を0.1～600.0時間、小数1桁までで入力してください。' };
  }
  return { ok: true, value: tenths * 6 };
}

function validateFees(raw: RawReviewInput, errors: ErrorMap) {
  const monthlyFee = validateInteger(
    raw.monthlyFee,
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

  return {
    monthlyFee,
    monthlyFixedFee,
    annualFee,
  };
}

function validateVisits(raw: RawReviewInput, errors: ErrorMap): VisitKnowledge | null {
  if (!raw.visitMode) {
    errors['visit-mode'] = '回数の分かり方を選んでください。';
    return null;
  }
  if (raw.visitMode === 'exact') {
    const exactVisits = validateInteger(
      raw.exactVisits,
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

function validateUsedServices(raw: RawReviewInput, errors: ErrorMap) {
  const usedServices: Partial<Record<ServiceId, UsageFrequency>> = {};
  for (const service of serviceCatalog) {
    if (!Object.prototype.hasOwnProperty.call(raw.usedServices, service.id)) continue;
    const frequency = raw.usedServices[service.id];
    if (!frequency) {
      errors[`service-${service.id}-frequency`] = `${service.label}の利用頻度を選んでください。`;
      continue;
    }
    usedServices[service.id] = frequency;
  }
  return usedServices;
}

export function validateReviewInput(raw: RawReviewInput): ValidationResult<ValidatedReviewInput> {
  const errors: ErrorMap = {};
  const fees = validateFees(raw, errors);
  if (!raw.criterion) errors.criterion = '確認したい基準を選んでください。';

  const requiresPerVisit = raw.criterion === 'per-visit' || raw.criterion === 'all';
  const wantsTime = raw.criterion === 'per-hour' || (raw.criterion === 'all' && raw.includeTime);
  let effectiveTimeMode: TimeMode | '' = raw.timeMode;
  if (raw.criterion === 'all' && raw.includeTime && raw.visitMode !== 'exact') {
    effectiveTimeMode = 'average';
  }
  if (wantsTime && !effectiveTimeMode) errors['time-mode'] = '滞在時間の分かり方を選んでください。';

  const requiresVisits = requiresPerVisit || (wantsTime && effectiveTimeMode === 'average');
  const visits = requiresVisits ? validateVisits(raw, errors) : null;

  let time: ValidatedReviewInput['time'] = null;
  if (wantsTime && effectiveTimeMode === 'total') {
    const total = validateTenthsHours(raw.totalHours);
    if (!total.ok) errors['total-hours'] = total.error;
    else time = { kind: 'total', totalMinutes: total.value };
  }
  if (wantsTime && effectiveTimeMode === 'average') {
    const average = validateInteger(
      raw.averageMinutes,
      600,
      '1回の平均滞在時間を入力してください。',
      '平均滞在時間を10～600分の整数で入力してください。',
    );
    if (!average.ok || (average.ok && average.value < 10)) {
      errors['average-minutes'] = average.ok
        ? '平均滞在時間を10～600分の整数で入力してください。'
        : average.error;
    } else {
      time = { kind: 'average', averageMinutes: average.value };
    }
  }

  const includesServices = raw.criterion === 'services' || raw.criterion === 'all';
  const usedServices = includesServices ? validateUsedServices(raw, errors) : {};
  const validImportantIds = new Set(serviceCatalog.map((service) => service.id));
  const importantServices = includesServices
    ? raw.importantServices.filter((id) => validImportantIds.has(id))
    : [];
  const validContinuationIds = new Set(continuationCatalog.map((item) => item.id));
  const includesContinuation = raw.criterion === 'continuation' || raw.criterion === 'all';
  const continuation = includesContinuation
    ? raw.continuation.filter((id) => validContinuationIds.has(id))
    : [];

  if (
    Object.keys(errors).length > 0 ||
    !raw.criterion ||
    !fees.monthlyFee.ok ||
    !fees.monthlyFixedFee.ok ||
    !fees.annualFee.ok
  ) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      criterion: raw.criterion,
      fees: {
        monthlyFeeYen: fees.monthlyFee.value,
        monthlyFixedFeeYen: fees.monthlyFixedFee.value,
        annualFeeYen: fees.annualFee.value,
      },
      visits,
      time,
      usedServices,
      importantServices,
      continuation,
    },
  };
}
