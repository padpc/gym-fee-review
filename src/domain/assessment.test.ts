import { describe, expect, it } from 'vitest';
import {
  buildAssessmentResult,
  buildValueSummary,
  calculateMonthlyDuration,
  calculateMonthlyEquivalent,
  calculatePerHourResult,
  calculatePerVisitResult,
  recommendationHeadlines,
  type FeeBurden,
  type FeeValues,
  type RecommendationKind,
  type ValidatedAssessmentInput,
  type ValueAssessmentInput,
  type ValueStatus,
} from './assessment';
import { yenToUnits } from './money';

function fees(overrides: Partial<FeeValues> = {}): FeeValues {
  return {
    baseMonthlyFeeYen: 8_000,
    monthlyAdditional: { kind: 'none' },
    annualFee: { kind: 'none' },
    ...overrides,
  };
}

function value(overrides: Partial<ValueAssessmentInput> = {}): ValueAssessmentInput {
  return {
    id: 'training',
    customLabel: '',
    role: 'primary',
    status: 'fulfilled',
    ...overrides,
  };
}

function input(overrides: Partial<ValidatedAssessmentInput> = {}): ValidatedAssessmentInput {
  return {
    fees: fees(),
    visits: { kind: 'exact', visits: 8 },
    time: { kind: 'unknown' },
    values: [value()],
    feeBurden: 'comfortable',
    ...overrides,
  };
}

describe('R7 料金計算', () => {
  it('基本月会費・毎月追加費・年会費を1/12円精度で合算し、表示時だけ丸める', () => {
    const monthly = calculateMonthlyEquivalent(fees({
      monthlyAdditional: { kind: 'known', yen: 500 },
      annualFee: { kind: 'known', yen: 1_201 },
    }));
    expect(monthly).toEqual({ kind: 'complete', units: 103_201, roundedYen: 8_600 });

    expect(calculateMonthlyEquivalent(fees({
      baseMonthlyFeeYen: 0,
      annualFee: { kind: 'known', yen: 6 },
    }))).toEqual({ kind: 'complete', units: 6, roundedYen: 1 });
  });

  it('不明な継続費用は0円と断定せず、入力済み月額と不足項目を返す', () => {
    expect(calculateMonthlyEquivalent(fees({
      monthlyAdditional: { kind: 'unknown' },
      annualFee: { kind: 'known', yen: 1_200 },
    }))).toEqual({
      kind: 'known-subtotal',
      units: yenToUnits(8_000) + 1_200,
      roundedYen: 8_100,
      unknownFees: ['monthly-additional'],
    });

    const bothUnknown = calculateMonthlyEquivalent(fees({
      monthlyAdditional: { kind: 'unknown' },
      annualFee: { kind: 'unknown' },
    }));
    expect(bothUnknown.kind).toBe('known-subtotal');
    if (bothUnknown.kind === 'known-subtotal') {
      expect(bothUnknown.unknownFees).toEqual(['monthly-additional', 'annual-fee']);
      expect(bothUnknown.roundedYen).toBe(8_000);
    }
  });

  it('型を迂回した負数・小数の料金を拒否する', () => {
    expect(() => calculateMonthlyEquivalent(fees({ baseMonthlyFeeYen: -1 }))).toThrow(RangeError);
    expect(() => calculateMonthlyEquivalent(fees({
      monthlyAdditional: { kind: 'known', yen: 1.5 },
    }))).toThrow(RangeError);
  });

  it('正確な回数、0回、範囲、21回以上、不明を単一値に捏造せず計算する', () => {
    const monthlyUnits = yenToUnits(8_400);
    expect(calculatePerVisitResult(monthlyUnits, { kind: 'exact', visits: 4 })).toEqual({
      kind: 'exact', visits: 4, yenPerVisit: 2_100, unusedPaymentYen: 0,
    });
    expect(calculatePerVisitResult(monthlyUnits, { kind: 'exact', visits: 0 })).toEqual({
      kind: 'exact', visits: 0, yenPerVisit: null, unusedPaymentYen: 8_400,
    });
    expect(calculatePerVisitResult(monthlyUnits, {
      kind: 'bounded', bandId: 'monthly-1-3', min: 1, max: 3,
    })).toEqual({
      kind: 'bounded', bandId: 'monthly-1-3', minVisits: 1, maxVisits: 3,
      minYenPerVisit: 2_800, maxYenPerVisit: 8_400,
    });
    expect(calculatePerVisitResult(monthlyUnits, {
      kind: 'at-least', bandId: 'monthly-21-plus', min: 21,
    })).toEqual({
      kind: 'at-least', bandId: 'monthly-21-plus', minVisits: 21, maxYenPerVisit: 400,
    });
    expect(calculatePerVisitResult(monthlyUnits, { kind: 'unknown' })).toEqual({
      kind: 'unknown',
      reason: 'visits-unknown',
      scenarios: [
        { visits: 1, yenPerVisit: 8_400 },
        { visits: 2, yenPerVisit: 4_200 },
        { visits: 4, yenPerVisit: 2_100 },
        { visits: 8, yenPerVisit: 1_050 },
        { visits: 12, yenPerVisit: 700 },
      ],
    });
  });

  it('館内合計時間と1回平均を、正確・範囲・21回以上・不明回数で扱う', () => {
    expect(calculateMonthlyDuration(
      { kind: 'exact', visits: 4 },
      { kind: 'total-hours', totalHours: 6.5 },
    )).toEqual({ kind: 'exact', minutes: 390 });
    expect(calculateMonthlyDuration(
      { kind: 'bounded', bandId: 'weekly-1', min: 4, max: 6 },
      { kind: 'average-minutes', averageMinutes: 90 },
    )).toEqual({ kind: 'bounded', minMinutes: 360, maxMinutes: 540 });
    expect(calculateMonthlyDuration(
      { kind: 'at-least', bandId: 'monthly-21-plus', min: 21 },
      { kind: 'average-minutes', averageMinutes: 60 },
    )).toEqual({ kind: 'at-least', minMinutes: 1_260 });
    expect(calculateMonthlyDuration(
      { kind: 'unknown' },
      { kind: 'average-minutes', averageMinutes: 60 },
    )).toEqual({ kind: 'unknown', reason: 'average-needs-visits' });
  });

  it('館内時間がある場合だけ時間単価を返し、不明回数では参考シナリオを返す', () => {
    expect(calculatePerHourResult(yenToUnits(9_000), { kind: 'exact', minutes: 600 }))
      .toEqual({ kind: 'exact', minutes: 600, yenPerHour: 900 });
    expect(calculatePerHourResult(yenToUnits(9_000), {
      kind: 'bounded', minMinutes: 360, maxMinutes: 540,
    })).toEqual({
      kind: 'bounded', minMinutes: 360, maxMinutes: 540,
      minYenPerHour: 1_000, maxYenPerHour: 1_500,
    });
    const scenarios = calculatePerHourResult(
      yenToUnits(9_000),
      { kind: 'unknown', reason: 'average-needs-visits' },
      90,
    );
    expect(scenarios.kind).toBe('unknown');
    if (scenarios.kind === 'unknown') {
      expect(scenarios.scenarios?.[0]).toEqual({ visits: 1, totalMinutes: 90, yenPerHour: 6_000 });
      expect(scenarios.scenarios).toHaveLength(5);
    }
    expect(calculatePerHourResult(yenToUnits(9_000), { kind: 'exact', minutes: 0 }))
      .toEqual({ kind: 'unknown', reason: 'zero-time' });
  });
});

describe('R7 価値根拠', () => {
  it('主な価値が期待どおりなら強い根拠とし、追加価値の弱点も隠さない', () => {
    const summary = buildValueSummary([
      value({ id: 'bath-sauna' }),
      value({ id: 'studio', role: 'secondary', status: 'quality-below' }),
      value({ id: 'pool', role: 'secondary', status: 'unknown' }),
    ]);
    expect(summary.evidence).toBe('strong');
    expect(summary.primary?.label).toContain('風呂');
    expect(summary.supportReasons).toEqual(['「風呂・温泉・サウナ・休憩」は期待どおり得られた']);
    expect(summary.gapReasons).toEqual([
      '「スタジオ・プログラム」は利用したが、内容・質が期待以下だった',
      '「プール・水中運動」はまだ判断できない',
    ]);
  });

  it.each([
    {
      name: '主な価値が一部',
      values: [value({ status: 'partial' })],
      expected: 'mixed',
    },
    {
      name: '主な価値は弱いが追加価値が肯定',
      values: [value({ status: 'not-used' }), value({ id: 'social', role: 'secondary', status: 'fulfilled' })],
      expected: 'weak',
    },
    {
      name: '全て期待以下または未利用',
      values: [value({ status: 'quality-below' }), value({ id: 'pool', role: 'secondary', status: 'not-used' })],
      expected: 'weak',
    },
    {
      name: '肯定がなく判断不明を含む',
      values: [value({ status: 'unknown' }), value({ id: 'pool', role: 'secondary', status: 'not-used' })],
      expected: 'uncertain',
    },
    { name: '価値なし', values: [], expected: 'none' },
  ] as const)('$nameを$expectedに分類する', ({ values, expected }) => {
    expect(buildValueSummary([...values]).evidence).toBe(expected);
  });

  it('その他の名称を結果根拠へ使い、非その他の隠れ名称は使わない', () => {
    const other = buildValueSummary([value({ id: 'other', customLabel: '  仕事前の気分転換  ' })]);
    expect(other.primary?.label).toBe('仕事前の気分転換');
    expect(other.supportReasons[0]).toContain('仕事前の気分転換');

    const hidden = buildValueSummary([value({ customLabel: '隠れた名称' })]);
    expect(hidden.primary?.label).toBe('トレーニング設備・フリーウェイト');
  });

  it('一部得られた価値は異なる意味で支える根拠と見直す根拠の両方へ残す', () => {
    const summary = buildValueSummary([value({ status: 'partial' })]);
    expect(summary.supportReasons).toEqual([
      '「トレーニング設備・フリーウェイト」は一部得られ、会費を支える材料がある',
    ]);
    expect(summary.gapReasons).toEqual([
      '「トレーニング設備・フリーウェイト」は一部に留まり、満たしていない点が残る',
    ]);
  });
});

describe('R7 結論', () => {
  const primaryStatuses = [
    'fulfilled',
    'partial',
    'quality-below',
    'not-used',
    'unknown',
    'none',
  ] as const;
  const burdens = ['comfortable', 'slight-burden', 'review-needed'] as const;
  const feeCompleteness = ['complete', 'unknown'] as const;

  function expectedKind(
    status: ValueStatus | 'none',
    burden: FeeBurden,
    completeness: (typeof feeCompleteness)[number],
  ): RecommendationKind {
    if (status === 'quality-below' || status === 'not-used' || status === 'none') {
      return 'review-contract';
    }
    if (status === 'partial' || status === 'unknown') {
      return burden === 'review-needed' ? 'review-contract' : 'verify-value';
    }
    return burden === 'comfortable' && completeness === 'complete'
      ? 'keep'
      : 'keep-check-fees';
  }

  const decisionCases = primaryStatuses.flatMap((status) => burdens.flatMap((burden) => (
    feeCompleteness.map((completeness) => ({
      status,
      burden,
      completeness,
      expected: expectedKind(status, burden, completeness),
    }))
  )));

  it.each(decisionCases)(
    '主状態=$status、負担=$burden、料金=$completenessを$expectedにする',
    ({ status, burden, completeness, expected }) => {
      const result = buildAssessmentResult(input({
        values: status === 'none' ? [] : [value({ status })],
        feeBurden: burden,
        fees: completeness === 'complete'
          ? fees()
          : fees({ monthlyAdditional: { kind: 'unknown' } }),
      }));
      expect(result.recommendation.kind).toBe(expected);
      expect(result.recommendation.headline).toBe(recommendationHeadlines[expected]);
      expect('decisionRuleId' in result.recommendation).toBe(false);
    },
  );

  it('表示見出しを結論4種類の固定文言だけに限定する', () => {
    expect(recommendationHeadlines).toEqual({
      keep: '今の会費を続ける根拠があります',
      'keep-check-fees': '価値はあります。料金条件を見直しましょう',
      'verify-value': 'あと1か月だけ、重要な利用を確認しましょう',
      'review-contract': '今の会費は見直し候補です',
    });
    expect(new Set(Object.values(recommendationHeadlines)).size).toBe(4);
  });

  it.each([
    { primary: 'quality-below' as const, secondary: 'fulfilled' as const },
    { primary: 'not-used' as const, secondary: 'fulfilled' as const },
  ])('主価値$primaryは追加価値が良好でも契約見直しにし、追加価値は支援理由へ残す', ({ primary, secondary }) => {
    const result = buildAssessmentResult(input({
      values: [
        value({ status: primary }),
        value({ id: 'bath-sauna', role: 'secondary', status: secondary }),
      ],
    }));
    expect(result.recommendation.kind).toBe('review-contract');
    expect(result.recommendation.supportReasons.join(' ')).toContain('風呂・温泉・サウナ・休憩');
    expect(result.recommendation.reviewReasons.join(' ')).toContain('トレーニング設備');
  });

  it('主価値が良好なら追加価値の期待以下を見直し理由に残しつつ継続判定を維持する', () => {
    const result = buildAssessmentResult(input({
      values: [
        value(),
        value({ id: 'studio', role: 'secondary', status: 'quality-below' }),
      ],
    }));
    expect(result.recommendation.kind).toBe('keep');
    expect(result.recommendation.reviewReasons.join(' ')).toContain('スタジオ・プログラム');
  });

  it.each([
    {
      name: '料金不明を最優先',
      fees: fees({ annualFee: { kind: 'unknown' } }),
      burden: 'review-needed' as const,
      status: 'quality-below' as const,
      text: '年会費等を契約書や料金明細で確認',
    },
    {
      name: '家計見直しを次に優先',
      fees: fees(),
      burden: 'review-needed' as const,
      status: 'quality-below' as const,
      text: '家計負担を減らせる条件',
    },
    {
      name: '内容・質の期待以下を具体化',
      fees: fees(),
      burden: 'comfortable' as const,
      status: 'quality-below' as const,
      text: '内容・質が期待以下だった条件',
    },
    {
      name: 'ほぼ未利用の条件を具体化',
      fees: fees(),
      burden: 'slight-burden' as const,
      status: 'not-used' as const,
      text: 'ほぼ使えなかった条件',
    },
  ])('次行動は$nameする', ({ fees: feeInput, burden, status, text }) => {
    const result = buildAssessmentResult(input({
      fees: feeInput,
      feeBurden: burden,
      values: [value({ status })],
    }));
    expect(result.recommendation.nextAction).toContain(text);
  });

  it('不明料金があれば強い継続断定を避け、入力済み小計と内訳確認を優先する', () => {
    const result = buildAssessmentResult(input({
      fees: fees({
        monthlyAdditional: { kind: 'unknown' },
        annualFee: { kind: 'unknown' },
      }),
    }));
    expect(result.monthly.kind).toBe('known-subtotal');
    expect(result.recommendation.kind).toBe('keep-check-fees');
    expect(result.recommendation.headline).toBe(recommendationHeadlines['keep-check-fees']);
    expect(result.recommendation.reviewReasons.join(' ')).toContain('入力済み金額だけ');
    expect(result.recommendation.nextAction).toContain('毎月の追加費用と年会費等');
  });

  it('主な価値が判断不明で家計見直しが必要なら契約見直しへ進める', () => {
    const result = buildAssessmentResult(input({
      values: [value({ status: 'unknown' })],
      feeBurden: 'review-needed',
    }));
    expect(result.recommendation.kind).toBe('review-contract');
    expect(result.recommendation.reviewReasons.join(' ')).toContain('まだ判断できない');
    expect(result.recommendation.reviewReasons.join(' ')).toContain('家計上');
  });

  it('主な価値が一部または判断不明なら、次の1か月の来館日と実感を記録する', () => {
    for (const status of ['partial', 'unknown'] as const) {
      const result = buildAssessmentResult(input({ values: [value({ status })] }));
      expect(result.recommendation.kind).toBe('verify-value');
      expect(result.recommendation.nextAction).toContain('来館日');
      expect(result.recommendation.nextAction).toContain('主な理由の実感');
    }
  });

  it('低い来館回数だけで、期待どおりの価値と負担なしの結論を上書きしない', () => {
    const once = buildAssessmentResult(input({ visits: { kind: 'exact', visits: 1 } }));
    const unknown = buildAssessmentResult(input({ visits: { kind: 'unknown' } }));
    expect(once.recommendation.kind).toBe('keep');
    expect(unknown.recommendation.kind).toBe('keep');
    expect(once.recommendation.supportReasons.join(' ')).toContain('1回来館');
    expect(once.recommendation.nextAction).toContain('1か月後または契約更新前');
    expect(unknown.recommendation.reviewReasons.join(' ')).toContain('来館回数が分からず');
    expect(unknown.recommendation.nextAction).toContain('来館日');
    expect(once.perVisit).not.toEqual(unknown.perVisit);
  });

  it('来館0回は型を直接渡されても必ず契約見直しにする', () => {
    const result = buildAssessmentResult(input({ visits: { kind: 'exact', visits: 0 } }));
    expect(result.recommendation.kind).toBe('review-contract');
    expect(result.recommendation.headline).toBe(recommendationHeadlines['review-contract']);
    expect(result.recommendation.reviewReasons.join(' ')).toContain('来館回数は0回');
  });

  it.each([
    { visits: { kind: 'bounded' as const, bandId: 'monthly-1-3' as const, min: 1, max: 3 }, text: '月1～3回程度' },
    { visits: { kind: 'at-least' as const, bandId: 'monthly-21-plus' as const, min: 21 }, text: '月21回以上' },
  ])('範囲・21回以上の来館を支える根拠へ残す', ({ visits, text }) => {
    const result = buildAssessmentResult(input({ visits }));
    expect(result.recommendation.supportReasons.join(' ')).toContain(text);
  });

  it('料金・回数・館内時間・価値種類・価値状態・費用負担の各入力が結果を変える', () => {
    const baseline = buildAssessmentResult(input());
    const fee = buildAssessmentResult(input({ fees: fees({ baseMonthlyFeeYen: 9_000 }) }));
    expect(fee.monthly).not.toEqual(baseline.monthly);

    const visits = buildAssessmentResult(input({ visits: { kind: 'exact', visits: 4 } }));
    expect(visits.perVisit).not.toEqual(baseline.perVisit);

    const time = buildAssessmentResult(input({ time: { kind: 'total-hours', totalHours: 8 } }));
    expect(time.perHour).not.toEqual(baseline.perHour);

    const category = buildAssessmentResult(input({ values: [value({ id: 'bath-sauna' })] }));
    expect(category.valueSummary.primary?.label).not.toBe(baseline.valueSummary.primary?.label);

    const status = buildAssessmentResult(input({ values: [value({ status: 'partial' })] }));
    expect(status.recommendation.kind).not.toBe(baseline.recommendation.kind);

    const burden = buildAssessmentResult(input({ feeBurden: 'slight-burden' }));
    expect(burden.recommendation.kind).not.toBe(baseline.recommendation.kind);
  });
});
