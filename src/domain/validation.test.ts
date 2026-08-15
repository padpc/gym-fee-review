import { describe, expect, it } from 'vitest';
import {
  createEmptyRawAssessmentInput,
  validateAssessmentInput,
  type RawAssessmentInput,
  type RawValueEntry,
} from './validation';

function rawValue(overrides: Partial<RawValueEntry> = {}): RawValueEntry {
  return {
    id: 'training',
    customLabel: '',
    role: 'primary',
    status: 'fulfilled',
    ...overrides,
  };
}

function validRaw(overrides: Partial<RawAssessmentInput> = {}): RawAssessmentInput {
  return {
    ...createEmptyRawAssessmentInput(),
    monthlyFee: '８０００',
    monthlyAdditionalMode: 'none',
    annualFeeMode: 'none',
    visitMode: 'exact',
    exactVisits: '8',
    values: [rawValue()],
    feeBurden: 'comfortable',
    ...overrides,
  };
}

describe('R7 入力検証', () => {
  it('料金・回数・館内時間・最大3価値・負担を正規化する', () => {
    const result = validateAssessmentInput(validRaw({
      monthlyAdditionalMode: 'known',
      monthlyAdditionalFee: '５００',
      annualFeeMode: 'known',
      annualFee: '１２００',
      timeMode: 'total-hours',
      totalHours: '９．５',
      values: [
        rawValue({ id: 'bath-sauna' }),
        rawValue({ id: 'studio', role: 'secondary', status: 'partial' }),
        rawValue({ id: 'pool', role: 'secondary', status: 'unknown' }),
      ],
    }));
    expect(result).toEqual({
      ok: true,
      value: {
        fees: {
          baseMonthlyFeeYen: 8_000,
          monthlyAdditional: { kind: 'known', yen: 500 },
          annualFee: { kind: 'known', yen: 1_200 },
        },
        visits: { kind: 'exact', visits: 8 },
        time: { kind: 'total-hours', totalHours: 9.5 },
        values: [
          { id: 'bath-sauna', customLabel: '', role: 'primary', status: 'fulfilled' },
          { id: 'studio', customLabel: '', role: 'secondary', status: 'partial' },
          { id: 'pool', customLabel: '', role: 'secondary', status: 'unknown' },
        ],
        feeBurden: 'comfortable',
      },
    });
  });

  it('毎月追加費用の「なし」は隠れた金額を採用しない', () => {
    const result = validateAssessmentInput(validRaw({
      monthlyAdditionalMode: 'none',
      monthlyAdditionalFee: '不正な隠れ値',
    }));
    expect(result.ok && result.value.fees.monthlyAdditional).toEqual({ kind: 'none' });
  });

  it('年会費の「なし」は隠れた金額を採用しない', () => {
    const result = validateAssessmentInput(validRaw({
      annualFeeMode: 'none',
      annualFee: '不正な隠れ値',
    }));
    expect(result.ok && result.value.fees.annualFee).toEqual({ kind: 'none' });
  });

  it('「あり」の追加費用は必須かつ1円以上とする', () => {
    for (const changes of [
      { monthlyAdditionalMode: 'known' as const, monthlyAdditionalFee: '' },
      { monthlyAdditionalMode: 'known' as const, monthlyAdditionalFee: '0' },
      { monthlyAdditionalMode: 'known' as const, monthlyAdditionalFee: '50001' },
      { annualFeeMode: 'known' as const, annualFee: '' },
      { annualFeeMode: 'known' as const, annualFee: '0' },
      { annualFeeMode: 'known' as const, annualFee: '200001' },
    ]) {
      const result = validateAssessmentInput(validRaw(changes));
      expect(result.ok).toBe(false);
    }

  });

  it('型を迂回した料金不明モードを「なし」とみなさず拒否する', () => {
    const result = validateAssessmentInput(validRaw({
      monthlyAdditionalMode: 'unknown' as never,
      annualFeeMode: 'unknown' as never,
    }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors['monthly-additional-mode']).toBeTruthy();
      expect(result.errors['annual-fee-mode']).toBeTruthy();
    }
  });

  it('基本月会費の0円・上限・全角を許可し、小数・負数・上限超過を拒否する', () => {
    for (const monthlyFee of ['0', '１０００００']) {
      expect(validateAssessmentInput(validRaw({ monthlyFee })).ok).toBe(true);
    }
    for (const monthlyFee of ['', '-1', '1.5', '100001']) {
      const result = validateAssessmentInput(validRaw({ monthlyFee }));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors['monthly-fee']).toBeTruthy();
    }
  });

  it('全ての来館範囲と21回以上、回数不明を正規化する', () => {
    const expectations = [
      ['monthly-1-3', { kind: 'bounded', bandId: 'monthly-1-3', min: 1, max: 3 }],
      ['weekly-1', { kind: 'bounded', bandId: 'weekly-1', min: 4, max: 6 }],
      ['weekly-2', { kind: 'bounded', bandId: 'weekly-2', min: 7, max: 10 }],
      ['weekly-3', { kind: 'bounded', bandId: 'weekly-3', min: 11, max: 14 }],
      ['weekly-4', { kind: 'bounded', bandId: 'weekly-4', min: 15, max: 20 }],
      ['monthly-21-plus', { kind: 'at-least', bandId: 'monthly-21-plus', min: 21 }],
    ] as const;
    for (const [visitBand, expected] of expectations) {
      const result = validateAssessmentInput(validRaw({ visitMode: 'range', visitBand }));
      expect(result.ok && result.value.visits).toEqual(expected);
    }
    const unknown = validateAssessmentInput(validRaw({
      visitMode: 'unknown', visitBand: 'monthly-21-plus', exactVisits: '不正',
    }));
    expect(unknown.ok && unknown.value.visits).toEqual({ kind: 'unknown' });
  });

  it('正確な来館0回は価値質問を要求せず、隠れた価値入力を空へ正規化する', () => {
    const empty = validateAssessmentInput(validRaw({
      exactVisits: '0', values: [], noValueUsed: false,
    }));
    expect(empty.ok && empty.value.values).toEqual([]);

    const stale = validateAssessmentInput(validRaw({
      exactVisits: '0',
      values: [rawValue({ id: 'other', customLabel: '', role: 'invalid' as never, status: 'invalid' as never })],
      noValueUsed: false,
    }));
    expect(stale.ok && stale.value.values).toEqual([]);

    const explicitNone = validateAssessmentInput(validRaw({
      exactVisits: '0', values: [], noValueUsed: true,
    }));
    expect(explicitNone.ok && explicitNone.value.values).toEqual([]);

    expect(validateAssessmentInput(validRaw({ exactVisits: '100' })).ok).toBe(true);
    for (const exactVisits of ['', '-1', '1.5', '101']) {
      const result = validateAssessmentInput(validRaw({ exactVisits }));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors['exact-visits']).toBeTruthy();
    }
  });

  it('館内時間は合計・平均を検証し、未入力なら隠れ値を無視する', () => {
    const average = validateAssessmentInput(validRaw({
      timeMode: 'average-minutes', averageMinutes: '90', totalHours: '不正',
    }));
    expect(average.ok && average.value.time).toEqual({ kind: 'average-minutes', averageMinutes: 90 });

    const omitted = validateAssessmentInput(validRaw({
      timeMode: 'unknown', totalHours: '不正', averageMinutes: '不正',
    }));
    expect(omitted.ok && omitted.value.time).toEqual({ kind: 'unknown' });

    for (const changes of [
      { timeMode: 'total-hours' as const, totalHours: '0' },
      { timeMode: 'total-hours' as const, totalHours: '744.1' },
      { timeMode: 'total-hours' as const, totalHours: '1.25' },
      { timeMode: 'average-minutes' as const, averageMinutes: '0' },
      { timeMode: 'average-minutes' as const, averageMinutes: '1441' },
    ]) {
      expect(validateAssessmentInput(validRaw(changes)).ok).toBe(false);
    }
  });

  it('来館0回と正の館内時間を同時に採用しない', () => {
    for (const changes of [
      { exactVisits: '0', timeMode: 'total-hours' as const, totalHours: '1.0' },
      { exactVisits: '0', timeMode: 'average-minutes' as const, averageMinutes: '90' },
    ]) {
      const result = validateAssessmentInput(validRaw(changes));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[changes.timeMode === 'total-hours' ? 'total-hours' : 'average-minutes'])
          .toContain('来館0回');
      }
    }
  });

  it.each(['fulfilled', 'partial', 'quality-below', 'not-used', 'unknown'] as const)(
    '価値状態%sを採用する',
    (status) => {
      const result = validateAssessmentInput(validRaw({ values: [rawValue({ status })] }));
      expect(result.ok && result.value.values[0]?.status).toBe(status);
    },
  );

  it('主な理由は厳密に1件、追加理由は最大2件にする', () => {
    const noPrimary = validateAssessmentInput(validRaw({
      values: [rawValue({ role: 'secondary' })],
    }));
    expect(noPrimary.ok).toBe(false);
    if (!noPrimary.ok) expect(noPrimary.errors['primary-value']).toBeTruthy();

    const twoPrimary = validateAssessmentInput(validRaw({
      values: [rawValue(), rawValue({ id: 'pool' })],
    }));
    expect(twoPrimary.ok).toBe(false);
    if (!twoPrimary.ok) expect(twoPrimary.errors['primary-value']).toBeTruthy();

    const threeSecondary = validateAssessmentInput(validRaw({
      values: [
        rawValue(),
        rawValue({ id: 'pool', role: 'secondary' }),
        rawValue({ id: 'studio', role: 'secondary' }),
        rawValue({ id: 'social', role: 'secondary' }),
      ],
    }));
    expect(threeSecondary.ok).toBe(false);
    if (!threeSecondary.ok) {
      expect(threeSecondary.errors['secondary-values']).toBeTruthy();
      expect(threeSecondary.errors.values).toBeTruthy();
    }
  });

  it('価値なしは明示が必要で、価値項目との同時選択と重複を拒否する', () => {
    const none = validateAssessmentInput(validRaw({ values: [], noValueUsed: true }));
    expect(none.ok && none.value.values).toEqual([]);

    const neither = validateAssessmentInput(validRaw({ values: [], noValueUsed: false }));
    expect(neither.ok).toBe(false);
    if (!neither.ok) expect(neither.errors.values).toBeTruthy();

    const conflict = validateAssessmentInput(validRaw({ noValueUsed: true }));
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) expect(conflict.errors.values).toContain('同時');

    const duplicate = validateAssessmentInput(validRaw({
      values: [rawValue(), rawValue({ role: 'secondary' })],
    }));
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.errors.values).toContain('重複');
  });

  it('その他は名称1～80文字必須で、他IDの隠れ名称は破棄する', () => {
    const other = validateAssessmentInput(validRaw({
      values: [rawValue({ id: 'other', customLabel: '  リモートワーク前の気分転換  ' })],
    }));
    expect(other.ok && other.value.values[0]).toEqual({
      id: 'other', customLabel: 'リモートワーク前の気分転換', role: 'primary', status: 'fulfilled',
    });

    for (const customLabel of ['', 'あ'.repeat(81)]) {
      const invalid = validateAssessmentInput(validRaw({
        values: [rawValue({ id: 'other', customLabel })],
      }));
      expect(invalid.ok).toBe(false);
      if (!invalid.ok) expect(invalid.errors['value-other-custom-label']).toContain('1～80文字');
    }

    const hidden = validateAssessmentInput(validRaw({
      values: [rawValue({ customLabel: '採用しない' })],
    }));
    expect(hidden.ok && hidden.value.values[0]?.customLabel).toBe('');
  });

  it('型を迂回した不正なモード・役割・状態を採用しない', () => {
    const result = validateAssessmentInput(validRaw({
      monthlyAdditionalMode: 'invalid' as never,
      annualFeeMode: 'invalid' as never,
      visitMode: 'invalid' as never,
      timeMode: 'invalid' as never,
      values: [rawValue({ role: 'invalid' as never, status: 'invalid' as never })],
      feeBurden: 'invalid' as never,
    }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors['monthly-additional-mode']).toBeTruthy();
      expect(result.errors['annual-fee-mode']).toBeTruthy();
      expect(result.errors['visit-mode']).toBeTruthy();
      expect(result.errors['time-mode']).toBeTruthy();
      expect(result.errors['value-training-role']).toBeTruthy();
      expect(result.errors['value-training-status']).toBeTruthy();
      expect(result.errors['fee-burden']).toBeTruthy();
    }
  });

  it('必須項目の不足をまとめて返す', () => {
    const result = validateAssessmentInput(createEmptyRawAssessmentInput());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors['monthly-fee']).toBeTruthy();
      expect(result.errors['monthly-additional-mode']).toBeTruthy();
      expect(result.errors['annual-fee-mode']).toBeTruthy();
      expect(result.errors['visit-mode']).toBeTruthy();
      expect(result.errors.values).toBeTruthy();
      expect(result.errors['fee-burden']).toBeTruthy();
    }
  });
});
