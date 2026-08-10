import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  buildAssessmentResult,
  type ValidatedAssessmentInput,
} from '../../domain/assessment';
import { ResultSummary } from './ResultSummary';

function buildInput(overrides: Partial<ValidatedAssessmentInput> = {}): ValidatedAssessmentInput {
  return {
    fees: { monthlyFeeYen: 8_000, monthlyFixedFeeYen: 300, annualFeeYen: 3_600 },
    visits: { kind: 'exact', visits: 6 },
    time: { kind: 'total-hours', totalHours: 9 },
    purpose: {
      purpose: 'strength',
      planned: { kind: 'exact', count: 8 },
      achieved: { kind: 'exact', count: 6 },
      evidence: 'improved',
    },
    barrier: 'none',
    alternative: {
      availability: 'known',
      name: '都度利用プラン',
      pricing: { kind: 'per-visit', perVisitFeeYen: 1_800 },
      monthlyFixedFeeYen: 0,
      annualFeeYen: 0,
      requiredServiceMonthlyYen: 0,
      equivalence: { equipment: 'meets', hours: 'meets', location: 'meets' },
    },
    ...overrides,
  };
}

function renderResult(input: ValidatedAssessmentInput, onEdit = vi.fn()) {
  render(
    <ResultSummary
      result={buildAssessmentResult(input)}
      headingRef={createRef<HTMLHeadingElement>()}
      onEdit={onEdit}
    />,
  );
  return onEdit;
}

describe('GFR-G1R3 ResultSummary', () => {
  it('異なる意味の率と実績単価を混ぜず、主提案と料金差を表示する', async () => {
    const user = userEvent.setup();
    const onEdit = renderResult(buildInput());

    expect(screen.getByRole('heading', { name: '利用計画と実行方法を1か月だけ見直して再確認する' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '実質月額 8,600円' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '利用計画達成率' }).parentElement).toHaveTextContent('75%');
    expect(screen.getByRole('heading', { name: '目的に使えた来館1回あたり' }).parentElement).toHaveTextContent('1,433円／回');
    const comparison = screen.getByRole('heading', { name: '現在プランが同額以下' }).closest('.comparison-result');
    expect(comparison).toHaveTextContent('125.6%');
    expect(comparison).toHaveTextContent('現在が月2,200円・年26,400円低い');
    expect(screen.getByText(/一つの総合点へ足していません/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '入力を修正' }));
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it('予定・回数・代替が不明なときは数値を捏造しない', () => {
    renderResult(buildInput({
      visits: { kind: 'unknown' },
      time: { kind: 'unknown' },
      purpose: {
        purpose: 'health',
        planned: { kind: 'unknown' },
        achieved: { kind: 'unknown' },
        evidence: 'unknown',
      },
      barrier: 'unknown',
      alternative: { availability: 'unknown' },
    }));

    expect(screen.getByRole('heading', { name: '利用計画達成率' }).parentElement).toHaveTextContent('算出していません');
    expect(screen.getByRole('heading', { name: '1回あたり料金' }).parentElement).toHaveTextContent('回数が不明');
    expect(screen.getByRole('heading', { name: '比較資料不足' }).closest('.comparison-result')).toHaveTextContent('料金の得・損は確定していません');
    expect(document.body).not.toHaveTextContent(/平均回数|総合得点|退会すべき/);
  });

  it('回数範囲では中央値でなく両端の単価・代替率を表示する', () => {
    renderResult(buildInput({
      fees: { monthlyFeeYen: 8_000, monthlyFixedFeeYen: 0, annualFeeYen: 0 },
      visits: { kind: 'bounded', bandId: 'weekly-1', min: 4, max: 6 },
      time: { kind: 'average-minutes', averageMinutes: 60 },
      purpose: {
        purpose: 'strength',
        planned: { kind: 'exact', count: 6 },
        achieved: { kind: 'exact', count: 4 },
        evidence: 'improved',
      },
    }));

    expect(screen.getByRole('heading', { name: '1回あたり料金' }).parentElement).toHaveTextContent('1,333～2,000円／回');
    expect(screen.getByRole('heading', { name: '1時間あたり料金' }).parentElement).toHaveTextContent('1,333～2,000円／時間');
    expect(screen.getByRole('heading', { name: '回数によって変わる' }).closest('.comparison-result')).toHaveTextContent('90%～135%');
  });
});
