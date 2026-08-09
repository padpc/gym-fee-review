import { describe, expect, it } from 'vitest';
import { createEmptyRawReviewInput, validateReviewInput } from './validation';

describe('GFR-G1R 条件付き入力検証', () => {
  it('全角数字、任意費用、先月実数を受け付ける', () => {
    const result = validateReviewInput({
      ...createEmptyRawReviewInput('per-visit'),
      monthlyFee: '８０００',
      monthlyFixedFee: '５００',
      annualFee: '１２００',
      visitMode: 'exact',
      exactVisits: '４',
    });

    expect(result).toEqual({
      ok: true,
      value: {
        criterion: 'per-visit',
        fees: { monthlyFeeYen: 8_000, monthlyFixedFeeYen: 500, annualFeeYen: 1_200 },
        visits: { kind: 'exact', visits: 4 },
        time: null,
        usedServices: {},
        importantServices: [],
        continuation: [],
      },
    });
  });

  it('任意費用の空欄を0として扱い、0円を受け付ける', () => {
    const result = validateReviewInput({
      ...createEmptyRawReviewInput('per-visit'),
      monthlyFee: '0',
      visitMode: 'exact',
      exactVisits: '0',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.fees).toEqual({ monthlyFeeYen: 0, monthlyFixedFeeYen: 0, annualFeeYen: 0 });
  });

  it.each(['', '-1', '1.5', '1e3', '100001', 'abc'])('無効な月会費 %s を拒否する', (monthlyFee) => {
    const result = validateReviewInput({
      ...createEmptyRawReviewInput('per-visit'),
      monthlyFee,
      visitMode: 'unknown',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors['monthly-fee']).toBeTruthy();
  });

  it('概数帯と回数不明を実績値へ変換しない', () => {
    const range = validateReviewInput({
      ...createEmptyRawReviewInput('per-visit'),
      monthlyFee: '8000',
      visitMode: 'range',
      visitBand: 'weekly-1',
    });
    expect(range.ok && range.value.visits).toEqual({
      kind: 'bounded',
      bandId: 'weekly-1',
      min: 4,
      max: 6,
    });

    const unknown = validateReviewInput({
      ...createEmptyRawReviewInput('per-visit'),
      monthlyFee: '8000',
      visitMode: 'unknown',
    });
    expect(unknown.ok && unknown.value.visits).toEqual({ kind: 'unknown' });
  });

  it('設備だけの経路では回数と時間を要求しない', () => {
    const result = validateReviewInput({
      ...createEmptyRawReviewInput('services'),
      monthlyFee: '8000',
      usedServices: { pool: '1-3' },
      importantServices: ['pool', 'classes'],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.visits).toBeNull();
      expect(result.value.time).toBeNull();
    }
  });

  it('利用した設備には頻度を要求する', () => {
    const result = validateReviewInput({
      ...createEmptyRawReviewInput('services'),
      monthlyFee: '8000',
      usedServices: { pool: '' },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors['service-pool-frequency']).toBe('プールの利用頻度を選んでください。');
  });

  it('別基準へ切り替えた後は非表示の設備入力で送信を妨げない', () => {
    const result = validateReviewInput({
      ...createEmptyRawReviewInput('per-visit'),
      monthlyFee: '8000',
      visitMode: 'unknown',
      usedServices: { pool: '' },
      importantServices: ['pool'],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.usedServices).toEqual({});
      expect(result.value.importantServices).toEqual([]);
    }
  });

  it('合計滞在時間は0.1時間単位で受け付け、回数を要求しない', () => {
    const result = validateReviewInput({
      ...createEmptyRawReviewInput('per-hour'),
      monthlyFee: '8000',
      timeMode: 'total',
      totalHours: '６．０',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.visits).toBeNull();
      expect(result.value.time).toEqual({ kind: 'total', totalMinutes: 360 });
    }
  });

  it.each(['', '0', '0.01', '600.1', '-1', '1e2'])('無効な合計時間 %s を拒否する', (totalHours) => {
    const result = validateReviewInput({
      ...createEmptyRawReviewInput('per-hour'),
      monthlyFee: '8000',
      timeMode: 'total',
      totalHours,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors['total-hours']).toBeTruthy();
  });

  it('平均滞在時間では回数の分かり方を要求する', () => {
    const invalid = validateReviewInput({
      ...createEmptyRawReviewInput('per-hour'),
      monthlyFee: '8000',
      timeMode: 'average',
      averageMinutes: '90',
    });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.errors['visit-mode']).toBe('回数の分かり方を選んでください。');

    const valid = validateReviewInput({
      ...createEmptyRawReviewInput('per-hour'),
      monthlyFee: '8000',
      timeMode: 'average',
      averageMinutes: '90',
      visitMode: 'range',
      visitBand: 'weekly-1',
    });
    expect(valid.ok).toBe(true);
  });

  it('まとめて確認では時間を省略できる', () => {
    const result = validateReviewInput({
      ...createEmptyRawReviewInput('all'),
      monthlyFee: '8000',
      visitMode: 'unknown',
      includeTime: false,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.time).toBeNull();
  });
});
