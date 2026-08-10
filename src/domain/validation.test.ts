import { describe, expect, it } from 'vitest';
import { createEmptyRawAssessmentInput, validateAssessmentInput } from './validation';

function validRaw() {
  return {
    ...createEmptyRawAssessmentInput(),
    monthlyFee: '８０００',
    additionalFeesMode: 'none' as const,
    visitMode: 'exact' as const,
    exactVisits: '6',
    purpose: 'strength' as const,
    plannedMode: 'exact' as const,
    plannedCount: '8',
    achievedMode: 'exact' as const,
    achievedCount: '6',
    purposeEvidence: 'improved' as const,
    barrier: 'schedule' as const,
  };
}

describe('GFR-G1R3 入力検証', () => {
  it('全角数字、任意費用、回数、目的実績、代替不明を正規化する', () => {
    const result = validateAssessmentInput({
      ...validRaw(),
      additionalFeesMode: 'known',
      monthlyFixedFee: '５００',
      annualFee: '１２００',
    });
    expect(result).toEqual({
      ok: true,
      value: {
        fees: { monthlyFeeYen: 8_000, monthlyFixedFeeYen: 500, annualFeeYen: 1_200 },
        visits: { kind: 'exact', visits: 6 },
        time: { kind: 'unknown' },
        purpose: {
          purpose: 'strength',
          planned: { kind: 'exact', count: 8 },
          achieved: { kind: 'exact', count: 6 },
          evidence: 'improved',
        },
        barrier: 'schedule',
        alternative: { availability: 'unknown' },
      },
    });
  });

  it('正確な0回と目的実現0回を受け付ける', () => {
    const result = validateAssessmentInput({
      ...validRaw(),
      exactVisits: '0',
      achievedCount: '0',
    });
    expect(result.ok).toBe(true);
  });

  it('頻度範囲と回数不明を単一回数へ変換しない', () => {
    const range = validateAssessmentInput({
      ...validRaw(),
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
      visitMode: 'unknown',
    });
    expect(unknown.ok && unknown.value.visits).toEqual({ kind: 'unknown' });
  });

  it('月合計時間の全角小数と平均分をそれぞれ検証する', () => {
    const total = validateAssessmentInput({
      ...validRaw(),
      timeMode: 'total-hours',
      totalHours: '９．５',
    });
    expect(total.ok && total.value.time).toEqual({ kind: 'total-hours', totalHours: 9.5 });

    const average = validateAssessmentInput({
      ...validRaw(),
      timeMode: 'average-minutes',
      averageMinutes: '９０',
    });
    expect(average.ok && average.value.time).toEqual({
      kind: 'average-minutes',
      averageMinutes: 90,
    });
  });

  it.each(['0', '1.25', '-1', '745', 'abc'])('無効な月合計時間 %s を拒否する', (totalHours) => {
    const result = validateAssessmentInput({
      ...validRaw(),
      timeMode: 'total-hours',
      totalHours,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors['total-hours']).toBeTruthy();
  });

  it('予定・目的実績の明示的な不明を0へ変換しない', () => {
    const result = validateAssessmentInput({
      ...validRaw(),
      plannedMode: 'unknown',
      plannedCount: 'invalid',
      achievedMode: 'unknown',
      achievedCount: 'invalid',
      purposeEvidence: 'unknown',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.purpose.planned).toEqual({ kind: 'unknown' });
      expect(result.value.purpose.achieved).toEqual({ kind: 'unknown' });
    }
  });

  it('予定0回を拒否し、100%超になる目的実績は許可する', () => {
    const zeroPlan = validateAssessmentInput({ ...validRaw(), plannedCount: '0' });
    expect(zeroPlan.ok).toBe(false);
    if (!zeroPlan.ok) expect(zeroPlan.errors['planned-count']).toBeTruthy();

    const overPlan = validateAssessmentInput({
      ...validRaw(),
      exactVisits: '10',
      plannedCount: '6',
      achievedCount: '8',
    });
    expect(overPlan.ok).toBe(true);
  });

  it('目的実現回数が正確な来館回数または範囲上限を超える入力を拒否する', () => {
    const exact = validateAssessmentInput({ ...validRaw(), exactVisits: '5', achievedCount: '6' });
    expect(exact.ok).toBe(false);
    if (!exact.ok) expect(exact.errors['achieved-count']).toContain('5回以下');

    const range = validateAssessmentInput({
      ...validRaw(),
      visitMode: 'range',
      visitBand: 'weekly-1',
      achievedCount: '7',
    });
    expect(range.ok).toBe(false);
    if (!range.ok) expect(range.errors['achieved-count']).toContain('6回以下');

    expect(validateAssessmentInput({
      ...validRaw(),
      visitMode: 'unknown',
      achievedCount: '100',
    }).ok).toBe(true);
  });

  it('来館0回と正の合計滞在時間を同時に受け付けない', () => {
    const result = validateAssessmentInput({
      ...validRaw(),
      exactVisits: '0',
      timeMode: 'total-hours',
      totalHours: '1.5',
      achievedCount: '0',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors['total-hours']).toContain('来館0回');
    }
  });

  it('同等な月額代替1件の料金内訳と条件を受け付ける', () => {
    const result = validateAssessmentInput({
      ...validRaw(),
      alternativeAvailability: 'known',
      alternativeSourceConfirmed: true,
      alternativeAdditionalFeesMode: 'known',
      alternativeKind: 'monthly',
      alternativeName: '  月4回プラン  ',
      alternativeMonthlyFee: '７５００',
      alternativeMonthlyFixedFee: '300',
      alternativeAnnualFee: '1200',
      alternativeServiceMonthlyFee: '200',
      equivalenceEquipment: 'meets',
      equivalenceHours: 'meets',
      equivalenceLocation: 'not-required',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.alternative).toEqual({
        availability: 'known',
        name: '月4回プラン',
        pricing: { kind: 'monthly', monthlyFeeYen: 7_500 },
        monthlyFixedFeeYen: 300,
        annualFeeYen: 1_200,
        requiredServiceMonthlyYen: 200,
        equivalence: { equipment: 'meets', hours: 'meets', location: 'not-required' },
      });
    }
  });

  it('都度代替では非表示の月額を検証せず、1回料金を使う', () => {
    const result = validateAssessmentInput({
      ...validRaw(),
      alternativeAvailability: 'known',
      alternativeSourceConfirmed: true,
      alternativeAdditionalFeesMode: 'none',
      alternativeKind: 'per-visit',
      alternativeName: '都度利用',
      alternativeMonthlyFee: 'invalid',
      alternativePerVisitFee: '1800',
      equivalenceEquipment: 'meets',
      equivalenceHours: 'meets',
      equivalenceLocation: 'meets',
    });
    expect(result.ok).toBe(true);
    if (result.ok && result.value.alternative.availability === 'known') {
      expect(result.value.alternative.pricing).toEqual({ kind: 'per-visit', perVisitFeeYen: 1_800 });
    }
  });

  it('代替不明では非表示の候補入力を検証しない', () => {
    expect(validateAssessmentInput({
      ...validRaw(),
      alternativeAvailability: 'unknown',
      alternativeKind: 'monthly',
      alternativeMonthlyFee: 'invalid',
      equivalenceEquipment: 'does-not-meet',
    }).ok).toBe(true);
  });

  it('実在代替の名称・料金種類・3つの同等性確認を必須にする', () => {
    const result = validateAssessmentInput({
      ...validRaw(),
      alternativeAvailability: 'known',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors['alternative-name']).toBeTruthy();
      expect(result.errors['alternative-source-confirmed']).toBeTruthy();
      expect(result.errors['alternative-additional-fees-mode']).toBeTruthy();
      expect(result.errors['alternative-kind']).toBeTruthy();
      expect(result.errors['equivalence-equipment']).toBeTruthy();
      expect(result.errors['equivalence-hours']).toBeTruthy();
      expect(result.errors['equivalence-location']).toBeTruthy();
    }
  });

  it('現在の追加費用がないかを明示させ、非表示の古い値を0円として扱う', () => {
    const missing = validateAssessmentInput({
      ...validRaw(),
      additionalFeesMode: '',
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.errors['additional-fees-mode']).toBeTruthy();

    const none = validateAssessmentInput({
      ...validRaw(),
      additionalFeesMode: 'none',
      monthlyFixedFee: '500',
      annualFee: '1200',
    });
    expect(none.ok).toBe(true);
    if (none.ok) {
      expect(none.value.fees).toEqual({
        monthlyFeeYen: 8_000,
        monthlyFixedFeeYen: 0,
        annualFeeYen: 0,
      });
    }
  });

  it('追加費用があると選んだ場合は正の金額を少なくとも1つ要求する', () => {
    const current = validateAssessmentInput({
      ...validRaw(),
      additionalFeesMode: 'known',
    });
    expect(current.ok).toBe(false);
    if (!current.ok) expect(current.errors['additional-fees-mode']).toContain('1円以上');

    const alternative = validateAssessmentInput({
      ...validRaw(),
      alternativeAvailability: 'known',
      alternativeName: '比較プラン',
      alternativeKind: 'monthly',
      alternativeMonthlyFee: '7000',
      alternativeAdditionalFeesMode: 'known',
      alternativeSourceConfirmed: true,
      equivalenceEquipment: 'meets',
      equivalenceHours: 'meets',
      equivalenceLocation: 'meets',
    });
    expect(alternative.ok).toBe(false);
    if (!alternative.ok) {
      expect(alternative.errors['alternative-additional-fees-mode']).toContain('1円以上');
    }
  });

  it.each(['', '-1', '1.5', '1e3', '100001', 'abc'])('無効な月会費 %s を拒否する', (monthlyFee) => {
    const result = validateAssessmentInput({ ...validRaw(), monthlyFee });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors['monthly-fee']).toBeTruthy();
  });

  it('主要な必須項目の空欄を項目別に返す', () => {
    const result = validateAssessmentInput({
      ...createEmptyRawAssessmentInput(),
      monthlyFee: '8000',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors['visit-mode']).toBeTruthy();
      expect(result.errors.purpose).toBeTruthy();
      expect(result.errors['planned-mode']).toBeTruthy();
      expect(result.errors['achieved-mode']).toBeTruthy();
      expect(result.errors['purpose-evidence']).toBeTruthy();
      expect(result.errors.barrier).toBeTruthy();
    }
  });
});
