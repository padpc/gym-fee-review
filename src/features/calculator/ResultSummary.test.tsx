import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { buildAssessmentResult, type ValidatedAssessmentInput } from '../../domain/assessment';
import { ResultSummary } from './ResultSummary';

function input(overrides: Partial<ValidatedAssessmentInput> = {}): ValidatedAssessmentInput {
  return {
    fees: { monthlyFeeYen: 8_000, monthlyFixedFeeYen: 300, annualFeeYen: 3_600 },
    visits: { kind: 'exact', visits: 6 },
    time: { kind: 'total-hours', totalHours: 9 },
    values: [
      { id: 'training', customLabel: '', frequency: 'often', fulfillment: 'met', payReason: 'yes' },
      { id: 'bath-sauna', customLabel: '', frequency: 'several', fulfillment: 'partly', payReason: 'unsure' },
    ],
    feeBurden: 'comfortable',
    continuation: 'choose',
    barrier: null,
    ...overrides,
  };
}

describe('GFR-G1R5 ResultSummary', () => {
  it('結論・理由・残したい価値・料金・次の行動・変更条件を順に表示する', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<ResultSummary result={buildAssessmentResult(input())} headingRef={createRef<HTMLHeadingElement>()} onEdit={onEdit} />);

    const overview = screen.getByRole('heading', { name: 'あなたには、この会費を払って続ける理由があります' }).closest('.result-overview');
    expect(overview).toHaveTextContent('今回の結論');
    expect(overview).toHaveTextContent('トレーニング設備');
    expect(overview).toHaveTextContent('適用した規則：規則6');
    expect(overview).not.toHaveTextContent('次の一行動');
    expect(screen.getByRole('heading', { name: '会費を払って残したい価値' }).parentElement).toHaveTextContent('トレーニング設備');
    expect(screen.getByRole('heading', { name: '次の利用で確かめたい価値' }).parentElement).toHaveTextContent('風呂・温泉・サウナ・休憩');
    expect(screen.getByRole('heading', { name: '実質月額 8,600円' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '来館1回あたり' }).parentElement).toHaveTextContent('1,433円');
    expect(screen.getByRole('heading', { name: '来館1回あたり' }).parentElement).toHaveTextContent('8,600円 ÷ 6回');
    expect(screen.getByRole('heading', { name: '館内利用1時間あたり' }).parentElement).toHaveTextContent('956円');
    expect(screen.getByRole('heading', { name: '館内利用1時間あたり' }).parentElement).toHaveTextContent('8,600円 × 60 ÷ 540分');
    const headings = screen.getAllByRole('heading').map((heading) => heading.textContent);
    expect(headings.indexOf('会費を払って残したい価値')).toBeLessThan(headings.indexOf('実質月額 8,600円'));
    expect(headings.indexOf('実質月額 8,600円')).toBeLessThan(headings.indexOf('次の一行動'));
    expect(headings.indexOf('次の一行動')).toBeLessThan(headings.indexOf('結論が変わる条件'));

    await user.click(screen.getByRole('button', { name: '入力を修正' }));
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it('その他の具体名と全3回答を透明に表示する', async () => {
    render(<ResultSummary
      result={buildAssessmentResult(input({
        values: [{ id: 'other', customLabel: '仕事帰りの気分転換', frequency: 'once', fulfillment: 'unknown', payReason: 'yes' }],
      }))}
      headingRef={createRef<HTMLHeadingElement>()}
      onEdit={vi.fn()}
    />);

    await userEvent.setup().click(screen.getByText('すべての利用価値の回答を見る'));
    const detail = screen.getByRole('heading', { name: '仕事帰りの気分転換' }).closest('article');
    expect(detail).toHaveTextContent('1回程度');
    expect(detail).toHaveTextContent('まだ判断できない');
    expect(detail).toHaveTextContent('会費を払ってでも残したい');
  });

  it('0回来館と時間未入力の未算出理由を具体的に表示する', () => {
    render(<ResultSummary
      result={buildAssessmentResult(input({ visits: { kind: 'exact', visits: 0 }, time: { kind: 'unknown' } }))}
      headingRef={createRef<HTMLHeadingElement>()}
      onEdit={vi.fn()}
    />);

    expect(screen.getByRole('heading', { name: '来館1回あたり' }).parentElement).toHaveTextContent('来館回数が0回のため');
    expect(screen.getByRole('heading', { name: '来館1回あたり' }).parentElement).toHaveTextContent('今月支払った実質月額は8,600円');
    expect(screen.getByRole('heading', { name: '館内利用1時間あたり' }).parentElement).toHaveTextContent('館内利用時間を入力していないため');
  });
});
