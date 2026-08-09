import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Calculator } from './Calculator';

async function chooseCriterion(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
) {
  await user.click(screen.getByRole('radio', { name: label }));
  await user.click(screen.getByRole('button', { name: 'この基準で入力へ' }));
}

describe('G1改訂 Calculator', () => {
  it('回数不明でもシナリオ表まで完了する', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await chooseCriterion(user, '1回あたり料金で見る');
    await user.type(screen.getByLabelText(/^月会費/), '8000');
    await user.click(screen.getByRole('radio', { name: '分からない（回数別の目安を見る）' }));
    await user.click(screen.getByRole('button', { name: '自分の会費の見え方を見る' }));

    expect(await screen.findByRole('heading', { name: '会費の見え方' })).toHaveFocus();
    expect(screen.getByText('回数不明')).toBeInTheDocument();
    expect(screen.getByText('実績ではありません。回数別の目安です。')).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /月0回 算出不可/ })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /月6回 1,333円/ })).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('都度払い');
  });

  it('設備だけなら回数を要求せず、利用と重要性を分ける', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await chooseCriterion(user, '使った設備・プログラムで見る');
    expect(screen.queryByRole('group', { name: '回数の分かり方' })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/^月会費/), '8000');
    await user.click(screen.getByRole('checkbox', { name: 'プールを使った' }));
    await user.selectOptions(screen.getByLabelText('プールの利用頻度'), '1-3');
    await user.click(screen.getByRole('checkbox', { name: 'プールは会費を払う理由として重要' }));
    await user.click(
      screen.getByRole('checkbox', { name: 'スタジオ・グループレッスンは会費を払う理由として重要' }),
    );
    await user.click(screen.getByRole('button', { name: '自分の会費の見え方を見る' }));

    expect(await screen.findByRole('heading', { name: '会費の見え方' })).toHaveFocus();
    expect(screen.getByRole('heading', { name: 'そのひと月に使ったもの' })).toBeInTheDocument();
    expect(screen.getByText('プール：1～3回')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '会費を払う理由として重要なもの' })).toBeInTheDocument();
    expect(screen.getByText('重要だが、そのひと月は使っていないもの')).toBeInTheDocument();
    expect(screen.getAllByText('スタジオ・グループレッスン').length).toBeGreaterThan(0);
    expect(screen.queryByText(/1回あたり/)).not.toBeInTheDocument();
  });

  it('合計滞在時間なら回数なしで1時間単価を確認できる', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await chooseCriterion(user, '1時間あたり料金で見る');
    await user.type(screen.getByLabelText(/^月会費/), '8000');
    await user.click(screen.getByRole('radio', { name: '先月の合計滞在時間' }));
    expect(screen.queryByRole('group', { name: '回数の分かり方' })).not.toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: /^先月の合計滞在時間/ }), '6.0');
    await user.click(screen.getByRole('button', { name: '自分の会費の見え方を見る' }));

    expect(await screen.findByText('約1,333円／時間')).toBeInTheDocument();
    expect(screen.getByText(/滞在時間であり、運動時間や健康効果の評価ではありません/)).toBeInTheDocument();
  });

  it('まとめて確認では時間と設備を省略でき、総合判定を出さない', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await chooseCriterion(user, 'まとめて見る');
    await user.type(screen.getByLabelText(/^月会費/), '8000');
    await user.click(screen.getByRole('radio', { name: 'だいたいの頻度なら分かる' }));
    await user.click(screen.getByRole('radio', { name: '週1回前後（月4～6回）' }));
    await user.click(screen.getByRole('button', { name: '自分の会費の見え方を見る' }));

    expect(await screen.findByText('約1,333～2,000円／回')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '1時間あたり' })).not.toBeInTheDocument();
    for (const text of ['総合得点', 'お得', '損', '退会すべき']) {
      expect(document.body).not.toHaveTextContent(text);
    }
  });

  it('入力エラーをまとめ、最初の項目へフォーカスする', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await chooseCriterion(user, '1回あたり料金で見る');
    await user.click(screen.getByRole('button', { name: '自分の会費の見え方を見る' }));

    expect(screen.getByRole('alert')).toHaveTextContent('2件の入力を確認してください');
    await waitFor(() => expect(screen.getByLabelText(/^月会費/)).toHaveFocus());
  });

  it('入力方式を変えたら非表示になった項目のエラーを残さない', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await chooseCriterion(user, '1回あたり料金で見る');
    await user.type(screen.getByLabelText(/^月会費/), '8000');
    await user.click(screen.getByRole('radio', { name: '先月の回数が分かる' }));
    await user.click(screen.getByRole('button', { name: '自分の会費の見え方を見る' }));
    expect(screen.getByRole('alert')).toHaveTextContent('先月の来館回数を入力してください');

    await user.click(screen.getByRole('radio', { name: '分からない（回数別の目安を見る）' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '自分の会費の見え方を見る' }));
    expect(await screen.findByText('回数不明')).toBeInTheDocument();
  });
});
