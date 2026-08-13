import { describe, expect, it } from 'vitest';
import {
  buildAssessmentResult,
  calculateMonthlyDuration,
  calculateMonthlyEquivalent,
  calculatePerHourResult,
  calculatePerVisitResult,
  type ValidatedAssessmentInput,
  type ValueAssessmentInput,
} from './assessment';

function value(overrides: Partial<ValueAssessmentInput> = {}): ValueAssessmentInput {
  return {
    id: 'training',
    customLabel: '',
    frequency: 'often',
    fulfillment: 'met',
    payReason: 'yes',
    ...overrides,
  };
}

function input(overrides: Partial<ValidatedAssessmentInput> = {}): ValidatedAssessmentInput {
  return {
    fees: { monthlyFeeYen: 8_000, monthlyFixedFeeYen: 0, annualFeeYen: 0 },
    visits: { kind: 'exact', visits: 8 },
    time: { kind: 'unknown' },
    values: [value()],
    feeBurden: 'comfortable',
    continuation: 'choose',
    barrier: null,
    ...overrides,
  };
}

describe('R5 費用計算', () => {
  it('必須月額と年会費の月割りを1/12円単位で計算する', () => {
    expect(calculateMonthlyEquivalent({
      monthlyFeeYen: 8_000,
      monthlyFixedFeeYen: 500,
      annualFeeYen: 1_201,
    })).toEqual({ units: 103_201, roundedYen: 8_600 });
  });

  it('正確値・範囲・9回以上を中央値化せず返す', () => {
    expect(calculatePerVisitResult(96_000, { kind: 'exact', visits: 8 })).toEqual({
      kind: 'exact', visits: 8, yenPerVisit: 1_000, unusedPaymentYen: 0,
    });
    expect(calculatePerVisitResult(96_000, {
      kind: 'bounded', bandId: 'monthly-3-4', min: 3, max: 4,
    })).toEqual({
      kind: 'bounded', bandId: 'monthly-3-4', minVisits: 3, maxVisits: 4,
      minYenPerVisit: 2_000, maxYenPerVisit: 2_667,
    });
    expect(calculatePerVisitResult(96_000, {
      kind: 'at-least', bandId: 'monthly-9-plus', min: 9,
    })).toEqual({
      kind: 'at-least', bandId: 'monthly-9-plus', minVisits: 9, maxYenPerVisit: 889,
    });
  });

  it('回数不明では理由と1/2/4/8/12回シナリオを返す', () => {
    expect(calculatePerVisitResult(96_000, { kind: 'unknown' })).toEqual({
      kind: 'unknown',
      reason: 'visits-unknown',
      scenarios: [
        { visits: 1, yenPerVisit: 8_000 },
        { visits: 2, yenPerVisit: 4_000 },
        { visits: 4, yenPerVisit: 2_000 },
        { visits: 8, yenPerVisit: 1_000 },
        { visits: 12, yenPerVisit: 667 },
      ],
    });
  });

  it('館内利用時間の合計・平均と未算出理由を区別する', () => {
    expect(calculateMonthlyDuration(
      { kind: 'exact', visits: 8 },
      { kind: 'total-hours', totalHours: 10 },
    )).toEqual({ kind: 'exact', minutes: 600 });
    expect(calculateMonthlyDuration(
      { kind: 'bounded', bandId: 'monthly-3-4', min: 3, max: 4 },
      { kind: 'average-minutes', averageMinutes: 90 },
    )).toEqual({ kind: 'bounded', minMinutes: 270, maxMinutes: 360 });
    expect(calculateMonthlyDuration(
      { kind: 'unknown' },
      { kind: 'average-minutes', averageMinutes: 90 },
    )).toEqual({ kind: 'unknown', reason: 'average-needs-visits' });
    expect(calculateMonthlyDuration(
      { kind: 'exact', visits: 8 },
      { kind: 'unknown' },
    )).toEqual({ kind: 'unknown', reason: 'facility-time-not-entered' });
    expect(calculatePerHourResult(96_000, { kind: 'exact', minutes: 0 })).toEqual({
      kind: 'unknown', reason: 'zero-time',
    });
    expect(calculatePerHourResult(
      96_000,
      { kind: 'unknown', reason: 'average-needs-visits' },
      60,
    )).toEqual({
      kind: 'unknown',
      reason: 'average-needs-visits',
      scenarios: [
        { visits: 1, totalMinutes: 60, yenPerHour: 8_000 },
        { visits: 2, totalMinutes: 120, yenPerHour: 4_000 },
        { visits: 4, totalMinutes: 240, yenPerHour: 2_000 },
        { visits: 8, totalMinutes: 480, yenPerHour: 1_000 },
        { visits: 12, totalMinutes: 720, yenPerHour: 667 },
      ],
    });
  });

  it('館内利用時間だけの変更は時間単価だけを変える', () => {
    const baseline = buildAssessmentResult(input());
    const changed = buildAssessmentResult(input({
      time: { kind: 'total-hours', totalHours: 10 },
    }));
    expect(changed.perHour).toEqual({ kind: 'exact', minutes: 600, yenPerHour: 800 });
    expect(changed.monthly).toEqual(baseline.monthly);
    expect(changed.perVisit).toEqual(baseline.perVisit);
    expect(changed.valueSummary).toEqual(baseline.valueSummary);
    expect(changed.recommendation).toEqual({
      ...baseline.recommendation,
      nextStep: '次の1か月も同じ使い方を続け、月末に同じ条件で再確認する。',
    });
  });

  it('来館0回と各未算出理由を結果に構造化する', () => {
    const zero = buildAssessmentResult(input({
      visits: { kind: 'exact', visits: 0 },
    }));
    expect(zero.costUnavailableReasons).toEqual({
      perVisit: 'zero-visits', perHour: 'facility-time-not-entered',
    });
    const unknown = buildAssessmentResult(input({
      visits: { kind: 'unknown' },
      time: { kind: 'average-minutes', averageMinutes: 60 },
    }));
    expect(unknown.costUnavailableReasons).toEqual({
      perVisit: 'visits-unknown', perHour: 'average-needs-visits',
    });
    expect(unknown.perHour.kind === 'unknown' && unknown.perHour.scenarios).toHaveLength(5);
  });
});

describe('R5 透明な価値判定', () => {
  it('複数価値を独立して分類し、期待充足の件数を隠さない', () => {
    const result = buildAssessmentResult(input({
      values: [
        value(),
        value({ id: 'bath-sauna', frequency: 'several', fulfillment: 'partly', payReason: 'yes' }),
        value({ id: 'social', frequency: 'once', fulfillment: 'unknown', payReason: 'unsure' }),
        value({ id: 'pool', fulfillment: 'unmet', payReason: 'no' }),
      ],
    }));
    expect(result.valueSummary.assessedCount).toBe(4);
    expect(result.valueSummary.strongValues.map((item) => item.id)).toEqual(['training', 'bath-sauna']);
    expect(result.valueSummary.tentativeValues.map((item) => item.id)).toEqual(['social']);
    expect(result.valueSummary.nonPayingValues.map((item) => item.id)).toEqual(['pool']);
    expect(result.valueSummary.fulfillmentCounts).toEqual([
      { id: 'met', count: 1 },
      { id: 'partly', count: 1 },
      { id: 'unmet', count: 1 },
      { id: 'unknown', count: 1 },
    ]);
  });

  it('風呂・温泉・サウナだけでも継続理由になり、回数不明でも価値結論を返す', () => {
    const result = buildAssessmentResult(input({
      visits: { kind: 'unknown' },
      values: [value({ id: 'bath-sauna', frequency: 'unknown' })],
    }));
    expect(result.perVisit.kind).toBe('unknown');
    expect(result.recommendation.kind).toBe('keep-reason');
    expect(result.recommendation.reason).toContain('風呂・温泉・サウナ・休憩');
  });

  it('強い価値があっても期待未達・不明なら確認へ分岐する', () => {
    for (const fulfillment of ['unmet', 'unknown'] as const) {
      const result = buildAssessmentResult(input({ values: [value({ fulfillment })] }));
      expect(result.recommendation.kind).toBe('review-use');
      expect(result.recommendation.headline).toContain('期待を満たすか');
      expect(result.recommendation.nextStep).toContain('トレーニング設備');
    }
  });

  it('費用負担と継続意向を強い価値より優先して判定する', () => {
    const slight = buildAssessmentResult(input({
      feeBurden: 'slight-burden', barrier: 'price',
    }));
    expect(slight.recommendation.kind).toBe('keep-review-price');
    expect(slight.recommendation.nextStep).toContain('低料金プラン');

    const severe = buildAssessmentResult(input({
      feeBurden: 'review-needed', barrier: 'price',
    }));
    expect(severe.recommendation.kind).toBe('preserve-value-reduce-cost');

    const unsure = buildAssessmentResult(input({
      continuation: 'unsure', barrier: 'other',
    }));
    expect(unsure.recommendation.kind).toBe('review-use');

    const no = buildAssessmentResult(input({
      continuation: 'not-choose', barrier: 'travel',
    }));
    expect(no.recommendation.kind).toBe('review-contract');
    expect(no.recommendation.nextStep).toContain('移動時間');
  });

  it('利用価値なしと利用したが支払理由なしを区別する', () => {
    const none = buildAssessmentResult(input({
      values: [], continuation: 'unsure', barrier: 'temporary',
    }));
    expect(none.recommendation.kind).toBe('confirm-use-condition');
    expect(none.recommendation.reason).toContain('利用した価値項目はありません');

    const noPayReason = buildAssessmentResult(input({
      values: [value({ payReason: 'no' })], barrier: 'offering',
    }));
    expect(noPayReason.recommendation.kind).toBe('review-use');
    expect(noPayReason.recommendation.reason).toContain('利用した内容はあります');
  });

  it.each([
    { payReason: 'no' as const, barrier: 'offering' as const, onceText: '1回程度利用しましたが、会費を払う理由にはならない', oftenText: '繰り返し利用しましたが、会費を払う理由にはならない' },
    { payReason: 'unsure' as const, barrier: 'other' as const, onceText: '低頻度でも会費を払う理由になるか', oftenText: '繰り返し利用しても会費を払う理由が定まっていません' },
  ])('支払理由が$payReasonでも利用頻度を結論根拠へ使う', ({ payReason, barrier, onceText, oftenText }) => {
    const once = buildAssessmentResult(input({
      values: [value({ frequency: 'once', payReason })],
      barrier,
    }));
    const often = buildAssessmentResult(input({
      values: [value({ frequency: 'often', payReason })],
      barrier,
    }));
    expect(once.recommendation.reason).toContain(onceText);
    expect(often.recommendation.reason).toContain(oftenText);
    expect(once.recommendation.reason).not.toBe(often.recommendation.reason);
  });

  it.each(['no', 'unsure'] as const)('規則7でも支払理由$payReasonの利用頻度を結論根拠へ使う', (payReason) => {
    const once = buildAssessmentResult(input({
      values: [value({ frequency: 'once', payReason })],
      feeBurden: 'slight-burden',
      barrier: 'price',
    }));
    const often = buildAssessmentResult(input({
      values: [value({ frequency: 'often', payReason })],
      feeBurden: 'slight-burden',
      barrier: 'price',
    }));
    expect(once.recommendation.decisionRuleId).toBe('rule-7');
    expect(often.recommendation.decisionRuleId).toBe('rule-7');
    expect(once.recommendation.reason).not.toBe(often.recommendation.reason);
  });

  it('強い価値と追加価値が混在する規則6でも各価値の利用頻度を根拠へ使う', () => {
    const values = [value(), value({ id: 'bath-sauna', frequency: 'once', payReason: 'no' })];
    const once = buildAssessmentResult(input({ values }));
    const often = buildAssessmentResult(input({
      values: values.map((item) => item.id === 'bath-sauna' ? { ...item, frequency: 'often' } : item),
    }));
    expect(once.recommendation.decisionRuleId).toBe('rule-6');
    expect(often.recommendation.decisionRuleId).toBe('rule-6');
    expect(once.recommendation.reason).toContain('風呂・温泉・サウナ・休憩');
    expect(once.recommendation.reason).not.toBe(often.recommendation.reason);
  });

  it.each([
    { frequency: 'often' as const, text: '多くの来館または日常で役立ち、残したい価値と回答' },
    { frequency: 'unknown' as const, text: '利用頻度を覚えていませんが、残したい価値と回答' },
  ])('強い価値の頻度$frequencyを自然な根拠文にする', ({ frequency, text }) => {
    const result = buildAssessmentResult(input({ values: [value({ frequency })] }));
    expect(result.recommendation.reason).toContain(text);
  });

  it('全価値質問の入力変更が価値根拠または次行動を変える', () => {
    const baseline = buildAssessmentResult(input());
    const idChanged = buildAssessmentResult(input({ values: [value({ id: 'pool' })] }));
    expect(idChanged.valueSummary.assessments[0]?.label).not.toBe(
      baseline.valueSummary.assessments[0]?.label,
    );

    const frequencyChanged = buildAssessmentResult(input({
      values: [value({ frequency: 'once' })],
    }));
    expect(frequencyChanged.valueSummary.frequencyCounts).not.toEqual(
      baseline.valueSummary.frequencyCounts,
    );
    expect(frequencyChanged.recommendation.nextStep).not.toBe(
      baseline.recommendation.nextStep,
    );

    const fulfillmentChanged = buildAssessmentResult(input({
      values: [value({ fulfillment: 'unmet' })],
    }));
    expect(fulfillmentChanged.recommendation.decisionRuleId).not.toBe(
      baseline.recommendation.decisionRuleId,
    );

    const payChanged = buildAssessmentResult(input({
      values: [value({ payReason: 'no' })], barrier: 'offering',
    }));
    expect(payChanged.recommendation.kind).not.toBe(baseline.recommendation.kind);

    const customChanged = buildAssessmentResult(input({
      values: [value({ id: 'other', customLabel: '子どもと過ごす時間' })],
    }));
    expect(customChanged.valueSummary.assessments[0]?.label).toBe('子どもと過ごす時間');
    expect(customChanged.recommendation.reason).toContain('子どもと過ごす時間');
  });

  it('阻害要因ごとに次行動と変更条件が変わる', () => {
    const values = [value({ payReason: 'no' })];
    const price = buildAssessmentResult(input({ values, barrier: 'price' }));
    const crowding = buildAssessmentResult(input({ values, barrier: 'crowding' }));
    expect(price.recommendation.nextStep).not.toBe(crowding.recommendation.nextStep);
    expect(price.recommendation.changeCondition).not.toBe(crowding.recommendation.changeCondition);
  });

  it('料金・来館・時間・費用負担・継続意向の各質問が表示結果を変える', () => {
    const baseline = buildAssessmentResult(input());

    const feeChanges = [
      { monthlyFeeYen: 8_500, monthlyFixedFeeYen: 0, annualFeeYen: 0 },
      { monthlyFeeYen: 8_000, monthlyFixedFeeYen: 500, annualFeeYen: 0 },
      { monthlyFeeYen: 8_000, monthlyFixedFeeYen: 0, annualFeeYen: 1_200 },
    ];
    for (const fees of feeChanges) {
      const feesChanged = buildAssessmentResult(input({ fees }));
      expect(feesChanged.monthly.roundedYen).not.toBe(baseline.monthly.roundedYen);
      expect(feesChanged.perVisit).not.toEqual(baseline.perVisit);
    }

    const visitsChanged = buildAssessmentResult(input({
      visits: { kind: 'bounded', bandId: 'monthly-3-4', min: 3, max: 4 },
    }));
    expect(visitsChanged.perVisit).not.toEqual(baseline.perVisit);

    const timeChanged = buildAssessmentResult(input({
      time: { kind: 'total-hours', totalHours: 10 },
    }));
    expect(timeChanged.perHour).not.toEqual(baseline.perHour);

    const burdenChanged = buildAssessmentResult(input({
      feeBurden: 'slight-burden', barrier: 'price',
    }));
    expect(burdenChanged.recommendation.kind).not.toBe(baseline.recommendation.kind);

    const continuationChanged = buildAssessmentResult(input({
      continuation: 'not-choose', barrier: 'travel',
    }));
    expect(continuationChanged.recommendation.kind).not.toBe(baseline.recommendation.kind);
  });

  it.each([
    {
      name: '利用なしを他条件より優先',
      changes: { values: [], feeBurden: 'review-needed', continuation: 'not-choose', barrier: 'price' },
      expected: 'confirm-use-condition',
      rule: 'rule-1',
    },
    {
      name: '強い価値と家計見直し',
      changes: { feeBurden: 'review-needed', continuation: 'not-choose', barrier: 'price' },
      expected: 'preserve-value-reduce-cost',
      rule: 'rule-2',
    },
    {
      name: '強い価値と非継続意向',
      changes: { continuation: 'not-choose', barrier: 'travel' },
      expected: 'review-contract',
      rule: 'rule-3',
    },
    {
      name: '強い価値だが期待未達',
      changes: { values: [value({ fulfillment: 'unmet' })] },
      expected: 'review-use',
      rule: 'rule-4',
    },
    {
      name: '強い価値と少し負担',
      changes: { feeBurden: 'slight-burden', barrier: 'price' },
      expected: 'keep-review-price',
      rule: 'rule-5',
    },
    {
      name: '強い価値と継続意向',
      changes: {},
      expected: 'keep-reason',
      rule: 'rule-6',
    },
    {
      name: '強い価値なしと負担',
      changes: { values: [value({ payReason: 'no' })], feeBurden: 'slight-burden', barrier: 'price' },
      expected: 'review-contract',
      rule: 'rule-7',
    },
    {
      name: '判断中の価値',
      changes: { values: [value({ payReason: 'unsure' })], barrier: 'other' },
      expected: 'review-use',
      rule: 'rule-8',
    },
    {
      name: '支払理由なし',
      changes: { values: [value({ payReason: 'no' })], barrier: 'offering' },
      expected: 'review-use',
      rule: 'rule-9',
    },
  ] as const)('決定木: $name', ({ changes, expected, rule }) => {
    const result = buildAssessmentResult(input(changes as Partial<ValidatedAssessmentInput>));
    expect(result.recommendation.kind).toBe(expected);
    expect(result.recommendation.decisionRuleId).toBe(rule);
    expect(result.recommendation.decisionRuleLabel).not.toBe('');
    expect(result.recommendation.reason).toContain('継続意向は「');
    expect(result.recommendation.reason).toContain('会費負担は「');
    expect(result.recommendation.reason).toContain('会費を払って残したい価値は');
  });

  it('次行動は阻害要因、期待未達、期待不明、頻度不明、1回、回数不明、時間不明の順で選ぶ', () => {
    const barrier = buildAssessmentResult(input({
      values: [value({ fulfillment: 'unmet' })], feeBurden: 'slight-burden', barrier: 'price',
    }));
    expect(barrier.recommendation.nextStep).toContain('低料金プラン');

    const unmet = buildAssessmentResult(input({
      values: [value({ fulfillment: 'unmet', frequency: 'unknown' })],
    }));
    expect(unmet.recommendation.nextStep).toContain('期待どおりになる条件');

    const unknownFulfillment = buildAssessmentResult(input({
      values: [value({ fulfillment: 'unknown', frequency: 'unknown' })],
    }));
    expect(unknownFulfillment.recommendation.nextStep).toContain('期待どおりだったか');

    const unknownFrequency = buildAssessmentResult(input({
      values: [value({ frequency: 'unknown' })], visits: { kind: 'unknown' },
    }));
    expect(unknownFrequency.recommendation.nextStep).toContain('使った日');

    const once = buildAssessmentResult(input({
      values: [value({ frequency: 'once' })], visits: { kind: 'unknown' },
    }));
    expect(once.recommendation.nextStep).toContain('同じ頻度でも');
    expect(once.recommendation.nextStep).not.toContain('もう1回');

    const visits = buildAssessmentResult(input({
      visits: { kind: 'unknown' }, time: { kind: 'unknown' },
    }));
    expect(visits.recommendation.nextStep).toContain('来館日');

    const facilityTime = buildAssessmentResult(input());
    expect(facilityTime.recommendation.nextStep).toContain('館内利用時間');
  });
});
