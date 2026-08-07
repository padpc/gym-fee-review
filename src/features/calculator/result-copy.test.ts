import { describe, expect, it } from 'vitest';
import { createAnnualComparisonText, createThreeMonthComparisonText } from './result-copy';

describe('GFR-RES-003 中立な比較文', () => {
  it.each([
    ['current', 6_000, '入力した条件の料金だけなら、現在プランの方が年間6,000円低い試算です。'],
    ['candidate', 6_000, '入力した条件の料金だけなら、候補の方が年間6,000円低い試算です。'],
    ['equal', 0, '入力した条件では、年間予測の料金は同額です。'],
  ] as const)('%s の年間文を返す', (lowerSide, differenceYen, expected) => {
    expect(createAnnualComparisonText({ lowerSide, differenceYen, differenceUnits: differenceYen * 12 })).toBe(
      expected,
    );
  });

  it('3か月差を中立に示す', () => {
    expect(
      createThreeMonthComparisonText({
        lowerSide: 'candidate',
        differenceYen: 1_500,
        differenceUnits: 18_000,
      }),
    ).toBe('直近3か月では、候補の方が1,500円低い試算です。');
  });

  it('禁止する断定語を含めない', () => {
    const text = createAnnualComparisonText({
      lowerSide: 'candidate',
      differenceYen: 6_000,
      differenceUnits: 72_000,
    });
    for (const word of ['損', 'お得', '退会すべき', '絶対', '必ず']) {
      expect(text).not.toContain(word);
    }
  });
});
