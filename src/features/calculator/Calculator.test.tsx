import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createEmptyRawAssessmentInput } from '../../domain/validation';
import { Calculator } from './Calculator';

type User = ReturnType<typeof userEvent.setup>;

async function fillFeesAndVisits(user: User, visits: 'exact' | 'unknown' = 'exact') {
  await user.type(screen.getByRole('textbox', { name: /^月会費/ }), '8000');
  await user.click(screen.getByRole('radio', { name: '月会費以外はない' }));
  const group = screen.getByRole('group', { name: '最近の典型的な1か月の来館回数' });
  if (visits === 'exact') {
    await user.click(within(group).getByRole('radio', { name: '回数が分かる' }));
    await user.type(screen.getByRole('textbox', { name: /^来館回数/ }), '4');
  } else {
    await user.click(within(group).getByRole('radio', { name: '分からない' }));
  }
}

async function answerValue(
  user: User,
  valueLabel: string,
  answers: { frequency?: string; fulfillment?: string; payReason?: string } = {},
) {
  await user.click(screen.getByRole('checkbox', { name: valueLabel }));
  const article = screen.getByRole('heading', { name: valueLabel, level: 4 }).closest('article');
  if (!article) throw new Error('value article not found');
  await user.click(within(article).getByRole('radio', { name: answers.frequency ?? '複数回' }));
  await user.click(within(article).getByRole('radio', { name: answers.fulfillment ?? '期待どおりだった' }));
  await user.click(within(article).getByRole('radio', { name: answers.payReason ?? '会費を払ってでも残したい' }));
}

async function answerDecision(user: User, options: { continuation?: string; burden?: string; barrier?: string } = {}) {
  await user.click(screen.getByRole('radio', { name: options.continuation ?? '同じ条件でも来月また選ぶ' }));
  await user.click(screen.getByRole('radio', { name: options.burden ?? '無理なく払える' }));
  if (options.barrier) await user.click(screen.getByRole('radio', { name: options.barrier }));
}

describe('GFR-G1R5 Calculator', () => {
  it('風呂・サウナを単独価値として診断し、館内利用時間と結論を表示する', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await fillFeesAndVisits(user);
    await user.click(screen.getByRole('radio', { name: '月の合計時間' }));
    await user.type(screen.getByRole('textbox', { name: /^月の合計館内利用時間/ }), '6');
    await answerValue(user, '風呂・温泉・サウナ・休憩');
    await answerDecision(user);
    expect(screen.queryByRole('group', { name: '継続を迷わせる主な要因は何ですか' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '診断結果を見る' }));
    expect(await screen.findByRole('heading', { name: 'ジム会費の診断結果' })).toHaveFocus();
    expect(screen.getByRole('heading', { name: 'あなたには、この会費を払って続ける理由があります' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '会費を払って残したい価値' }).parentElement).toHaveTextContent('風呂・温泉・サウナ・休憩');
    expect(screen.getByRole('heading', { name: '館内利用1時間あたり' }).parentElement).toHaveTextContent('1,333円');
  });

  it('選んだ複数価値だけ3問を展開し、その他は具体名を結果へ反映する', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.click(screen.getByRole('checkbox', { name: 'トレーニング設備' }));
    await user.click(screen.getByRole('checkbox', { name: 'その他' }));
    expect(screen.getAllByRole('group', { name: 'どの程度使いましたか' })).toHaveLength(2);
    expect(screen.getAllByRole('group', { name: '期待どおり使えましたか' })).toHaveLength(2);
    expect(screen.getAllByRole('group', { name: 'これは会費を払って残したい価値ですか' })).toHaveLength(2);
    expect(screen.queryByRole('heading', { name: 'プール・水中運動', level: 4 })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '具体的な価値' })).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: '今月は特に利用していない' }));
    expect(screen.queryByRole('heading', { name: 'トレーニング設備', level: 4 })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: '具体的な価値' })).not.toBeInTheDocument();
  });

  it('価値の回答が揃っていない場合は該当質問へフォーカスし、その他名を必須にする', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await fillFeesAndVisits(user);
    await user.click(screen.getByRole('checkbox', { name: 'その他' }));
    await answerDecision(user, { barrier: 'その他' });
    await user.click(screen.getByRole('button', { name: '診断結果を見る' }));

    expect(screen.getByRole('alert')).toHaveTextContent('その他の価値を1～80文字で入力してください');
    await waitFor(() => expect(screen.getByRole('textbox', { name: '具体的な価値' })).toHaveFocus());
    expect(screen.getByRole('alert')).toHaveTextContent('この価値をどの程度使ったか選んでください');
  });

  it('継続意向と会費負担が未回答なら、画面上で先にある継続意向へフォーカスする', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await fillFeesAndVisits(user);
    await answerValue(user, 'トレーニング設備');
    await user.click(screen.getByRole('button', { name: '診断結果を見る' }));

    expect(screen.getByRole('alert')).toHaveTextContent('同じ条件なら来月も選ぶか選んでください。');
    expect(screen.getByRole('alert')).toHaveTextContent('現在の会費を無理なく払えるか選んでください。');
    await waitFor(() => expect(screen.getByRole('group', { name: '来月も同じ料金・同じ使い方なら、このジムを選びますか' })).toHaveFocus());
    expect(screen.getByRole('radio', { name: '同じ条件でも来月また選ぶ' })).toHaveAttribute('aria-describedby', 'continuation-error');
    expect(screen.getByRole('radio', { name: '同じ条件でも来月また選ぶ' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('不正な館内利用時間方式をエラー文とラジオグループへ関連付ける', async () => {
    const user = userEvent.setup();
    const invalidRaw = { ...createEmptyRawAssessmentInput(), timeMode: 'invalid' as never };
    render(<Calculator initialRaw={invalidRaw} />);

    await user.click(screen.getByRole('button', { name: '診断結果を見る' }));

    expect(screen.getByRole('alert')).toHaveTextContent('館内利用時間の入力方法を選んでください。');
    const group = screen.getByRole('group', { name: /館内利用時間も料金表示に使いますか/ });
    expect(group).toHaveAttribute('aria-describedby', 'time-mode-error');
    expect(group).toHaveAttribute('aria-invalid', 'true');
    expect(within(group).getByRole('radio', { name: '入力しない' })).toHaveAttribute('aria-describedby', 'time-mode-error');
  });

  it('回数不明でも価値結論と1・2・4・8・12回のシナリオを表示する', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await fillFeesAndVisits(user, 'unknown');
    await answerValue(user, '立地・営業時間・通いやすさ', { frequency: '覚えていない' });
    await answerDecision(user);
    await user.click(screen.getByRole('button', { name: '診断結果を見る' }));

    expect(await screen.findByRole('heading', { name: 'あなたには、この会費を払って続ける理由があります' })).toBeInTheDocument();
    const perVisit = screen.getByRole('heading', { name: '来館1回あたり' }).parentElement;
    expect(perVisit).toHaveTextContent('来館回数が不明');
    for (const count of [1, 2, 4, 8, 12]) expect(perVisit).toHaveTextContent(`月${count}回なら`);
    expect(screen.getByRole('heading', { name: '館内利用1時間あたり' }).parentElement).toHaveTextContent('館内利用時間を入力していないため');
  });

  it('強い価値がない場合だけ阻害要因を表示し、条件が変わると回答を破棄する', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.click(screen.getByRole('checkbox', { name: 'プール・水中運動' }));
    const article = screen.getByRole('heading', { name: 'プール・水中運動', level: 4 }).closest('article');
    if (!article) throw new Error('value article not found');
    await user.click(within(article).getByRole('radio', { name: '1回程度' }));
    await user.click(within(article).getByRole('radio', { name: '一部は期待どおりだった' }));
    await user.click(within(within(article).getByRole('group', { name: 'これは会費を払って残したい価値ですか' })).getByRole('radio', { name: /^まだ判断できない$/ }));
    await answerDecision(user, { barrier: '混雑' });
    expect(screen.getByRole('group', { name: '継続を迷わせる主な要因は何ですか' })).toBeInTheDocument();

    await user.click(within(article).getByRole('radio', { name: '会費を払ってでも残したい' }));
    expect(screen.queryByRole('group', { name: '継続を迷わせる主な要因は何ですか' })).not.toBeInTheDocument();

    await user.click(within(within(article).getByRole('group', { name: 'これは会費を払って残したい価値ですか' })).getByRole('radio', { name: /^まだ判断できない$/ }));
    expect(screen.getByRole('radio', { name: '混雑' })).not.toBeChecked();
  });
});
