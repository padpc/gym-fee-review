import { describe, expect, it } from 'vitest';
import {
  assessPrice,
  assessPurpose,
  buildAssessmentResult,
  calculateActivityRate,
  calculateAlternativeMonthlyCost,
  calculateCompletionRate,
  calculatePerVisitResult,
  getActivityAlternativeRequirement,
  getActivityCompletionExample,
  getActivityQualityQuestion,
  getPurposeRecheckStep,
  requiresBarrier,
  type KnownAlternative,
  type ValidatedAssessmentInput,
} from './assessment';

const fees = { monthlyFeeYen: 8_000, monthlyFixedFeeYen: 0, annualFeeYen: 0 };

function alternative(
  pricing: KnownAlternative['pricing'],
  services: KnownAlternative['equivalence']['services'] = 'meets',
): KnownAlternative {
  return {
    availability: 'known',
    name: '比較プラン',
    pricing,
    monthlyFixedFeeYen: 0,
    annualFeeYen: 0,
    requiredServiceMonthlyYen: 0,
    equivalence: { services, hours: 'meets', location: 'not-required' },
  };
}

function input(overrides: Partial<ValidatedAssessmentInput> = {}): ValidatedAssessmentInput {
  return {
    fees,
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
    ...overrides,
  };
}

describe('GFR-G1R4 C・V・S・F', () => {
  it('S÷Vを正確値・V範囲・V不明のまま返す', () => {
    expect(calculateActivityRate(
      { kind: 'exact', count: 6 },
      { kind: 'exact', visits: 8 },
    )).toEqual({ kind: 'exact', numerator: 6, denominator: 8, percent: 75 });

    expect(calculateActivityRate(
      { kind: 'exact', count: 4 },
      { kind: 'bounded', bandId: 'weekly-1', min: 4, max: 6 },
    )).toEqual({
      kind: 'bounded',
      numerator: 4,
      minDenominator: 4,
      maxDenominator: 6,
      minPercent: 66.7,
      maxPercent: 100,
    });

    expect(calculateActivityRate(
      { kind: 'exact', count: 4 },
      { kind: 'unknown' },
    )).toEqual({ kind: 'unknown', reason: 'visits-unknown' });
  });

  it('0を含むV範囲とS=0を除算しない', () => {
    expect(calculateActivityRate(
      { kind: 'exact', count: 0 },
      { kind: 'bounded', bandId: 'monthly-1-3', min: 0, max: 3 },
    )).toEqual({ kind: 'zero-denominator', numerator: 0 });
  });

  it('F÷SとC÷S・C÷Fを分け、F<Sの完了時単価を返す', () => {
    const result = assessPurpose(
      96_000,
      { kind: 'exact', visits: 8 },
      {
        purpose: 'strength',
        activity: 'strength-training',
        performed: { kind: 'exact', count: 7 },
        completed: { kind: 'exact', count: 5 },
        contentFit: 'fits',
        evidence: 'improved',
      },
    );
    expect(result.activityRate).toMatchObject({ kind: 'exact', percent: 87.5 });
    expect(result.completionRate).toMatchObject({ kind: 'exact', percent: 71.4 });
    expect(result.yenPerPerformed).toBe(1_143);
    expect(result.yenPerCompleted).toBe(1_600);
    expect(result.completionOpportunity).toEqual({
      kind: 'available',
      performedCount: 7,
      completedCount: 5,
      incompleteCount: 2,
      currentYenPerCompleted: 1_600,
      ifAllPerformedCompletedYen: 1_143,
    });
  });

  it('0回を除算せず、不明を0へ変換しない', () => {
    expect(calculateCompletionRate(
      { kind: 'exact', count: 0 },
      { kind: 'exact', count: 0 },
    )).toEqual({ kind: 'zero-denominator', numerator: 0 });

    const result = assessPurpose(
      96_000,
      { kind: 'unknown' },
      {
        purpose: 'health',
        activity: 'cardio',
        performed: { kind: 'unknown' },
        completed: { kind: 'unknown' },
        contentFit: 'unknown',
        evidence: 'unknown',
      },
    );
    expect(result.performedCostStatus).toBe('unknown');
    expect(result.completedCostStatus).toBe('unknown');
    expect(result.completionOpportunity).toEqual({ kind: 'unknown' });
  });

  it('ドメイン境界でもF>SとS>Vを拒否する', () => {
    expect(() => assessPurpose(
      96_000,
      { kind: 'exact', visits: 4 },
      {
        purpose: 'strength',
        activity: 'strength-training',
        performed: { kind: 'exact', count: 5 },
        completed: { kind: 'exact', count: 4 },
        contentFit: 'fits',
        evidence: 'improved',
      },
    )).toThrow('performed count');

    expect(() => calculateCompletionRate(
      { kind: 'exact', count: 5 },
      { kind: 'exact', count: 4 },
    )).toThrow('completed count');
  });
});
describe('GFR-G1R4 目的・活動・公式代替', () => {
  it('目的は再確認行動を、主活動は完了・質・代替条件を変える', () => {
    expect(getPurposeRecheckStep('strength')).toContain('重量・回数・フォーム');
    expect(getPurposeRecheckStep('endurance')).toContain('時間・距離・速度');
    expect(getPurposeRecheckStep('stress')).toContain('利用前後の気分');
    expect(getActivityCompletionExample('strength-training')).toContain('種目とセット');
    expect(getActivityCompletionExample('studio-class')).toContain('クラス');
    expect(getActivityQualityQuestion('pool')).toContain('水中運動');
    expect(getActivityAlternativeRequirement('coached-training')).toContain('指導');
  });

  it('都度型公式代替は来館Vでなく目的活動Sへ掛ける', () => {
    const plan = alternative({ kind: 'per-visit', perVisitFeeYen: 1_000 });
    expect(calculateAlternativeMonthlyCost(
      plan,
      { kind: 'exact', count: 6 },
    )).toEqual({ kind: 'exact', units: 72_000, roundedYen: 6_000 });
    expect(assessPrice(fees, { kind: 'exact', count: 6 }, plan)).toMatchObject({
      status: 'alternative-lower',
      alternativeMonthly: { kind: 'exact', roundedYen: 6_000 },
      samePricePerActivity: { kind: 'exact', activities: 6, yenPerActivity: 1_333 },
    });
  });

  it('実利用サービス条件を満たさない候補を低料金候補にしない', () => {
    expect(assessPrice(
      fees,
      { kind: 'exact', count: 6 },
      alternative({ kind: 'monthly', monthlyFeeYen: 5_000 }, 'does-not-meet'),
    )).toMatchObject({
      status: 'not-equivalent',
      failedEquivalence: ['services'],
      alternativeValueRatio: null,
      difference: null,
    });
  });

  it.each([
    ['hours', 'does-not-meet', 'not-equivalent'],
    ['hours', 'unknown', 'equivalence-unknown'],
    ['location', 'does-not-meet', 'not-equivalent'],
    ['location', 'unknown', 'equivalence-unknown'],
  ] as const)(
    '低料金の公式代替でも%s=%sなら料金候補から除外する',
    (dimension, answer, expectedStatus) => {
      const plan = alternative({ kind: 'monthly', monthlyFeeYen: 5_000 });
      plan.equivalence[dimension] = answer;
      const result = assessPrice(fees, { kind: 'exact', count: 6 }, plan);
      expect(result.status).toBe(expectedStatus);
      expect(result.status).not.toBe('alternative-lower');
      expect(result.difference).toBeNull();
    },
  );

  it('実利用サービスを代替比較の必要条件へ変換する', () => {
    expect(assessPrice(
      fees,
      { kind: 'exact', count: 6 },
      alternative({ kind: 'monthly', monthlyFeeYen: 5_000 }),
      ['pool', 'recovery'],
    ).requiredAlternativeServiceLabels).toEqual(['プール', '温浴・サウナ']);
    expect(assessPrice(
      fees,
      { kind: 'exact', count: 6 },
      alternative({ kind: 'monthly', monthlyFeeYen: 5_000 }),
      ['none'],
    ).requiredAlternativeServiceLabels).toEqual([]);
  });

  it('代替なしでは得損を断定せずC÷Sだけを返す', () => {
    expect(assessPrice(
      fees,
      { kind: 'exact', count: 4 },
      { availability: 'unknown' },
    )).toMatchObject({
      status: 'insufficient',
      insufficientReason: 'alternative-unknown',
      samePricePerActivity: { kind: 'exact', activities: 4, yenPerActivity: 2_000 },
    });
  });
});

describe('GFR-G1R4 決定規則', () => {
  it('完了・良い変化・再選択がそろえば継続候補にする', () => {
    expect(buildAssessmentResult(input()).recommendation.kind).toBe('keep-current-candidate');
  });

  it('変化なしでは目的別の再確認行動を返す', () => {
    const result = buildAssessmentResult(input({
      purpose: {
        purpose: 'endurance',
        activity: 'cardio',
        performed: { kind: 'exact', count: 7 },
        completed: { kind: 'exact', count: 7 },
        contentFit: 'fits',
        evidence: 'unchanged',
      },
      barrier: 'none',
    }));
    expect(result.recommendation.kind).toBe('review-training');
    expect(result.recommendation.nextStep).toContain('時間・距離・速度');
  });

  it('F<Sまたは質不一致では主活動別の行動と阻害要因を使う', () => {
    const result = buildAssessmentResult(input({
      purpose: {
        purpose: 'health',
        activity: 'studio-class',
        performed: { kind: 'exact', count: 7 },
        completed: { kind: 'exact', count: 5 },
        contentFit: 'fits',
        evidence: 'improved',
      },
      barrier: 'crowding',
    }));
    expect(result.recommendation.kind).toBe('review-training');
    expect(result.recommendation.headline).toBe('目的活動は行えているが、内容を見直す');
    expect(result.recommendation.nextStep).toContain('クラスの内容・難易度・時間帯');
    expect(result.recommendation.nextStep).toContain('混雑');
  });

  it('悪化時は会費価値を断定せず、料金判断より先の確認を案内する', () => {
    const result = buildAssessmentResult(input({
      purpose: {
        purpose: 'strength',
        activity: 'strength-training',
        performed: { kind: 'exact', count: 7 },
        completed: { kind: 'exact', count: 7 },
        contentFit: 'fits',
        evidence: 'worse',
      },
      barrier: 'equipment',
    }));
    expect(result.recommendation.headline).toBe('料金判断より先に、目的に合う内容か確認する');
  });

  it('再選択しない回答は契約確認へ変える', () => {
    expect(buildAssessmentResult(input({
      continuation: 'not-choose',
      barrier: 'travel',
    })).recommendation.kind).toBe('review-contract');
  });

  it('S=0と阻害要因は通い方の一行動へ変える', () => {
    const result = buildAssessmentResult(input({
      purpose: {
        purpose: 'strength',
        activity: 'strength-training',
        performed: { kind: 'exact', count: 0 },
        completed: { kind: 'exact', count: 0 },
        contentFit: 'fits',
        evidence: 'improved',
      },
      barrier: 'schedule',
    }));
    expect(result.recommendation.kind).toBe('review-access');
    expect(result.recommendation.nextStep).toContain('利用枠を一つ');
  });

  it('安全懸念は逆変化・料金・満足より先に上書きする', () => {
    const result = buildAssessmentResult(input({
      safety: 'concern',
      continuation: 'not-choose',
      purpose: {
        purpose: 'strength',
        activity: 'strength-training',
        performed: { kind: 'exact', count: 7 },
        completed: { kind: 'exact', count: 2 },
        contentFit: 'does-not-fit',
        evidence: 'worse',
      },
      alternative: alternative({ kind: 'monthly', monthlyFeeYen: 3_000 }),
    }));
    expect(result.recommendation).toMatchObject({ kind: 'safety-first', barrier: null });
  });

  it('価値がそろい同等な公式代替だけが安ければ料金比較へ変える', () => {
    expect(buildAssessmentResult(input({
      alternative: alternative({ kind: 'monthly', monthlyFeeYen: 6_000 }),
    })).recommendation.kind).toBe('compare-lower-plan');
  });

  it('阻害要因は問題時だけ要求し、安全懸念時は聞かない', () => {
    expect(requiresBarrier({
      performed: { kind: 'exact', count: 7 },
      completed: { kind: 'exact', count: 7 },
      contentFit: 'fits',
      evidence: 'improved',
      continuation: 'choose',
      safety: 'no-concern',
    })).toBe(false);
    expect(requiresBarrier({
      performed: { kind: 'exact', count: 7 },
      completed: { kind: 'exact', count: 5 },
      contentFit: 'fits',
      evidence: 'improved',
      continuation: 'choose',
      safety: 'no-concern',
    })).toBe(true);
    expect(requiresBarrier({
      performed: { kind: 'exact', count: 0 },
      completed: { kind: 'exact', count: 0 },
      contentFit: 'does-not-fit',
      evidence: 'worse',
      continuation: 'not-choose',
      safety: 'concern',
    })).toBe(false);
  });
});

describe('GFR-G1R4 全質問の使用規則', () => {
  it('料金・来館・時間・目的・活動・S・Fが対応する計算または条件を変える', () => {
    const baseline = buildAssessmentResult(input());
    const feeChanged = buildAssessmentResult(input({
      fees: { monthlyFeeYen: 8_000, monthlyFixedFeeYen: 500, annualFeeYen: 1_200 },
    }));
    expect(feeChanged.monthly.roundedYen).not.toBe(baseline.monthly.roundedYen);

    const visitsChanged = buildAssessmentResult(input({
      visits: { kind: 'exact', visits: 10 },
    }));
    expect(visitsChanged.perVisit).not.toEqual(baseline.perVisit);
    expect(visitsChanged.purpose.activityRate).not.toEqual(baseline.purpose.activityRate);

    const timeAdded = buildAssessmentResult(input({
      time: { kind: 'total-hours', totalHours: 10 },
    }));
    expect(timeAdded.perHour.kind).toBe('exact');
    expect(baseline.perHour.kind).toBe('unknown');

    const purposeChanged = buildAssessmentResult(input({
      purpose: { ...input().purpose, purpose: 'endurance', evidence: 'unchanged' },
      barrier: 'none',
    }));
    expect(purposeChanged.purpose.changeExamples).not.toBe(baseline.purpose.changeExamples);
    expect(purposeChanged.recommendation.nextStep).toContain('時間・距離・速度');

    const activityChanged = buildAssessmentResult(input({
      purpose: { ...input().purpose, activity: 'pool' },
    }));
    expect(activityChanged.purpose.completionExample).not.toBe(baseline.purpose.completionExample);
    expect(activityChanged.purpose.qualityQuestion).not.toBe(baseline.purpose.qualityQuestion);
    expect(activityChanged.purpose.alternativeRequirement).not.toBe(
      baseline.purpose.alternativeRequirement,
    );

    const performedChanged = buildAssessmentResult(input({
      purpose: {
        ...input().purpose,
        performed: { kind: 'exact', count: 6 },
        completed: { kind: 'exact', count: 6 },
      },
    }));
    expect(performedChanged.purpose.yenPerPerformed).not.toBe(baseline.purpose.yenPerPerformed);
    expect(performedChanged.purpose.activityRate).not.toEqual(baseline.purpose.activityRate);

    const completedChanged = buildAssessmentResult(input({
      purpose: { ...input().purpose, completed: { kind: 'exact', count: 5 } },
      barrier: 'none',
    }));
    expect(completedChanged.purpose.yenPerCompleted).not.toBe(baseline.purpose.yenPerCompleted);
    expect(completedChanged.recommendation.kind).toBe('review-training');
  });

  it('主目的と主活動だけの変更では料金数値を変えず、質問と行動だけを変える', () => {
    const baseline = buildAssessmentResult(input({
      purpose: { ...input().purpose, evidence: 'unchanged' },
      barrier: 'none',
    }));
    const changed = buildAssessmentResult(input({
      purpose: {
        ...input().purpose,
        purpose: 'endurance',
        activity: 'cardio',
        evidence: 'unchanged',
      },
      barrier: 'none',
    }));

    expect(changed.monthly).toEqual(baseline.monthly);
    expect(changed.perVisit).toEqual(baseline.perVisit);
    expect(changed.purpose.yenPerPerformed).toBe(baseline.purpose.yenPerPerformed);
    expect(changed.purpose.yenPerCompleted).toBe(baseline.purpose.yenPerCompleted);
    expect(changed.purpose.activityRate).toEqual(baseline.purpose.activityRate);
    expect(changed.purpose.completionRate).toEqual(baseline.purpose.completionRate);
    expect(changed.purpose.changeExamples).not.toBe(baseline.purpose.changeExamples);
    expect(changed.purpose.qualityQuestion).not.toBe(baseline.purpose.qualityQuestion);
    expect(changed.recommendation.nextStep).not.toBe(baseline.recommendation.nextStep);
  });

  it('実運動時間だけの変更では1時間単価だけを追加し、質・判定を変えない', () => {
    const withoutTime = buildAssessmentResult(input());
    const withTime = buildAssessmentResult(input({
      time: { kind: 'total-hours', totalHours: 10 },
    }));

    expect(withoutTime.perHour).toEqual({ kind: 'unknown' });
    expect(withTime.perHour).toEqual({ kind: 'exact', minutes: 600, yenPerHour: 800 });
    expect(withTime.monthly).toEqual(withoutTime.monthly);
    expect(withTime.perVisit).toEqual(withoutTime.perVisit);
    expect(withTime.purpose).toEqual(withoutTime.purpose);
    expect(withTime.price).toEqual(withoutTime.price);
    expect(withTime.recommendation).toEqual(withoutTime.recommendation);
  });

  it('V範囲のC÷Vは両端だけをboundedで返し、中央値を作らない', () => {
    expect(calculatePerVisitResult(
      96_000,
      { kind: 'bounded', bandId: 'weekly-1', min: 4, max: 6 },
    )).toEqual({
      kind: 'bounded',
      bandId: 'weekly-1',
      minVisits: 4,
      maxVisits: 6,
      minYenPerVisit: 1_333,
      maxYenPerVisit: 2_000,
    });
  });

  it('F=0<SでもC÷Fを除算せず、同じS回を完了したC÷Sを返す', () => {
    const result = assessPurpose(
      96_000,
      { kind: 'exact', visits: 4 },
      {
        purpose: 'strength',
        activity: 'strength-training',
        performed: { kind: 'exact', count: 4 },
        completed: { kind: 'exact', count: 0 },
        contentFit: 'fits',
        evidence: 'improved',
      },
    );
    expect(result.yenPerCompleted).toBeNull();
    expect(result.completedCostStatus).toBe('zero-count');
    expect(result.completionRate).toEqual({
      kind: 'exact',
      numerator: 0,
      denominator: 4,
      percent: 0,
    });
    expect(result.completionOpportunity).toEqual({
      kind: 'available',
      performedCount: 4,
      completedCount: 0,
      incompleteCount: 4,
      currentYenPerCompleted: null,
      ifAllPerformedCompletedYen: 2_000,
    });
    expect(Number.isFinite(result.completionOpportunity.kind === 'available'
      ? result.completionOpportunity.ifAllPerformedCompletedYen
      : Number.NaN)).toBe(true);
  });

  it('質・変化・実利用・再選択・安全・阻害要因・公式代替が判断を変える', () => {
    const fitChanged = buildAssessmentResult(input({
      purpose: { ...input().purpose, contentFit: 'does-not-fit' },
      barrier: 'equipment',
    }));
    expect(fitChanged.recommendation.kind).toBe('review-training');

    const evidenceChanged = buildAssessmentResult(input({
      purpose: { ...input().purpose, evidence: 'unknown' },
      barrier: 'unknown',
    }));
    expect(evidenceChanged.recommendation.kind).toBe('confirm-materials');

    const servicesChanged = buildAssessmentResult(input({
      usedServices: ['pool', 'recovery'],
    }));
    expect(servicesChanged.price.requiredAlternativeServiceLabels).toEqual([
      'プール',
      '温浴・サウナ',
    ]);

    const continuationChanged = buildAssessmentResult(input({
      continuation: 'not-choose',
      barrier: 'travel',
    }));
    expect(continuationChanged.recommendation.kind).toBe('review-contract');

    const safetyChanged = buildAssessmentResult(input({ safety: 'concern' }));
    expect(safetyChanged.recommendation.kind).toBe('safety-first');

    const commonProblem = {
      purpose: { ...input().purpose, completed: { kind: 'exact' as const, count: 5 } },
    };
    const schedule = buildAssessmentResult(input({ ...commonProblem, barrier: 'schedule' }));
    const crowding = buildAssessmentResult(input({ ...commonProblem, barrier: 'crowding' }));
    expect(schedule.recommendation.nextStep).not.toBe(crowding.recommendation.nextStep);

    const alternativeChanged = buildAssessmentResult(input({
      alternative: alternative({ kind: 'monthly', monthlyFeeYen: 6_000 }),
    }));
    expect(alternativeChanged.price.status).toBe('alternative-lower');
    expect(alternativeChanged.recommendation.kind).toBe('compare-lower-plan');
  });
});
