import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Calculator } from './Calculator';

const fixedNow = new Date(2026, 7, 8);

async function enterCurrentPlan(user: ReturnType<typeof userEvent.setup>, values = ['8000', '4', '5', '6']) {
  await user.type(screen.getByLabelText('月会費'), values[0]);
  await user.type(screen.getByLabelText(/直近1か月/), values[1]);
  await user.type(screen.getByLabelText(/2か月前/), values[2]);
  await user.type(screen.getByLabelText(/3か月前/), values[3]);
  await user.click(screen.getByRole('button', { name: '都度払いと比べる' }));
}

describe('G1 Calculator', () => {
  it('現在料金から都度払い結果まで完了する', async () => {
    const user = userEvent.setup();
    render(<Calculator now={fixedNow} />);

    expect(screen.getByRole('heading', { name: '現在の料金と利用回数' })).toBeInTheDocument();
    expect(screen.getByLabelText('月会費')).toHaveAccessibleDescription(/円/);
    expect(screen.getByLabelText(/直近1か月/)).toHaveAccessibleDescription(/回/);
    expect(screen.queryByLabelText('1回料金')).not.toBeInTheDocument();

    await enterCurrentPlan(user);
    await user.type(screen.getByLabelText('1回料金'), '1500');
    await user.click(screen.getByRole('button', { name: '比較結果を見る' }));

    expect(await screen.findByRole('heading', { name: '比較結果' })).toHaveFocus();
    expect(screen.getByText('直近3か月は合計15回、平均5.0回／月でした。')).toBeInTheDocument();
    expect(screen.getByText('現在プランの支払額は、1回あたり約1,600円です。')).toBeInTheDocument();
    expect(
      screen.getByText('入力した条件の料金だけなら、候補の方が年間6,000円低い試算です。'),
    ).toBeInTheDocument();
    expect(screen.getByText('月6回から現在プランの料金が低くなります。')).toBeInTheDocument();
    expect(screen.getByText('料金境界')).toBeInTheDocument();
    expect(screen.getByText(/違約金、退会期限は自動判定していません/)).toBeInTheDocument();
    expect(
      screen.getByText('年間予測は、直近3か月の各月の利用回数が同じパターンで続く仮定です。'),
    ).toBeInTheDocument();
  });

  it('空欄エラーをまとめ、最初の項目へフォーカスする', async () => {
    const user = userEvent.setup();
    render(<Calculator now={fixedNow} />);

    await user.click(screen.getByRole('button', { name: '都度払いと比べる' }));

    expect(screen.getByRole('alert')).toHaveTextContent('4件の入力を確認してください');
    await waitFor(() => expect(screen.getByLabelText('月会費')).toHaveFocus());
  });

  it('全月0回を正常結果として表示する', async () => {
    const user = userEvent.setup();
    render(<Calculator now={fixedNow} />);

    await enterCurrentPlan(user, ['8000', '0', '0', '0']);
    await user.type(screen.getByLabelText('1回料金'), '1500');
    await user.click(screen.getByRole('button', { name: '比較結果を見る' }));

    expect(screen.getByText('直近3か月の利用は0回でした。')).toBeInTheDocument();
    expect(
      screen.getByText('1回あたり費用は算出できません。利用がなかった3か月の支払額は24,000円です。'),
    ).toBeInTheDocument();
    expect(screen.getByText('月6回から現在プランの料金が低くなります。')).toBeInTheDocument();
  });

  it('操作中に基準日時のpropが変わっても完了3か月を固定する', () => {
    const { rerender } = render(<Calculator now={new Date(2026, 7, 31, 23, 59)} />);

    expect(screen.getByLabelText(/2026年7月（直近1か月）/)).toBeInTheDocument();
    rerender(<Calculator now={new Date(2026, 8, 1, 0, 1)} />);

    expect(screen.getByLabelText(/2026年7月（直近1か月）/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/2026年8月（直近1か月）/)).not.toBeInTheDocument();
  });
});
