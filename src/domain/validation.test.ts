import { describe, expect, it } from 'vitest';
import {
  createEmptyRawAssessmentInput,
  rawRequiresBarrier,
  validateAssessmentInput,
  type RawAssessmentInput,
  type RawValueEntry,
} from './validation';

function rawValue(overrides: Partial<RawValueEntry> = {}): RawValueEntry {
  return {
    id: 'training',
    customLabel: '',
    frequency: 'often',
    fulfillment: 'met',
    payReason: 'yes',
    ...overrides,
  };
}

function validRaw(overrides: Partial<RawAssessmentInput> = {}): RawAssessmentInput {
  return {
    ...createEmptyRawAssessmentInput(),
    monthlyFee: '８０００',
    additionalFeesMode: 'none',
    visitMode: 'exact',
    exactVisits: '8',
    values: [rawValue()],
    feeBurden: 'comfortable',
    continuation: 'choose',
    ...overrides,
  };
}

describe('R5 入力検証', () => {
  it('料金・回数・館内時間・複数価値・判断を正規化する', () => {
    const result = validateAssessmentInput(validRaw({
      additionalFeesMode: 'known',
      monthlyFixedFee: '５００',
      annualFee: '１２００',
      timeMode: 'total-hours',
      totalHours: '９．５',
      values: [
        rawValue(),
        rawValue({ id: 'bath-sauna', frequency: 'several', fulfillment: 'partly' }),
      ],
    }));
    expect(result).toEqual({
      ok: true,
      value: {
        fees: { monthlyFeeYen: 8_000, monthlyFixedFeeYen: 500, annualFeeYen: 1_200 },
        visits: { kind: 'exact', visits: 8 },
        time: { kind: 'total-hours', totalHours: 9.5 },
        values: [
          { id: 'training', customLabel: '', frequency: 'often', fulfillment: 'met', payReason: 'yes' },
          { id: 'bath-sauna', customLabel: '', frequency: 'several', fulfillment: 'partly', payReason: 'yes' },
        ],
        feeBurden: 'comfortable',
        continuation: 'choose',
        barrier: null,
      },
    });
  });

  it('回数帯1–2/3–4/5–8/9+と回数不明を正規化する', () => {
    const expectations = [
      ['monthly-1-2', { kind: 'bounded', bandId: 'monthly-1-2', min: 1, max: 2 }],
      ['monthly-3-4', { kind: 'bounded', bandId: 'monthly-3-4', min: 3, max: 4 }],
      ['monthly-5-8', { kind: 'bounded', bandId: 'monthly-5-8', min: 5, max: 8 }],
      ['monthly-9-plus', { kind: 'at-least', bandId: 'monthly-9-plus', min: 9 }],
    ] as const;
    for (const [visitBand, expected] of expectations) {
      const result = validateAssessmentInput(validRaw({ visitMode: 'range', visitBand }));
      expect(result.ok && result.value.visits).toEqual(expected);
    }
    const unknown = validateAssessmentInput(validRaw({ visitMode: 'unknown' }));
    expect(unknown.ok && unknown.value.visits).toEqual({ kind: 'unknown' });
  });

  it('館内利用時間は合計・平均を検証し、未入力なら不明として通す', () => {
    const average = validateAssessmentInput(validRaw({
      timeMode: 'average-minutes', averageMinutes: '90',
    }));
    expect(average.ok && average.value.time).toEqual({ kind: 'average-minutes', averageMinutes: 90 });

    const omitted = validateAssessmentInput(validRaw({
      timeMode: 'unknown', totalHours: 'invalid', averageMinutes: 'invalid',
    }));
    expect(omitted.ok && omitted.value.time).toEqual({ kind: 'unknown' });

    const zeroVisitsWithTime = validateAssessmentInput(validRaw({
      exactVisits: '0', timeMode: 'total-hours', totalHours: '1.0',
    }));
    expect(zeroVisitsWithTime.ok).toBe(false);
    if (!zeroVisitsWithTime.ok) {
      expect(zeroVisitsWithTime.errors['total-hours']).toContain('館内利用時間');
    }

    const zeroVisitsWithAverage = validateAssessmentInput(validRaw({
      exactVisits: '0', timeMode: 'average-minutes', averageMinutes: '90',
    }));
    expect(zeroVisitsWithAverage.ok).toBe(false);
    if (!zeroVisitsWithAverage.ok) {
      expect(zeroVisitsWithAverage.errors['average-minutes']).toContain('来館0回');
    }
  });

  it('その他は名称1～80文字必須で、他IDの名称は破棄する', () => {
    const other = validateAssessmentInput(validRaw({
      values: [rawValue({ id: 'other', customLabel: '  リモートワーク前の気分転換  ' })],
    }));
    expect(other.ok && other.value.values[0]).toEqual({
      id: 'other',
      customLabel: 'リモートワーク前の気分転換',
      frequency: 'often',
      fulfillment: 'met',
      payReason: 'yes',
    });

    for (const customLabel of ['', 'あ'.repeat(81)]) {
      const invalid = validateAssessmentInput(validRaw({
        values: [rawValue({ id: 'other', customLabel })],
      }));
      expect(invalid.ok).toBe(false);
      if (!invalid.ok) expect(invalid.errors['value-other-custom-label']).toContain('1～80文字');
    }

    const ignored = validateAssessmentInput(validRaw({
      values: [rawValue({ customLabel: '無視される' })],
    }));
    expect(ignored.ok && ignored.value.values[0]?.customLabel).toBe('');
  });

  it('選択した各価値について頻度・期待充足・支払理由を必須にする', () => {
    for (const [field, value] of [
      ['frequency', rawValue({ frequency: '' })],
      ['fulfillment', rawValue({ fulfillment: '' })],
      ['pay-reason', rawValue({ payReason: '' })],
    ] as const) {
      const result = validateAssessmentInput(validRaw({ values: [value] }));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors[`value-training-${field}`]).toBeTruthy();
    }
  });

  it('価値なしは明示が必要で、価値項目との同時選択と重複を拒否する', () => {
    const none = validateAssessmentInput(validRaw({
      values: [], noValueUsed: true, continuation: 'unsure', barrier: 'temporary',
    }));
    expect(none.ok && none.value.values).toEqual([]);

    const neither = validateAssessmentInput(validRaw({ values: [], noValueUsed: false }));
    expect(neither.ok).toBe(false);
    if (!neither.ok) expect(neither.errors.values).toBeTruthy();

    const conflict = validateAssessmentInput(validRaw({ noValueUsed: true }));
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) expect(conflict.errors.values).toContain('同時');

    const duplicate = validateAssessmentInput(validRaw({ values: [rawValue(), rawValue()] }));
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.errors.values).toContain('重複');
  });

  it('強い価値・無理ない会費・継続意向の全てが揃う場合だけ阻害要因を要求しない', () => {
    expect(rawRequiresBarrier(validRaw())).toBe(false);
    expect(validateAssessmentInput(validRaw({ barrier: 'travel' }))).toEqual(
      validateAssessmentInput(validRaw({ barrier: '' })),
    );

    for (const changes of [
      { values: [rawValue({ payReason: 'unsure' })] },
      { feeBurden: 'slight-burden' as const },
      { continuation: 'unsure' as const },
      { noValueUsed: true, values: [], continuation: 'unsure' as const },
    ]) {
      const raw = validRaw(changes);
      expect(rawRequiresBarrier(raw)).toBe(true);
      const missing = validateAssessmentInput(raw);
      expect(missing.ok).toBe(false);
      if (!missing.ok) expect(missing.errors.barrier).toBeTruthy();
    }
  });

  it('阻害要因が必要な時だけ採用し、無効値を拒否する', () => {
    const result = validateAssessmentInput(validRaw({
      feeBurden: 'slight-burden', barrier: 'price',
    }));
    expect(result.ok && result.value.barrier).toBe('price');

    const invalid = validateAssessmentInput(validRaw({
      feeBurden: 'slight-burden', barrier: 'none' as never,
    }));
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.errors.barrier).toBeTruthy();
  });

  it('料金の追加費用モードと主要必須項目を検証する', () => {
    const additionalEmpty = validateAssessmentInput(validRaw({
      additionalFeesMode: 'known', monthlyFixedFee: '', annualFee: '',
    }));
    expect(additionalEmpty.ok).toBe(false);
    if (!additionalEmpty.ok) expect(additionalEmpty.errors['additional-fees-mode']).toBeTruthy();

    const missing = validateAssessmentInput({
      ...createEmptyRawAssessmentInput(),
      monthlyFee: '8000',
      additionalFeesMode: 'none',
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.errors['visit-mode']).toBeTruthy();
      expect(missing.errors.values).toBeTruthy();
      expect(missing.errors['fee-burden']).toBeTruthy();
      expect(missing.errors.continuation).toBeTruthy();
    }
  });

  it('型を迂回した不正な選択値も「不明」として採用しない', () => {
    const result = validateAssessmentInput(validRaw({
      additionalFeesMode: 'invalid' as never,
      visitMode: 'invalid' as never,
      timeMode: 'invalid' as never,
    }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors['additional-fees-mode']).toBeTruthy();
      expect(result.errors['visit-mode']).toBeTruthy();
      expect(result.errors['time-mode']).toBeTruthy();
    }
  });
});
