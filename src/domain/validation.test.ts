import { describe, expect, it } from 'vitest';
import { createEmptyRawAssessmentInput, validateAssessmentInput } from './validation';

function validRaw() {
  return {
    ...createEmptyRawAssessmentInput(),
    monthlyFee: '８０００',
    benchmarkKind: 'monthly-limit' as const,
    monthlyLimit: '９０００',
    purpose: 'exercise-habit' as const,
    purposeProgress: 'achieved' as const,
    replaceability: 'hard' as const,
  };
}

describe('GFR-G1R2 条件付き入力検証', () => {
  it('月額上限では回数を要求せず、全角数字と任意費用を受け付ける', () => {
    const result = validateAssessmentInput({
      ...validRaw(),
      monthlyFixedFee: '５００',
      annualFee: '１２００',
    });

    expect(result).toEqual({
      ok: true,
      value: {
        fees: { monthlyFeeYen: 8_000, monthlyFixedFeeYen: 500, annualFeeYen: 1_200 },
        visits: null,
        benchmark: { kind: 'monthly-limit', amountYen: 9_000 },
        purpose: 'exercise-habit',
        purposeProgress: 'achieved',
        replaceability: 'hard',
      },
    });
  });

  it('代替案月額では非表示の回数・別基準入力を検証しない', () => {
    const result = validateAssessmentInput({
      ...validRaw(),
      benchmarkKind: 'alternative-monthly',
      alternativeMonthly: '7500',
      monthlyLimit: 'invalid',
      perVisitLimit: 'invalid',
      visitMode: 'exact',
      exactVisits: 'invalid',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.visits).toBeNull();
      expect(result.value.benchmark).toEqual({ kind: 'alternative-monthly', amountYen: 7_500 });
    }
  });

  it('1回上限では回数の分かり方を要求する', () => {
    const result = validateAssessmentInput({
      ...validRaw(),
      benchmarkKind: 'per-visit-limit',
      perVisitLimit: '2000',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors['visit-mode']).toBe('回数の分かり方を選んでください。');
  });

  it('1回上限と正確な0回を受け付ける', () => {
    const result = validateAssessmentInput({
      ...validRaw(),
      benchmarkKind: 'per-visit-limit',
      perVisitLimit: '2000',
      visitMode: 'exact',
      exactVisits: '0',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.visits).toEqual({ kind: 'exact', visits: 0 });
  });

  it('頻度範囲と回数不明を実績へ変換しない', () => {
    const range = validateAssessmentInput({
      ...validRaw(),
      benchmarkKind: 'per-visit-limit',
      perVisitLimit: '1500',
      visitMode: 'range',
      visitBand: 'weekly-1',
    });
    expect(range.ok && range.value.visits).toEqual({
      kind: 'bounded',
      bandId: 'weekly-1',
      min: 4,
      max: 6,
    });

    const unknown = validateAssessmentInput({
      ...validRaw(),
      benchmarkKind: 'per-visit-limit',
      perVisitLimit: '1500',
      visitMode: 'unknown',
    });
    expect(unknown.ok && unknown.value.visits).toEqual({ kind: 'unknown' });
  });

  it.each(['', '-1', '1.5', '1e3', '100001', 'abc'])('無効な月会費 %s を拒否する', (monthlyFee) => {
    const result = validateAssessmentInput({ ...validRaw(), monthlyFee });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors['monthly-fee']).toBeTruthy();
  });

  it('1回上限は0円を拒否し、月額上限と代替案は0円を受け付ける', () => {
    const perVisit = validateAssessmentInput({
      ...validRaw(),
      benchmarkKind: 'per-visit-limit',
      perVisitLimit: '0',
      visitMode: 'unknown',
    });
    expect(perVisit.ok).toBe(false);
    if (!perVisit.ok) expect(perVisit.errors['per-visit-limit']).toBeTruthy();

    expect(validateAssessmentInput({ ...validRaw(), monthlyLimit: '0' }).ok).toBe(true);
    expect(validateAssessmentInput({
      ...validRaw(),
      benchmarkKind: 'alternative-monthly',
      alternativeMonthly: '0',
    }).ok).toBe(true);
  });

  it('料金基準・目的・達成度・代替しにくさの空欄を項目別に返す', () => {
    const result = validateAssessmentInput({
      ...createEmptyRawAssessmentInput(),
      monthlyFee: '8000',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors['benchmark-kind']).toBeTruthy();
      expect(result.errors.purpose).toBeTruthy();
      expect(result.errors['purpose-progress']).toBeTruthy();
      expect(result.errors.replaceability).toBeTruthy();
    }
  });

  it('明示的な「分からない」は材料不足判定用の有効値として受け付ける', () => {
    const result = validateAssessmentInput({
      ...validRaw(),
      purposeProgress: 'unknown',
      replaceability: 'unknown',
    });
    expect(result.ok).toBe(true);
  });
});
