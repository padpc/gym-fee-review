import { describe, expect, it } from 'vitest';
import {
  assessPrice,
  assessPurpose,
  buildAssessmentResult,
  buildPrimaryRecommendation,
  calculateAlternativeMonthlyCost,
  calculateMonthlyDuration,
  calculateMonthlyEquivalent,
  calculatePerHourResult,
  calculatePerVisitResult,
  type KnownAlternative,
  type PlanAchievement,
  type PriceStatus,
  type ValidatedAssessmentInput,
} from './assessment';

const fees = { monthlyFeeYen: 8_000, monthlyFixedFeeYen: 500, annualFeeYen: 1_200 };
const equivalent = {
  equipment: 'meets' as const,
  hours: 'meets' as const,
  location: 'not-required' as const,
};

function monthlyAlternative(monthlyFeeYen: number): KnownAlternative {
  return {
    availability: 'known',
    name: '比較プラン',
    pricing: { kind: 'monthly', monthlyFeeYen },
    monthlyFixedFeeYen: 0,
    annualFeeYen: 0,
    requiredServiceMonthlyYen: 0,
    equivalence: equivalent,
  };
}

function perVisitAlternative(perVisitFeeYen: number): KnownAlternative {
  return {
    availability: 'known',
    name: '都度利用',
    pricing: { kind: 'per-visit', perVisitFeeYen },
    monthlyFixedFeeYen: 0,
    annualFeeYen: 0,
    requiredServiceMonthlyYen: 0,
    equivalence: equivalent,
  };
}

describe('GFR-G1R3 実質月額・回数・時間', () => {
  it('年会費を先に丸めず、1/12円単位で実質月額へ合算する', () => {
    expect(calculateMonthlyEquivalent(fees)).toEqual({ units: 103_200, roundedYen: 8_600 });
    expect(calculateMonthlyEquivalent({
      monthlyFeeYen: 0,
      monthlyFixedFeeYen: 0,
      annualFeeYen: 1,
    })).toEqual({ units: 1, roundedYen: 0 });
  });

  it('正確な回数と0回の1回単価を返す', () => {
    expect(calculatePerVisitResult(103_200, { kind: 'exact', visits: 4 })).toEqual({
      kind: 'exact',
      visits: 4,
      yenPerVisit: 2_150,
      unusedPaymentYen: 8_600,
    });
    expect(calculatePerVisitResult(103_200, { kind: 'exact', visits: 0 })).toEqual({
      kind: 'exact',
      visits: 0,
      yenPerVisit: null,
      unusedPaymentYen: 8_600,
    });
  });

  it('回数範囲を中央値へ変換せず、両端と片側境界を保持する', () => {
    expect(calculatePerVisitResult(103_200, {
      kind: 'bounded',
      bandId: 'weekly-1',
      min: 4,
      max: 6,
    })).toEqual({
      kind: 'bounded',
      bandId: 'weekly-1',
      minVisits: 4,
      maxVisits: 6,
      minYenPerVisit: 1_433,
      maxYenPerVisit: 2_150,
    });
    expect(calculatePerVisitResult(103_200, {
      kind: 'at-least',
      bandId: 'monthly-21-plus',
      min: 21,
    })).toEqual({
      kind: 'at-least',
      bandId: 'monthly-21-plus',
      minVisits: 21,
      maxYenPerVisit: 410,
    });
    expect(calculatePerVisitResult(103_200, { kind: 'unknown' })).toEqual({ kind: 'unknown' });
  });

  it('月合計時間は0.1時間を6分として扱い、回数に依存しない', () => {
    const duration = calculateMonthlyDuration(
      { kind: 'unknown' },
      { kind: 'total-hours', totalHours: 9.5 },
    );
    expect(duration).toEqual({ kind: 'exact', minutes: 570 });
    expect(calculatePerHourResult(103_200, duration)).toEqual({
      kind: 'exact',
      minutes: 570,
      yenPerHour: 905,
    });
  });

  it('平均時間と回数範囲から月時間・1時間単価の範囲を出す', () => {
    const boundedDuration = calculateMonthlyDuration(
      { kind: 'bounded', bandId: 'weekly-1', min: 4, max: 6 },
      { kind: 'average-minutes', averageMinutes: 60 },
    );
    expect(boundedDuration).toEqual({ kind: 'bounded', minMinutes: 240, maxMinutes: 360 });
    expect(calculatePerHourResult(103_200, boundedDuration)).toEqual({
      kind: 'bounded',
      minMinutes: 240,
      maxMinutes: 360,
      minYenPerHour: 1_433,
      maxYenPerHour: 2_150,
    });

    const atLeastDuration = calculateMonthlyDuration(
      { kind: 'at-least', bandId: 'monthly-21-plus', min: 21 },
      { kind: 'average-minutes', averageMinutes: 60 },
    );
    expect(calculatePerHourResult(103_200, atLeastDuration)).toEqual({
      kind: 'at-least',
      minMinutes: 1_260,
      maxYenPerHour: 410,
    });
  });

  it('回数不明×平均時間では月時間を推測せず、0回の時間単価も算出しない', () => {
    expect(calculateMonthlyDuration(
      { kind: 'unknown' },
      { kind: 'average-minutes', averageMinutes: 60 },
    )).toEqual({ kind: 'unknown' });
    const zero = calculateMonthlyDuration(
      { kind: 'exact', visits: 0 },
      { kind: 'average-minutes', averageMinutes: 60 },
    );
    expect(calculatePerHourResult(103_200, zero)).toEqual({
      kind: 'exact',
      minutes: 0,
      yenPerHour: null,
    });
  });
});

describe('GFR-G1R3 目的の利用計画達成率', () => {
  it('目的を果たせた回数を予定回数と比較し、目的実現1回単価も出す', () => {
    expect(assessPurpose(103_200, {
      purpose: 'strength',
      planned: { kind: 'exact', count: 8 },
      achieved: { kind: 'exact', count: 6 },
      evidence: 'improved',
    })).toMatchObject({
      purpose: 'strength',
      planAchievement: {
        kind: 'known',
        plannedCount: 8,
        achievedCount: 6,
        percent: 75,
        isAtLeastPlan: false,
        remainingCount: 2,
      },
      yenPerAchievedVisit: 1_433,
      achievedCostStatus: 'known',
    });
  });

  it('100%超を切り捨てず、0回を料金単価へ変換しない', () => {
    const over = assessPurpose(103_200, {
      purpose: 'endurance',
      planned: { kind: 'exact', count: 6 },
      achieved: { kind: 'exact', count: 8 },
      evidence: 'improved',
    });
    expect(over.planAchievement).toMatchObject({ percent: 133.3, isAtLeastPlan: true, remainingCount: 0 });

    const zero = assessPurpose(103_200, {
      purpose: 'stress',
      planned: { kind: 'exact', count: 4 },
      achieved: { kind: 'exact', count: 0 },
      evidence: 'unchanged',
    });
    expect(zero).toMatchObject({
      planAchievement: { kind: 'known', percent: 0, remainingCount: 4 },
      yenPerAchievedVisit: null,
      achievedCostStatus: 'zero-achieved',
    });
  });

  it('予定または実績不明を0へ置換せず、目的証拠を採点に使わない', () => {
    const unknown = assessPurpose(103_200, {
      purpose: 'health',
      planned: { kind: 'unknown' },
      achieved: { kind: 'exact', count: 4 },
      evidence: 'worse',
    });
    expect(unknown).toMatchObject({
      planAchievement: { kind: 'unknown', reason: 'planned-unknown' },
      yenPerAchievedVisit: 2_150,
      achievedCostStatus: 'known',
    });
  });
});

describe('GFR-G1R3 実在代替・料金差・同額条件', () => {
  it('月額代替は回数不明でも固定費を含む月額相当を計算する', () => {
    const alternative = monthlyAlternative(7_500);
    alternative.monthlyFixedFeeYen = 300;
    alternative.annualFeeYen = 1_200;
    alternative.requiredServiceMonthlyYen = 200;
    expect(calculateAlternativeMonthlyCost(alternative, { kind: 'unknown' })).toEqual({
      kind: 'exact',
      units: 97_200,
      roundedYen: 8_100,
    });
    expect(assessPrice(fees, { kind: 'unknown' }, alternative)).toMatchObject({
      status: 'alternative-lower',
      alternativeValueRatio: { kind: 'exact', percent: 94.2 },
      difference: { kind: 'exact', roundedYen: -500, annualYen: -6_000 },
    });
  });

  it('純都度代替を実績回数で計算し、Q・月差・年差・同額回数を返す', () => {
    const result = assessPrice(fees, { kind: 'exact', visits: 6 }, perVisitAlternative(1_800));
    expect(result).toMatchObject({
      status: 'current-lower',
      alternativeMonthly: { kind: 'exact', roundedYen: 10_800 },
      alternativeValueRatio: { kind: 'exact', percent: 125.6 },
      difference: { kind: 'exact', roundedYen: 2_200, annualYen: 26_400 },
      samePricePerVisit: { kind: 'exact', yenPerVisit: 1_433 },
      purePerVisitBreakEven: {
        firstVisitCurrentNoMoreExpensive: 5,
        firstVisitCurrentStrictlyCheaper: 5,
      },
    });
    expect(result.purePerVisitBreakEven?.equalityVisits).toBeCloseTo(4.777777, 5);
  });

  it('回数範囲の代替費用が現在額をまたぐ場合は方向を断定しない', () => {
    const result = assessPrice(
      fees,
      { kind: 'bounded', bandId: 'weekly-1', min: 4, max: 6 },
      perVisitAlternative(1_800),
    );
    expect(result).toMatchObject({
      status: 'depends-on-visits',
      alternativeMonthly: { kind: 'bounded', minRoundedYen: 7_200, maxRoundedYen: 10_800 },
      alternativeValueRatio: { kind: 'bounded', minPercent: 83.7, maxPercent: 125.6 },
      difference: {
        kind: 'bounded',
        minRoundedYen: -1_400,
        maxRoundedYen: 2_200,
        minAnnualYen: -16_800,
        maxAnnualYen: 26_400,
      },
    });
  });

  it('月21回以上は下限を保ち、回数不明の従量代替は材料不足にする', () => {
    expect(assessPrice(
      fees,
      { kind: 'at-least', bandId: 'monthly-21-plus', min: 21 },
      perVisitAlternative(500),
    )).toMatchObject({
      status: 'current-lower',
      alternativeMonthly: { kind: 'at-least', minRoundedYen: 10_500 },
    });
    expect(assessPrice(
      fees,
      { kind: 'unknown' },
      perVisitAlternative(1_800),
    )).toMatchObject({
      status: 'insufficient',
      insufficientReason: 'visits-unknown',
      alternativeMonthly: { kind: 'unknown' },
      alternativeValueRatio: { kind: 'unknown' },
      difference: { kind: 'unknown' },
    });
  });

  it('必要条件を満たさない、または不明な安い候補をお得と判定しない', () => {
    const notEquivalent = monthlyAlternative(5_000);
    notEquivalent.equivalence = { ...equivalent, equipment: 'does-not-meet' };
    expect(assessPrice(fees, { kind: 'exact', visits: 6 }, notEquivalent)).toMatchObject({
      status: 'not-equivalent',
      failedEquivalence: ['equipment'],
      alternativeValueRatio: null,
      difference: null,
    });

    const uncertain = monthlyAlternative(5_000);
    uncertain.equivalence = { ...equivalent, hours: 'unknown' };
    expect(assessPrice(fees, { kind: 'exact', visits: 6 }, uncertain)).toMatchObject({
      status: 'equivalence-unknown',
      uncertainEquivalence: ['hours'],
      alternativeValueRatio: null,
      difference: null,
    });
  });

  it('現在費用0円ではQを除算せず、丸め表示上同額でも内部差を保持する', () => {
    const freeCurrent = assessPrice(
      { monthlyFeeYen: 0, monthlyFixedFeeYen: 0, annualFeeYen: 0 },
      { kind: 'exact', visits: 2 },
      monthlyAlternative(1_000),
    );
    expect(freeCurrent).toMatchObject({ status: 'current-lower', alternativeValueRatio: null });

    const hiddenFraction = assessPrice(
      { monthlyFeeYen: 0, monthlyFixedFeeYen: 0, annualFeeYen: 1 },
      { kind: 'exact', visits: 1 },
      monthlyAlternative(0),
    );
    expect(hiddenFraction).toMatchObject({
      status: 'alternative-lower',
      difference: { kind: 'exact', units: -1, roundedYen: 0, annualYen: -1 },
      hasRoundedBoundaryDifference: true,
    });
  });

  it('表示Qが約100%へ丸まっても、丸め前金額で料金方向を判定する', () => {
    const result = assessPrice(
      { monthlyFeeYen: 100_000, monthlyFixedFeeYen: 0, annualFeeYen: 0 },
      { kind: 'exact', visits: 1 },
      monthlyAlternative(99_960),
    );
    expect(result).toMatchObject({
      status: 'alternative-lower',
      alternativeValueRatio: { kind: 'exact', percent: 100 },
      difference: { kind: 'exact', units: -480, roundedYen: -40, annualYen: -480 },
    });
  });

  it('回数範囲の端点が同額なら、全範囲で同額以下となる側を返す', () => {
    expect(assessPrice(
      { monthlyFeeYen: 8_000, monthlyFixedFeeYen: 0, annualFeeYen: 0 },
      { kind: 'bounded', bandId: 'weekly-1', min: 4, max: 6 },
      perVisitAlternative(2_000),
    ).status).toBe('current-lower');

    expect(assessPrice(
      { monthlyFeeYen: 9_000, monthlyFixedFeeYen: 0, annualFeeYen: 0 },
      { kind: 'bounded', bandId: 'weekly-1', min: 4, max: 6 },
      perVisitAlternative(1_500),
    ).status).toBe('alternative-lower');
  });

  it('代替不明では得・損を断定せず、実績から同額都度単価だけを返す', () => {
    expect(assessPrice(fees, { kind: 'exact', visits: 4 }, { availability: 'unknown' })).toMatchObject({
      status: 'insufficient',
      insufficientReason: 'alternative-unknown',
      alternativeMonthly: null,
      alternativeValueRatio: null,
      difference: null,
      samePricePerVisit: { kind: 'exact', yenPerVisit: 2_150 },
      purePerVisitBreakEven: null,
    });
  });
});

describe('GFR-G1R3 根拠付き主提案', () => {
  const achieved: PlanAchievement = {
    kind: 'known',
    plannedCount: 4,
    achievedCount: 4,
    percent: 100,
    isAtLeastPlan: true,
    remainingCount: 0,
  };
  const missed: PlanAchievement = {
    kind: 'known',
    plannedCount: 4,
    achievedCount: 2,
    percent: 50,
    isAtLeastPlan: false,
    remainingCount: 2,
  };

  it.each([
    ['current-lower', achieved, 'keep-current-candidate'],
    ['equal', achieved, 'keep-current-candidate'],
    ['current-lower', missed, 'review-barrier-and-recheck'],
    ['alternative-lower', achieved, 'compare-lower-plan'],
    ['alternative-lower', missed, 'compare-plan-and-usage'],
    ['depends-on-visits', achieved, 'check-official-plan'],
    ['not-equivalent', achieved, 'check-official-plan'],
    ['equivalence-unknown', achieved, 'check-official-plan'],
    ['insufficient', achieved, 'check-official-plan'],
  ] as const)('%sと計画状態から%sを返す', (priceStatus, plan, expected) => {
    expect(buildPrimaryRecommendation(
      priceStatus as PriceStatus,
      plan,
      { kind: 'exact', visits: 4 },
      { kind: 'exact', count: plan.achievedCount },
      'none',
      'improved',
    ).kind).toBe(expected);
  });

  it('利用計画が不明なら価格だけで結論を作らない', () => {
    expect(buildPrimaryRecommendation(
      'alternative-lower',
      { kind: 'unknown', reason: 'planned-unknown' },
      { kind: 'unknown' },
      { kind: 'exact', count: 3 },
      'unknown',
      'improved',
    ).kind).toBe('confirm-materials');
  });

  it('予定を達成しても良い変化を確認できなければ継続候補にしない', () => {
    expect(buildPrimaryRecommendation(
      'current-lower',
      achieved,
      { kind: 'exact', visits: 4 },
      { kind: 'exact', count: 4 },
      'enjoyment',
      'worse',
    )).toMatchObject({
      kind: 'review-barrier-and-recheck',
      nextStep: '運動内容・負荷・プログラムが目的に合っているか確認し、回数を増やす前に見直す。続けやすい運動やプログラムを1種類だけ試す',
    });
  });

  it('来館0回かつ目的実現0回では契約自体の確認候補を補足する', () => {
    expect(buildPrimaryRecommendation(
      'insufficient',
      missed,
      { kind: 'exact', visits: 0 },
      { kind: 'exact', count: 0 },
      'schedule',
      'unchanged',
    )).toMatchObject({
      kind: 'check-official-plan',
      barrier: 'schedule',
      nextStep: '確認したい変化を一つ決め、運動内容を見直して1か月後に再確認する。必要な設備・利用回数・時間帯・店舗範囲を満たす公式プランを1件確認する',
      supplementalContractReview: true,
    });
  });

  it('都度料金が既知で回数だけ不明なら、公式料金の再確認ではなく回数記録を勧める', () => {
    expect(buildPrimaryRecommendation(
      'insufficient',
      achieved,
      { kind: 'unknown' },
      { kind: 'exact', count: 4 },
      'none',
      'improved',
      'visits-unknown',
    ).nextStep).toBe('来館回数を1か月だけ記録し、入力済みの都度料金と再比較する');
  });

  it('回数範囲が料金境界をまたぐ場合も、候補探しでなく正確な回数記録を勧める', () => {
    expect(buildPrimaryRecommendation(
      'depends-on-visits',
      achieved,
      { kind: 'bounded', bandId: 'weekly-1', min: 4, max: 6 },
      { kind: 'exact', count: 4 },
      'none',
      'improved',
    )).toMatchObject({
      headline: '正確な来館回数を記録して料金差を再確認する',
      nextStep: '来館回数を1か月だけ記録し、入力済みの都度料金と再比較する',
    });
  });

  it('入力全体から料金・時間・目的・提案を組み立てる', () => {
    const input: ValidatedAssessmentInput = {
      fees,
      visits: { kind: 'exact', visits: 6 },
      time: { kind: 'average-minutes', averageMinutes: 90 },
      purpose: {
        purpose: 'strength',
        planned: { kind: 'exact', count: 8 },
        achieved: { kind: 'exact', count: 6 },
        evidence: 'improved',
      },
      barrier: 'schedule',
      alternative: perVisitAlternative(1_800),
    };
    expect(buildAssessmentResult(input)).toMatchObject({
      monthly: { roundedYen: 8_600 },
      duration: { kind: 'exact', minutes: 540 },
      perHour: { kind: 'exact', yenPerHour: 956 },
      purpose: { planAchievement: { kind: 'known', percent: 75 } },
      price: { status: 'current-lower' },
      recommendation: { kind: 'review-barrier-and-recheck' },
    });
  });
});
