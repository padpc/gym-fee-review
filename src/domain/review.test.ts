import { describe, expect, it } from 'vitest';
import {
  buildReviewResult,
  calculateMonthlyEquivalent,
  calculatePerHourResult,
  calculatePerVisitResult,
  type ValidatedReviewInput,
} from './review';

const monthlyUnits = 8_000 * 12;

describe('GFR-G1R 料金を基準別に確認する', () => {
  it('月額・固定費・年会費を1/12円単位で合算する', () => {
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

  it('先月実数の0回と正の回数を区別する', () => {
    expect(calculatePerVisitResult(monthlyUnits, { kind: 'exact', visits: 0 })).toEqual({
      kind: 'exact',
      visits: 0,
      yenPerVisit: null,
      unusedPaymentYen: 8_000,
    });
    expect(calculatePerVisitResult(monthlyUnits, { kind: 'exact', visits: 3 })).toMatchObject({
      kind: 'exact',
      visits: 3,
      yenPerVisit: 2_667,
    });
  });

  it('概数を中央値にせず両端の範囲で返す', () => {
    expect(
      calculatePerVisitResult(monthlyUnits, {
        kind: 'bounded',
        bandId: 'weekly-1',
        min: 4,
        max: 6,
      }),
    ).toEqual({
      kind: 'bounded',
      bandId: 'weekly-1',
      minVisits: 4,
      maxVisits: 6,
      minYenPerVisit: 1_333,
      maxYenPerVisit: 2_000,
    });
  });

  it('月21回以上と回数不明を上限・固定シナリオで返す', () => {
    expect(
      calculatePerVisitResult(monthlyUnits, {
        kind: 'at-least',
        bandId: 'monthly-21-plus',
        min: 21,
      }),
    ).toEqual({
      kind: 'at-least',
      bandId: 'monthly-21-plus',
      minVisits: 21,
      maxYenPerVisit: 381,
    });

    const result = calculatePerVisitResult(monthlyUnits, { kind: 'unknown' });
    expect(result.kind).toBe('unknown');
    if (result.kind === 'unknown') {
      expect(result.rows.map((row) => row.visits)).toEqual([0, 1, 2, 4, 6, 8, 10, 12, 16, 20]);
      expect(result.rows[0]).toEqual({ visits: 0, yenPerVisit: null, unusedPaymentYen: 8_000 });
      expect(result.rows[4]).toEqual({ visits: 6, yenPerVisit: 1_333, unusedPaymentYen: null });
    }
  });

  it('合計時間と平均滞在時間を分単位で計算する', () => {
    expect(
      calculatePerHourResult(monthlyUnits, null, { kind: 'total', totalMinutes: 360 }),
    ).toEqual({ kind: 'total', totalMinutes: 360, yenPerHour: 1_333 });

    expect(
      calculatePerHourResult(
        monthlyUnits,
        { kind: 'bounded', bandId: 'weekly-1', min: 4, max: 6 },
        { kind: 'average', averageMinutes: 90 },
      ),
    ).toEqual({
      kind: 'bounded',
      bandId: 'weekly-1',
      minVisits: 4,
      maxVisits: 6,
      averageMinutes: 90,
      minTotalMinutes: 360,
      maxTotalMinutes: 540,
      minYenPerHour: 889,
      maxYenPerHour: 1_333,
    });
  });

  it('平均滞在時間の0回・21回以上・回数不明を別の結果型で返す', () => {
    expect(
      calculatePerHourResult(
        monthlyUnits,
        { kind: 'exact', visits: 0 },
        { kind: 'average', averageMinutes: 60 },
      ),
    ).toMatchObject({ kind: 'exact', visits: 0, totalMinutes: 0, yenPerHour: null });

    expect(
      calculatePerHourResult(
        monthlyUnits,
        { kind: 'at-least', bandId: 'monthly-21-plus', min: 21 },
        { kind: 'average', averageMinutes: 60 },
      ),
    ).toEqual({
      kind: 'at-least',
      bandId: 'monthly-21-plus',
      minVisits: 21,
      averageMinutes: 60,
      minTotalMinutes: 1_260,
      maxYenPerHour: 381,
    });

    const unknown = calculatePerHourResult(
      monthlyUnits,
      { kind: 'unknown' },
      { kind: 'average', averageMinutes: 90 },
    );
    expect(unknown.kind).toBe('unknown');
    if (unknown.kind === 'unknown') {
      expect(unknown.rows[0]).toEqual({ visits: 0, totalMinutes: 0, yenPerHour: null });
      expect(unknown.rows[4]).toEqual({ visits: 6, totalMinutes: 540, yenPerHour: 889 });
    }
  });

  it('設備・重要項目・続けやすさを料金へ加算しない', () => {
    const base: ValidatedReviewInput = {
      criterion: 'all',
      fees: { monthlyFeeYen: 8_000, monthlyFixedFeeYen: 0, annualFeeYen: 0 },
      visits: { kind: 'exact', visits: 4 },
      time: { kind: 'average', averageMinutes: 90 },
      usedServices: {},
      importantServices: [],
      continuation: [],
    };
    const withSelections: ValidatedReviewInput = {
      ...base,
      usedServices: { pool: '1-3', sauna: 'not-countable' },
      importantServices: ['pool', 'classes'],
      continuation: ['nearby', 'opening-hours'],
    };

    const baseResult = buildReviewResult(base);
    const selectedResult = buildReviewResult(withSelections);
    expect(selectedResult.monthly).toEqual(baseResult.monthly);
    expect(selectedResult.perVisit).toEqual(baseResult.perVisit);
    expect(selectedResult.perHour).toEqual(baseResult.perHour);
    expect(selectedResult.services?.importantButUnused.map((item) => item.id)).toEqual(['classes']);
    expect(selectedResult.continuation?.map((item) => item.id)).toEqual(['nearby', 'opening-hours']);
  });
});
