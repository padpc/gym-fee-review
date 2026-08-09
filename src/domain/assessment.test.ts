import { describe, expect, it } from 'vitest';
import {
  assessPrice,
  assessValue,
  buildOverallAssessment,
  buildAssessmentResult,
  calculateMonthlyEquivalent,
  type ValidatedAssessmentInput,
} from './assessment';

const fees = { monthlyFeeYen: 8_000, monthlyFixedFeeYen: 0, annualFeeYen: 0 };

describe('GFR-G1R2 料金基準に対する判定', () => {
  it('年会費を先に丸めず月額相当へ合算する', () => {
    expect(
      calculateMonthlyEquivalent({
        monthlyFeeYen: 8_000,
        monthlyFixedFeeYen: 500,
        annualFeeYen: 1_200,
      }),
    ).toEqual({ units: 103_200, roundedYen: 8_600 });

    expect(
      calculateMonthlyEquivalent({
        monthlyFeeYen: 0,
        monthlyFixedFeeYen: 0,
        annualFeeYen: 6,
      }).roundedYen,
    ).toBe(1);
  });

  it('本人の月額上限に対して基準内・超過と差額を返す', () => {
    expect(
      assessPrice(fees, null, { kind: 'monthly-limit', amountYen: 9_000 }),
    ).toMatchObject({ status: 'within', difference: { direction: 'within-by', amountYen: 1_000 } });

    expect(
      assessPrice(fees, null, { kind: 'monthly-limit', amountYen: 7_000 }),
    ).toMatchObject({ status: 'over', difference: { direction: 'over-by', amountYen: 1_000 } });
  });

  it('実在する代替案と現在の月額相当を比較する', () => {
    expect(
      assessPrice(fees, null, { kind: 'alternative-monthly', amountYen: 8_000 }),
    ).toMatchObject({ status: 'within', difference: { direction: 'equal', amountYen: 0 } });

    expect(
      assessPrice(fees, null, { kind: 'alternative-monthly', amountYen: 7_500 }),
    ).toMatchObject({ status: 'over', difference: { direction: 'over-by', amountYen: 500 } });
  });

  it('正確な回数と0回を1回上限へ照合する', () => {
    expect(
      assessPrice(fees, { kind: 'exact', visits: 4 }, { kind: 'per-visit-limit', amountYen: 2_000 }),
    ).toMatchObject({ status: 'within', requiredVisits: 4, perVisit: { kind: 'exact', yenPerVisit: 2_000 } });

    expect(
      assessPrice(fees, { kind: 'exact', visits: 3 }, { kind: 'per-visit-limit', amountYen: 2_000 }),
    ).toMatchObject({ status: 'over', requiredVisits: 4, perVisit: { kind: 'exact', yenPerVisit: 2_667 } });

    expect(
      assessPrice(fees, { kind: 'exact', visits: 0 }, { kind: 'per-visit-limit', amountYen: 2_000 }),
    ).toMatchObject({ status: 'over', requiredVisits: 4, perVisit: { kind: 'exact', yenPerVisit: null } });

    expect(
      assessPrice(
        { monthlyFeeYen: 0, monthlyFixedFeeYen: 0, annualFeeYen: 0 },
        { kind: 'exact', visits: 0 },
        { kind: 'per-visit-limit', amountYen: 2_000 },
      ),
    ).toMatchObject({ status: 'insufficient', requiredVisits: 1 });
  });

  it('表示上同額でも丸め前の差を失わない', () => {
    const monthly = assessPrice(
      { monthlyFeeYen: 0, monthlyFixedFeeYen: 0, annualFeeYen: 1 },
      null,
      { kind: 'monthly-limit', amountYen: 0 },
    );
    expect(monthly).toMatchObject({
      status: 'over',
      difference: { amountUnits: 1, amountYen: 0 },
      hasRoundedBoundaryDifference: true,
    });

    const perVisit = assessPrice(
      { monthlyFeeYen: 381, monthlyFixedFeeYen: 0, annualFeeYen: 1 },
      { kind: 'exact', visits: 1 },
      { kind: 'per-visit-limit', amountYen: 381 },
    );
    expect(perVisit).toMatchObject({
      status: 'over',
      perVisit: { kind: 'exact', yenPerVisit: 381 },
      hasRoundedBoundaryDifference: true,
    });
  });

  it('頻度範囲を全域内・全域超過・途中変化に分ける', () => {
    const weekly = { kind: 'bounded' as const, bandId: 'weekly-1' as const, min: 4, max: 6 };

    expect(assessPrice(fees, weekly, { kind: 'per-visit-limit', amountYen: 2_000 }).status).toBe('within');
    expect(assessPrice(fees, weekly, { kind: 'per-visit-limit', amountYen: 1_000 }).status).toBe('over');
    expect(assessPrice(fees, weekly, { kind: 'per-visit-limit', amountYen: 1_500 })).toMatchObject({
      status: 'mixed',
      requiredVisits: 6,
    });
  });

  it('月21回以上と回数不明で必要回数を隠さない', () => {
    expect(
      assessPrice(
        fees,
        { kind: 'at-least', bandId: 'monthly-21-plus', min: 21 },
        { kind: 'per-visit-limit', amountYen: 400 },
      ),
    ).toMatchObject({ status: 'within', requiredVisits: 20 });

    expect(
      assessPrice(
        fees,
        { kind: 'at-least', bandId: 'monthly-21-plus', min: 21 },
        { kind: 'per-visit-limit', amountYen: 300 },
      ),
    ).toMatchObject({ status: 'mixed', requiredVisits: 27 });

    const unknown = assessPrice(fees, { kind: 'unknown' }, { kind: 'per-visit-limit', amountYen: 1_000 });
    expect(unknown).toMatchObject({ status: 'insufficient', requiredVisits: 8, perVisit: { kind: 'unknown' } });
    if (unknown.perVisit?.kind === 'unknown') {
      expect(unknown.perVisit.rows[0]).toEqual({ visits: 0, yenPerVisit: null, unusedPaymentYen: 8_000 });
      expect(unknown.perVisit.rows.at(-1)).toEqual({ visits: 20, yenPerVisit: 400, unusedPaymentYen: null });
    }
  });
});

describe('GFR-G1R2 利用価値と総合結果', () => {
  it.each([
    ['achieved', 'hard', 'strong'],
    ['achieved', 'possible', 'strong'],
    ['achieved', 'easy', 'mixed'],
    ['achieved', 'unknown', 'insufficient'],
    ['partly', 'hard', 'mixed'],
    ['partly', 'possible', 'mixed'],
    ['partly', 'easy', 'mixed'],
    ['partly', 'unknown', 'insufficient'],
    ['hardly', 'hard', 'mixed'],
    ['hardly', 'possible', 'weak'],
    ['hardly', 'easy', 'weak'],
    ['hardly', 'unknown', 'insufficient'],
    ['unknown', 'hard', 'insufficient'],
    ['unknown', 'possible', 'insufficient'],
    ['unknown', 'easy', 'insufficient'],
    ['unknown', 'unknown', 'insufficient'],
  ] as const)('%s × %s を %s と判定する', (progress, replaceability, status) => {
    expect(assessValue('exercise-habit', progress, replaceability).status).toBe(status);
  });

  it.each([
    ['within', 'strong', 'both-supported'],
    ['within', 'mixed', 'value-review'],
    ['within', 'weak', 'value-review'],
    ['within', 'insufficient', 'inconclusive'],
    ['over', 'strong', 'price-review-value-strong'],
    ['over', 'mixed', 'price-review'],
    ['over', 'weak', 'both-review'],
    ['over', 'insufficient', 'inconclusive'],
    ['mixed', 'strong', 'inconclusive'],
    ['mixed', 'mixed', 'inconclusive'],
    ['mixed', 'weak', 'inconclusive'],
    ['mixed', 'insufficient', 'inconclusive'],
    ['insufficient', 'strong', 'inconclusive'],
    ['insufficient', 'mixed', 'inconclusive'],
    ['insufficient', 'weak', 'inconclusive'],
    ['insufficient', 'insufficient', 'inconclusive'],
  ] as const)('料金%s・価値%sの主結果を%sにする', (priceStatus, valueStatus, overallKind) => {
    const overall = buildOverallAssessment(priceStatus, valueStatus);
    expect(overall.kind).toBe(overallKind);
    expect(overall.headline).not.toMatch(/退会すべき|休会すべき|来館すべき|優先度|先に見直し/);
  });

  it('入力全体から2軸と主結果を組み立てる', () => {
    const input: ValidatedAssessmentInput = {
      fees,
      visits: { kind: 'exact', visits: 4 },
      benchmark: { kind: 'per-visit-limit', amountYen: 2_000 },
      purpose: 'exercise-habit',
      purposeProgress: 'achieved',
      replaceability: 'hard',
    };
    expect(buildAssessmentResult(input)).toMatchObject({
      price: { status: 'within' },
      value: { status: 'strong' },
      overall: { kind: 'both-supported' },
    });
  });
});
