import { describe, expect, it } from 'vitest';
import { validateCurrentInputs, validateDropInFee, validateG1Inputs } from './validation';

describe('GFR-IN-001/004/010 G1入力検証', () => {
  it('半角・全角の非負整数を受け付ける', () => {
    expect(
      validateG1Inputs({
        currentMonthlyFee: '８０００',
        visits: ['4', '５', '6'],
        dropInFee: '1500',
      }),
    ).toEqual({
      ok: true,
      value: { currentMonthlyFeeYen: 8_000, visits: [4, 5, 6], dropInFeeYen: 1_500 },
    });
  });

  it.each([
    ['', '月会費を入力してください。'],
    ['-1', '月会費を0～100,000円の整数で入力してください。'],
    ['1.5', '月会費を0～100,000円の整数で入力してください。'],
    ['1e3', '月会費を0～100,000円の整数で入力してください。'],
    ['100001', '月会費を0～100,000円の整数で入力してください。'],
    ['abc', '月会費を0～100,000円の整数で入力してください。'],
  ])('月会費 %s を拒否する', (value, message) => {
    const result = validateCurrentInputs({ currentMonthlyFee: value, visits: ['4', '5', '6'] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors['current-monthly-fee']).toBe(message);
  });

  it.each(['-1', '1.5', '101', '1e2', '回'])('無効な回数 %s を拒否する', (value) => {
    const result = validateCurrentInputs({ currentMonthlyFee: '8000', visits: [value, '5', '6'] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors['visit-0']).toBe('来館回数を0～100回の整数で入力してください。');
    }
  });

  it('空欄と0を区別し、全月0回を受け付ける', () => {
    expect(validateCurrentInputs({ currentMonthlyFee: '0', visits: ['0', '0', '0'] })).toEqual({
      ok: true,
      value: { currentMonthlyFeeYen: 0, visits: [0, 0, 0] },
    });
    const empty = validateCurrentInputs({ currentMonthlyFee: '0', visits: ['', '0', '0'] });
    expect(empty.ok).toBe(false);
  });

  it('金額・回数の上限値を受け付け、上限桁数を超えるraw入力を拒否する', () => {
    expect(
      validateCurrentInputs({ currentMonthlyFee: '100000', visits: ['100', '100', '100'] }),
    ).toEqual({
      ok: true,
      value: { currentMonthlyFeeYen: 100_000, visits: [100, 100, 100] },
    });
    expect(validateDropInFee('0000000').ok).toBe(false);
  });

  it('都度料金の空欄・負数・小数・上限超過を拒否する', () => {
    for (const value of ['', '-1', '1.5', '100001']) {
      expect(validateDropInFee(value).ok).toBe(false);
    }
    expect(validateDropInFee('100000')).toEqual({ ok: true, value: 100_000 });
  });
});
