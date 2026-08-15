import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { buildAssessmentResult, type ValidatedAssessmentInput } from '../../domain/assessment';
import { ResultSummary } from './ResultSummary';

function input(overrides: Partial<ValidatedAssessmentInput> = {}): ValidatedAssessmentInput {
  return {
    fees: {
      baseMonthlyFeeYen: 8_000,
      monthlyAdditional: { kind: 'known', yen: 300 },
      annualFee: { kind: 'known', yen: 3_600 },
    },
    visits: { kind: 'exact', visits: 6 },
    time: { kind: 'total-hours', totalHours: 9 },
    values: [
      { id: 'training', customLabel: '', role: 'primary', status: 'fulfilled' },
      { id: 'bath-sauna', customLabel: '', role: 'secondary', status: 'quality-below' },
    ],
    feeBurden: 'comfortable',
    ...overrides,
  };
}

describe('GFR-G1R7 ResultSummary', () => {
  it('結論、支える根拠、見直す根拠、料金、次の一行動、短い限界の順に表示する', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<ResultSummary result={buildAssessmentResult(input())} headingRef={createRef<HTMLHeadingElement>()} onEdit={onEdit} />);

    expect(screen.getByRole('heading', { name: '今の会費を続ける根拠があります' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '結論を支える根拠' }).parentElement).toHaveTextContent('トレーニング設備');
    expect(screen.getByRole('heading', { name: '見直す根拠' }).parentElement).toHaveTextContent('風呂・温泉・サウナ・休憩');
    expect(screen.getByRole('heading', { name: '実質月額 8,600円' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '来館1回あたり' }).parentElement).toHaveTextContent('1,433円');
    expect(screen.getByRole('heading', { name: '館内利用1時間あたり' }).parentElement).toHaveTextContent('956円');
    const headings = screen.getAllByRole('heading').map((heading) => heading.textContent);
    expect(headings.indexOf('結論を支える根拠')).toBeLessThan(headings.indexOf('見直す根拠'));
    expect(headings.indexOf('見直す根拠')).toBeLessThan(headings.indexOf('実質月額 8,600円'));
    expect(headings.indexOf('実質月額 8,600円')).toBeLessThan(headings.indexOf('次の一行動'));
    expect(screen.getByText(/全国一律の得する額や契約変更を決めるものではありません/)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('適用した規則');

    await user.click(screen.getByRole('button', { name: '入力を修正' }));
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it('不明な追加費を0円と断定せず、入力済み分の月額として表示する', () => {
    render(<ResultSummary
      result={buildAssessmentResult(input({ fees: { baseMonthlyFeeYen: 8_000, monthlyAdditional: { kind: 'unknown' }, annualFee: { kind: 'none' } } }))}
      headingRef={createRef<HTMLHeadingElement>()}
      onEdit={vi.fn()}
    />);

    expect(screen.getByRole('heading', { name: '入力済み分の月額 8,000円' })).toBeInTheDocument();
    expect(screen.getByText(/表示額は分かっている料金だけの合計/)).toBeInTheDocument();
    expect(screen.getByText('未確認')).toBeInTheDocument();
  });

  it('0回来館と時間未入力の未算出理由を具体的に表示する', () => {
    render(<ResultSummary
      result={buildAssessmentResult(input({ visits: { kind: 'exact', visits: 0 }, time: { kind: 'unknown' } }))}
      headingRef={createRef<HTMLHeadingElement>()}
      onEdit={vi.fn()}
    />);

    expect(screen.getByRole('heading', { name: '来館1回あたり' }).parentElement).toHaveTextContent('来館0回では');
    expect(screen.getByRole('heading', { name: '来館1回あたり' }).parentElement).toHaveTextContent('8,600円');
    expect(screen.getByRole('heading', { name: '館内利用1時間あたり' }).parentElement).toHaveTextContent('館内利用時間を入力していないため');
  });

  it('年会費の月割りを表示月額で丸め直さず、単価計算の精度を説明する', () => {
    render(<ResultSummary
      result={buildAssessmentResult(input({
        fees: { baseMonthlyFeeYen: 0, monthlyAdditional: { kind: 'none' }, annualFee: { kind: 'known', yen: 11 } },
        visits: { kind: 'exact', visits: 2 },
      }))}
      headingRef={createRef<HTMLHeadingElement>()}
      onEdit={vi.fn()}
    />);

    expect(screen.getByRole('heading', { name: '実質月額 1円' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '来館1回あたり' }).parentElement).toHaveTextContent('0円');
    expect(screen.getByText(/年会費÷12は1\/12円単位のまま保持/)).toBeInTheDocument();
  });
});
