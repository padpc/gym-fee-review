import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Calculator } from './Calculator';

async function fillCommonValueInputs(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('radio', { name: '運動習慣を保つ場所' }));
  await user.click(screen.getByRole('radio', { name: 'できた' }));
  await user.click(screen.getByRole('radio', { name: '代替しにくい' }));
}

describe('GFR-G1R2 Calculator', () => {
  it('本人の月額上限と強い利用価値を2軸で判定する', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.type(screen.getByRole('textbox', { name: /^月会費/ }), '8000');
    await user.click(screen.getByRole('radio', { name: '月会費は月いくらまでなら納得できるか' }));
    await user.type(screen.getByRole('textbox', { name: /^納得できる月額上限/ }), '9000');
    await fillCommonValueInputs(user);
    await user.click(screen.getByRole('button', { name: '2つの軸で判定する' }));

    expect(await screen.findByRole('heading', { name: '会費の見直し結果' })).toHaveFocus();
    expect(screen.getByRole('heading', { name: 'あなたの基準では、料金にも利用価値にも納得しやすい状態です' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '料金の判定' }).parentElement).toHaveTextContent('あなたの基準内');
    expect(screen.getByRole('heading', { name: '月額相当に含めた費用' }).parentElement).toHaveTextContent('月会費8,000円');
    expect(screen.getByRole('heading', { name: '月額相当に含めた費用' }).parentElement).toHaveTextContent('年会費0円／年');
    expect(screen.getByRole('heading', { name: '利用価値の判定' }).parentElement).toHaveTextContent('通う価値の根拠が強い');
    expect(document.body).not.toHaveTextContent('総合得点');
  });

  it('0回を1回単価の超過と誤説明せず、未利用月の支払額を示す', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.type(screen.getByRole('textbox', { name: /^月会費/ }), '8000');
    await user.click(screen.getByRole('radio', { name: '1回あたりいくらまでなら納得できるか' }));
    await user.type(screen.getByRole('textbox', { name: /^納得できる1回あたり上限/ }), '2000');
    const visitGroup = screen.getByRole('group', { name: '先月の回数は分かりますか' });
    await user.click(within(visitGroup).getByRole('radio', { name: '回数が分かる' }));
    await user.type(screen.getByRole('textbox', { name: /^先月の来館回数/ }), '0');
    await fillCommonValueInputs(user);
    await user.click(screen.getByRole('button', { name: '2つの軸で判定する' }));

    const priceCard = screen.getByRole('heading', { name: '料金の判定' }).parentElement;
    expect(priceCard).toHaveTextContent('先月は0回で1回あたりを算出できず、本人上限を満たす利用実績ではありません');
    expect(priceCard).toHaveTextContent('未利用月の月額相当は8,000円');
  });

  it('1円未満の丸め前差を隠さず費用内訳とともに示す', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.type(screen.getByRole('textbox', { name: /^月会費/ }), '0');
    await user.click(screen.getByText('必須の追加費用がある場合'));
    await user.type(screen.getByRole('textbox', { name: /^年会費/ }), '1');
    await user.click(screen.getByRole('radio', { name: '月会費は月いくらまでなら納得できるか' }));
    await user.type(screen.getByRole('textbox', { name: /^納得できる月額上限/ }), '0');
    await fillCommonValueInputs(user);
    await user.click(screen.getByRole('button', { name: '2つの軸で判定する' }));

    const priceCard = screen.getByRole('heading', { name: '料金の判定' }).parentElement;
    expect(priceCard).toHaveTextContent('月額上限との差：1円未満');
    expect(priceCard).toHaveTextContent('表示上は同じ円額ですが、判定は丸め前の値で行っています');
    expect(priceCard).toHaveTextContent('年会費1円／年（12分の1を加算）');
  });

  it('実在代替案より高く、利用価値が弱い状態を隠さない', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.type(screen.getByRole('textbox', { name: /^月会費/ }), '8000');
    await user.click(screen.getByRole('radio', { name: '実際に検討できる代替案はいくらか' }));
    await user.type(screen.getByRole('textbox', { name: /^実在する代替案の月額相当/ }), '7000');
    await user.click(screen.getByRole('radio', { name: '風呂・サウナ' }));
    await user.click(screen.getByRole('radio', { name: 'ほとんどできなかった' }));
    await user.click(screen.getByRole('radio', { name: '代替しやすい' }));
    await user.click(screen.getByRole('button', { name: '2つの軸で判定する' }));

    expect(await screen.findByRole('heading', { name: '料金は基準を超え、この入力では通う価値の根拠も弱い状態です' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '料金の判定' }).parentElement).toHaveTextContent('入力した代替案の方が低い');
    expect(screen.getByRole('heading', { name: '利用価値の判定' }).parentElement).toHaveTextContent('通う価値の根拠が弱い');
  });

  it('回数不明でも必要回数とシナリオを示し、料金だけ確定不能にする', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.type(screen.getByRole('textbox', { name: /^月会費/ }), '8000');
    await user.click(screen.getByRole('radio', { name: '1回あたりいくらまでなら納得できるか' }));
    await user.type(screen.getByRole('textbox', { name: /^納得できる1回あたり上限/ }), '1000');
    const visitGroup = screen.getByRole('group', { name: '先月の回数は分かりますか' });
    await user.click(within(visitGroup).getByRole('radio', { name: '分からない' }));
    await fillCommonValueInputs(user);
    await user.click(screen.getByRole('button', { name: '2つの軸で判定する' }));

    expect(await screen.findByRole('heading', { name: /料金は判断材料が不足しています。通う価値の根拠は強い状態です/ })).toBeInTheDocument();
    expect(screen.getByText('料金上は月8回で、1回上限以下になる計算です')).toBeInTheDocument();
    expect(screen.getByText(/その回数まで来館するよう勧めるものではありません/)).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /月0回 算出不可/ })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /月20回 400円/ })).toBeInTheDocument();
  });

  it('空欄をまとめ、最初の不正項目へフォーカスする', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.click(screen.getByRole('button', { name: '2つの軸で判定する' }));
    expect(screen.getByRole('alert')).toHaveTextContent('5件の入力を確認してください');
    await waitFor(() => expect(screen.getByRole('textbox', { name: /^月会費/ })).toHaveFocus());
  });

  it('基準変更で非表示になった回数エラーを残さない', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.type(screen.getByRole('textbox', { name: /^月会費/ }), '8000');
    await user.click(screen.getByRole('radio', { name: '1回あたりいくらまでなら納得できるか' }));
    await user.type(screen.getByRole('textbox', { name: /^納得できる1回あたり上限/ }), '1000');
    await fillCommonValueInputs(user);
    await user.click(screen.getByRole('button', { name: '2つの軸で判定する' }));
    expect(screen.getByRole('alert')).toHaveTextContent('回数の分かり方を選んでください');

    await user.click(screen.getByRole('radio', { name: '月会費は月いくらまでなら納得できるか' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: '先月の回数は分かりますか' })).not.toBeInTheDocument();
  });

  it('結果から戻ると入力値を保持し、入力見出しへフォーカスする', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.type(screen.getByRole('textbox', { name: /^月会費/ }), '8000');
    await user.click(screen.getByRole('radio', { name: '月会費は月いくらまでなら納得できるか' }));
    await user.type(screen.getByRole('textbox', { name: /^納得できる月額上限/ }), '9000');
    await fillCommonValueInputs(user);
    await user.click(screen.getByRole('button', { name: '2つの軸で判定する' }));
    await user.click(await screen.findByRole('button', { name: '入力を修正' }));

    await waitFor(() => expect(screen.getByRole('heading', { name: '料金と利用価値を入力' })).toHaveFocus());
    expect(screen.getByRole('textbox', { name: /^月会費/ })).toHaveValue('8000');
    expect(screen.getByRole('radio', { name: '月会費は月いくらまでなら納得できるか' })).toBeChecked();
  });
});
