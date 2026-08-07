import { describe, expect, it } from 'vitest';
import { calculateG1Result } from './comparison';
import { unitsToRoundedYen } from './money';

describe('GFR-CALC-001/010/030/050/060/070 G1料金比較', () => {
  it('代表例の3か月・年間・料金境界を計算する', () => {
    const result = calculateG1Result({
      currentMonthlyFeeYen: 8_000,
      visits: [4, 5, 6],
      dropInFeeYen: 1_500,
    });

    expect(result.visitsTotal).toBe(15);
    expect(result.visitsAverage).toBe(5);
    expect(unitsToRoundedYen(result.current.threeMonthUnits)).toBe(24_000);
    expect(unitsToRoundedYen(result.current.monthlyAverageUnits)).toBe(8_000);
    expect(result.current.perVisitYen).toBe(1_600);
    expect(unitsToRoundedYen(result.candidate.threeMonthUnits)).toBe(22_500);
    expect(unitsToRoundedYen(result.candidate.monthlyAverageUnits)).toBe(7_500);
    expect(unitsToRoundedYen(result.current.annualUnits)).toBe(96_000);
    expect(unitsToRoundedYen(result.candidate.annualUnits)).toBe(90_000);
    expect(result.threeMonthComparison).toMatchObject({
      lowerSide: 'candidate',
      differenceYen: 1_500,
    });
    expect(result.annualComparison).toMatchObject({
      lowerSide: 'candidate',
      differenceYen: 6_000,
    });
    expect(result.rows).toHaveLength(21);
    expect(result.rows[5]).toMatchObject({ visits: 5, lowerSide: 'candidate' });
    expect(result.rows[6]).toMatchObject({ visits: 6, lowerSide: 'current' });
    expect(result.boundary.message).toBe('月6回から現在プランの料金が低くなります。');
    expect(result.boundary.boundaryVisits).toBe(6);
  });

  it('整数回で同額になる境界を示す', () => {
    const result = calculateG1Result({
      currentMonthlyFeeYen: 9_000,
      visits: [6, 6, 6],
      dropInFeeYen: 1_500,
    });
    expect(result.rows[6].lowerSide).toBe('equal');
    expect(result.boundary.message).toBe(
      '月6回で同額、月7回から現在プランの料金が低くなります。',
    );
    expect(result.boundary.boundaryVisits).toBe(6);
  });

  it('上限の月20回で初めて同額になる境界を示す', () => {
    const result = calculateG1Result({
      currentMonthlyFeeYen: 100_000,
      visits: [20, 20, 20],
      dropInFeeYen: 5_000,
    });
    expect(result.rows[19].lowerSide).toBe('candidate');
    expect(result.rows[20].lowerSide).toBe('equal');
    expect(result.boundary.message).toBe('月20回で同額です。');
    expect(result.boundary.boundaryVisits).toBe(20);
  });

  it('0～20回で候補が低いままの場合を示す', () => {
    const result = calculateG1Result({
      currentMonthlyFeeYen: 30_000,
      visits: [1, 1, 1],
      dropInFeeYen: 1_000,
    });
    expect(result.boundary.message).toBe('月0～20回では候補の料金が低いままです。');
    expect(result.boundary.boundaryVisits).toBeNull();
  });

  it('全範囲が同額の場合を示す', () => {
    const result = calculateG1Result({
      currentMonthlyFeeYen: 0,
      visits: [0, 0, 0],
      dropInFeeYen: 0,
    });
    expect(result.boundary.message).toBe('月0～20回では料金は同額です。');
  });

  it('全月0回でも比較を継続し、1回あたりだけ算出しない', () => {
    const result = calculateG1Result({
      currentMonthlyFeeYen: 8_000,
      visits: [0, 0, 0],
      dropInFeeYen: 1_500,
    });
    expect(result.current.perVisitYen).toBeNull();
    expect(unitsToRoundedYen(result.current.threeMonthUnits)).toBe(24_000);
    expect(result.annualComparison.lowerSide).toBe('candidate');
    expect(result.rows).toHaveLength(21);
  });
});
