import { describe, expect, it } from 'vitest';
import {
  createEmptyRawAssessmentInput,
  rawRequiresBarrier,
  validateAssessmentInput,
  type RawAssessmentInput,
} from './validation';

function validRaw(): RawAssessmentInput {
  return {
    ...createEmptyRawAssessmentInput(),
    monthlyFee: '８０００',
    additionalFeesMode: 'none' as const,
    visitMode: 'exact' as const,
    exactVisits: '8',
    purpose: 'strength' as const,
    activity: 'strength-training' as const,
    performedMode: 'exact' as const,
    performedCount: '7',
    completedMode: 'exact' as const,
    completedCount: '7',
    contentFit: 'fits' as const,
    purposeEvidence: 'improved' as const,
    usedServices: ['specialty-equipment'],
    continuation: 'choose' as const,
    safety: 'no-concern' as const,
  };
}

describe('GFR-G1R4 入力検証', () => {
  it('費用・V・S・F・質・変化・付帯価値・再選択・安全を正規化する', () => {
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
        visits: { kind: 'exact', visits: 8 },
        time: { kind: 'unknown' },
        purpose: {
          purpose: 'strength',
          activity: 'strength-training',
          performed: { kind: 'exact', count: 7 },
          completed: { kind: 'exact', count: 7 },
          contentFit: 'fits',
          evidence: 'improved',
        },
        usedServices: ['specialty-equipment'],
        continuation: 'choose',
        safety: 'no-concern',
        barrier: null,
        alternative: { availability: 'unknown' },
      },
    });
  });

  it('正確値で0 ≤ F ≤ S ≤ Vを検証する', () => {
    const validZero = validateAssessmentInput({
      ...validRaw(),
      exactVisits: '0',
      performedCount: '0',
      completedCount: '0',
      purposeEvidence: 'unchanged',
      barrier: 'schedule',
    });
    expect(validZero.ok).toBe(true);

    const sOverV = validateAssessmentInput({ ...validRaw(), exactVisits: '4', performedCount: '5' });
    expect(sOverV.ok).toBe(false);
    if (!sOverV.ok) expect(sOverV.errors['performed-count']).toContain('4回以下');

    const fOverS = validateAssessmentInput({ ...validRaw(), completedCount: '8' });
    expect(fOverS.ok).toBe(false);
    if (!fOverS.ok) expect(fOverS.errors['completed-count']).toContain('S以下');
  });

  it('追加費用ありで現行の月額・年額が全て空または0なら拒否する', () => {
    for (const values of [
      { monthlyFixedFee: '', annualFee: '' },
      { monthlyFixedFee: '0', annualFee: '0' },
    ]) {
      const result = validateAssessmentInput({
        ...validRaw(),
        additionalFeesMode: 'known',
        ...values,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors['additional-fees-mode']).toBeTruthy();
    }
  });

  it('V範囲ではS・Fの正確値が既知上限を超える入力だけを拒否する', () => {
    const valid = validateAssessmentInput({
      ...validRaw(),
      visitMode: 'range',
      visitBand: 'weekly-1',
      performedCount: '6',
      completedCount: '5',
      barrier: 'none',
    });
    expect(valid.ok).toBe(true);

    const invalid = validateAssessmentInput({
      ...validRaw(),
      visitMode: 'range',
      visitBand: 'weekly-1',
      performedCount: '7',
      completedCount: '7',
    });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.errors['performed-count']).toContain('6回以下');
  });

  it('S・Fの不明を0へ変換せず、V不明でもS・F既知を受け付ける', () => {
    const unknown = validateAssessmentInput({
      ...validRaw(),
      performedMode: 'unknown',
      performedCount: 'invalid',
      completedMode: 'unknown',
      completedCount: 'invalid',
      contentFit: 'unknown',
      purposeEvidence: 'unknown',
      continuation: 'unknown',
      barrier: 'unknown',
    });
    expect(unknown.ok).toBe(true);
    if (unknown.ok) {
      expect(unknown.value.purpose.performed).toEqual({ kind: 'unknown' });
      expect(unknown.value.purpose.completed).toEqual({ kind: 'unknown' });
    }

    const knownWithUnknownV = validateAssessmentInput({
      ...validRaw(),
      visitMode: 'unknown',
    });
    expect(knownWithUnknownV.ok).toBe(true);
  });

  it('実運動時間は任意で、入力時だけ検証し、来館0回との矛盾を拒否する', () => {
    const total = validateAssessmentInput({
      ...validRaw(),
      timeMode: 'total-hours',
      totalHours: '９．５',
    });
    expect(total.ok && total.value.time).toEqual({ kind: 'total-hours', totalHours: 9.5 });

    const invalid = validateAssessmentInput({
      ...validRaw(),
      exactVisits: '0',
      performedCount: '0',
      completedCount: '0',
      timeMode: 'total-hours',
      totalHours: '1.5',
      purposeEvidence: 'unchanged',
      barrier: 'none',
    });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.errors['total-hours']).toContain('実運動時間');
      expect(invalid.errors['total-hours']).not.toContain('滞在時間');
    }

    expect(validateAssessmentInput({
      ...validRaw(),
      timeMode: 'unknown',
      totalHours: 'invalid',
      averageMinutes: 'invalid',
    }).ok).toBe(true);
  });

  it('付帯サービスの特になしと他項目を同時に許さず、重複は正規化する', () => {
    const conflict = validateAssessmentInput({
      ...validRaw(),
      usedServices: ['none', 'pool'],
    });
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) expect(conflict.errors['used-services']).toContain('同時');

    const duplicate = validateAssessmentInput({
      ...validRaw(),
      usedServices: ['pool', 'pool'],
    });
    expect(duplicate.ok).toBe(true);
    if (duplicate.ok) expect(duplicate.value.usedServices).toEqual(['pool']);
  });

  it('阻害要因は問題時だけ必須で、非表示の古い値を使用しない', () => {
    const strong = validateAssessmentInput({ ...validRaw(), barrier: 'travel' });
    expect(strong.ok).toBe(true);
    if (strong.ok) expect(strong.value.barrier).toBeNull();

    const missing = validateAssessmentInput({
      ...validRaw(),
      completedCount: '5',
      barrier: '' as const,
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.errors.barrier).toBeTruthy();

    const known = validateAssessmentInput({
      ...validRaw(),
      completedCount: '5',
      barrier: 'crowding',
    });
    expect(known.ok).toBe(true);
    if (known.ok) expect(known.value.barrier).toBe('crowding');
  });

  it('安全懸念時は主提案優先のため阻害要因を要求しない', () => {
    const raw = {
      ...validRaw(),
      safety: 'concern' as const,
      completedCount: '0',
      contentFit: 'does-not-fit' as const,
      purposeEvidence: 'worse' as const,
      continuation: 'not-choose' as const,
      barrier: '' as const,
    };
    expect(rawRequiresBarrier(raw)).toBe(false);
    const result = validateAssessmentInput(raw);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.barrier).toBeNull();
  });

  it('公式代替の料金・同等条件・確認を受け付ける', () => {
    const result = validateAssessmentInput({
      ...validRaw(),
      alternativeAvailability: 'known',
      alternativeSourceConfirmed: true,
      alternativeAdditionalFeesMode: 'none',
      alternativeKind: 'per-visit',
      alternativeName: '  都度利用  ',
      alternativePerVisitFee: '１８００',
      equivalenceServices: 'meets',
      equivalenceHours: 'meets',
      equivalenceLocation: 'not-required',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.alternative).toEqual({
        availability: 'known',
        name: '都度利用',
        pricing: { kind: 'per-visit', perVisitFeeYen: 1_800 },
        monthlyFixedFeeYen: 0,
        annualFeeYen: 0,
        requiredServiceMonthlyYen: 0,
        equivalence: {
          services: 'meets',
          hours: 'meets',
          location: 'not-required',
        },
      });
    }
  });

  it('公式料金の確認が未チェックなら代替比較を拒否する', () => {
    const result = validateAssessmentInput({
      ...validRaw(),
      alternativeAvailability: 'known',
      alternativeSourceConfirmed: false,
      alternativeAdditionalFeesMode: 'none',
      alternativeKind: 'monthly',
      alternativeName: '比較プラン',
      alternativeMonthlyFee: '5000',
      equivalenceServices: 'meets',
      equivalenceHours: 'meets',
      equivalenceLocation: 'meets',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors['alternative-source-confirmed']).toBeTruthy();
  });

  it('代替の追加費用ありで3費用が全て空または0なら拒否する', () => {
    for (const values of [
      {
        alternativeMonthlyFixedFee: '',
        alternativeAnnualFee: '',
        alternativeServiceMonthlyFee: '',
      },
      {
        alternativeMonthlyFixedFee: '0',
        alternativeAnnualFee: '0',
        alternativeServiceMonthlyFee: '0',
      },
    ]) {
      const result = validateAssessmentInput({
        ...validRaw(),
        alternativeAvailability: 'known',
        alternativeSourceConfirmed: true,
        alternativeAdditionalFeesMode: 'known',
        alternativeKind: 'monthly',
        alternativeName: '比較プラン',
        alternativeMonthlyFee: '5000',
        equivalenceServices: 'meets',
        equivalenceHours: 'meets',
        equivalenceLocation: 'meets',
        ...values,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors['alternative-additional-fees-mode']).toBeTruthy();
      }
    }
  });

  it('代替なしでは非表示の代替値を検証・使用しない', () => {
    expect(validateAssessmentInput({
      ...validRaw(),
      alternativeAvailability: 'unknown',
      alternativeKind: 'monthly',
      alternativeMonthlyFee: 'invalid',
      equivalenceServices: 'does-not-meet',
      alternativeSourceConfirmed: false,
    }).ok).toBe(true);
  });

  it('主要な必須質問を項目別エラーにする', () => {
    const result = validateAssessmentInput({
      ...createEmptyRawAssessmentInput(),
      monthlyFee: '8000',
      additionalFeesMode: 'none',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors['visit-mode']).toBeTruthy();
      expect(result.errors.purpose).toBeTruthy();
      expect(result.errors.activity).toBeTruthy();
      expect(result.errors['performed-mode']).toBeTruthy();
      expect(result.errors['completed-mode']).toBeTruthy();
      expect(result.errors['content-fit']).toBeTruthy();
      expect(result.errors['purpose-evidence']).toBeTruthy();
      expect(result.errors['used-services']).toBeTruthy();
      expect(result.errors.continuation).toBeTruthy();
      expect(result.errors.safety).toBeTruthy();
    }
  });
});
