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
      activity: 'strength-training',
      performed: { kind: 'exact', count: 6 },
      completed: { kind: 'exact', count: 4 },
      contentFit: 'fits',
      evidence: 'improved',
    },
    usedServices: ['specialty-equipment', 'recovery'],
    continuation: 'choose',
    safety: 'no-concern',
    barrier: 'equipment',
    alternative: {
      availability: 'known',
      name: '都度利用プラン',
      pricing: { kind: 'per-visit', perVisitFeeYen: 1_800 },
      monthlyFixedFeeYen: 0,
      annualFeeYen: 0,
      requiredServiceMonthlyYen: 0,
      equivalence: { services: 'meets', hours: 'meets', location: 'meets' },
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

describe('GFR-G1R4 ResultSummary', () => {
  it('冒頭で結論・一行動・変更条件を示し、V/S/Fと質を別々の根拠として表示する', async () => {
    const user = userEvent.setup();
    const onEdit = renderResult(buildInput());

    const overview = screen.getByRole('heading', { name: '目的活動は行えているが、内容を見直す' }).closest('.result-overview');
    expect(overview).toHaveTextContent('目的活動 S：6回');
    expect(overview).toHaveTextContent('内容完了 F：4回');
    expect(overview).toHaveTextContent('次の一行動');
    expect(overview).toHaveTextContent('結論が変わる条件：既に始めた目的活動S回で予定内容をすべて完了できた場合');
    expect(overview).toHaveTextContent('主な阻害要因：必要な設備を使えなかった');

    expect(screen.getByRole('heading', { name: '実質月額 8,600円' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '来館1回あたり' }).parentElement).toHaveTextContent('1,433円／回');
    expect(screen.getByRole('heading', { name: '目的活動1回あたり' }).parentElement).toHaveTextContent('1,433円／回');
    expect(screen.getByRole('heading', { name: '内容完了1回あたり' }).parentElement).toHaveTextContent('2,150円／回');
    expect(screen.getByRole('heading', { name: '実運動1時間あたり' }).parentElement).toHaveTextContent('956円／時間');
    expect(screen.getByText('活動利用率 S÷V').parentElement).toHaveTextContent('100%');
    expect(screen.getByText('内容完了率 F÷S').parentElement).toHaveTextContent('66.7%');
    expect(screen.getByRole('heading', { name: '同じ活動回数で、始めた内容を完了できた場合' }).parentElement).toHaveTextContent('1,433円／完了');
    expect(screen.getByText('専門設備')).toBeInTheDocument();
    expect(screen.getByText('温浴・サウナ')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '同等比較で保持する活動・サービス' }).parentElement).toHaveTextContent('実利用の付帯サービス：専門設備・温浴・サウナ');
    expect(screen.getByText(/一つの総合点へ足していません/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '入力を修正' }));
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it('不明回答から数値を捏造せず、実運動時間を入力しなければ時間単価を出さない', () => {
    renderResult(buildInput({
      visits: { kind: 'unknown' },
      time: { kind: 'unknown' },
      purpose: {
        purpose: 'health',
        activity: 'cardio',
        performed: { kind: 'unknown' },
        completed: { kind: 'unknown' },
        contentFit: 'unknown',
        evidence: 'unknown',
      },
      usedServices: ['none'],
      continuation: 'unknown',
      safety: 'unknown',
      barrier: 'unknown',
      alternative: { availability: 'unknown' },
    }));

    expect(screen.getByRole('heading', { name: '判断材料を一つ記録して再確認する' })).toBeInTheDocument();
    expect(screen.getByText('活動利用率 S÷V').parentElement).toHaveTextContent('算出していません');
    expect(screen.getByRole('heading', { name: '来館1回あたり' }).parentElement).toHaveTextContent('回数が不明');
    expect(screen.queryByRole('heading', { name: '実運動1時間あたり' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '比較資料不足' }).closest('.comparison-result')).toHaveTextContent('料金の得・損は確定していません');
    expect(document.body).not.toHaveTextContent(/平均回数|総合得点|退会すべき|滞在時間/);
  });

  it('安全上の懸念がある場合は料金より安全確認を冒頭で優先する', () => {
    renderResult(buildInput({
      purpose: {
        purpose: 'strength',
        activity: 'strength-training',
        performed: { kind: 'exact', count: 6 },
        completed: { kind: 'exact', count: 4 },
        contentFit: 'does-not-fit',
        evidence: 'worse',
      },
      continuation: 'not-choose',
      safety: 'concern',
      barrier: null,
    }));

    const overview = screen.getByRole('heading', { name: '安全確認を優先する' }).closest('.result-overview');
    expect(overview).toHaveTextContent('運動を中止し、再開・増量の前に医療機関等へ確認する');
    expect(overview).toHaveTextContent('結論が変わる条件：安全上の懸念がないと確認でき、ほかの入力を再確認した場合');
    expect(overview).not.toHaveTextContent('主な阻害要因');
  });
});
