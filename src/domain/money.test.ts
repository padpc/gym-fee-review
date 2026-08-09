import { describe, expect, it } from 'vitest';
import {
  perHourRoundedYen,
  perVisitRoundedYen,
  roundRatioHalfUp,
  unitsToRoundedYen,
  yenToUnits,
} from './money';

describe('GFR-CALC-040 金額単位と丸め', () => {
  it('1円を12個の内部単位で保持する', () => {
    expect(yenToUnits(1)).toBe(12);
    expect(yenToUnits(100_000)).toBe(1_200_000);
  });

  it('表示時だけ正の四捨五入を行う', () => {
    expect(unitsToRoundedYen(1)).toBe(0);
    expect(unitsToRoundedYen(6)).toBe(1);
    expect(unitsToRoundedYen(17)).toBe(1);
    expect(unitsToRoundedYen(18)).toBe(2);
    expect(roundRatioHalfUp(5, 2)).toBe(3);
  });

  it('1回あたり費用を分母込みで正確に丸める', () => {
    expect(perVisitRoundedYen(yenToUnits(24_000), 15)).toBe(1_600);
    expect(perVisitRoundedYen(yenToUnits(8_000), 0)).toBeNull();
  });

  it('1時間あたり費用を分単位から正確に丸める', () => {
    expect(perHourRoundedYen(yenToUnits(8_000), 360)).toBe(1_333);
    expect(perHourRoundedYen(yenToUnits(8_000), 6)).toBe(80_000);
    expect(perHourRoundedYen(yenToUnits(8_000), 0)).toBeNull();
  });
});
