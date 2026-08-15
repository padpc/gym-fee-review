import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createEmptyRawAssessmentInput } from '../../domain/validation';
import { Calculator } from './Calculator';

type User = ReturnType<typeof userEvent.setup>;

async function fillBase(user: User, visits: 'exact' | 'unknown' = 'exact') {
  await user.type(screen.getByRole('textbox', { name: /^基本月会費/ }), '8000');
  await user.click(within(screen.getByRole('group', { name: '毎月必須の追加費用' })).getByRole('radio', { name: 'なし' }));
  await user.click(within(screen.getByRole('group', { name: '年会費・更新料など' })).getByRole('radio', { name: 'なし' }));
  const visitGroup = screen.getByRole('group', { name: '最近の1か月の来館回数' });
  await user.click(within(visitGroup).getByRole('radio', { name: visits === 'exact' ? '回数が分かる' : '分からない' }));
  if (visits === 'exact') await user.type(screen.getByRole('textbox', { name: /^来館回数/ }), '4');
}

async function selectPrimary(user: User, label: string, status = '期待どおり得られた') {
  await user.click(within(screen.getByRole('group', { name: '最も重要だったものを1つ選んでください' })).getByRole('radio', { name: label }));
  const article = screen.getByRole('heading', { level: 4, name: label }).closest('article');
  if (!article) throw new Error('value article not found');
  await user.click(within(article).getByRole('radio', { name: status }));
}

async function answerBurden(user: User, label = '無理なく払える') {
  await user.click(screen.getByRole('radio', { name: label }));
}

describe('GFR-G1R7 Calculator', () => {
  it('料金3区分、風呂・サウナ、館内時間を一つの診断へ反映する', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.type(screen.getByRole('textbox', { name: /^基本月会費/ }), '8000');
    const monthly = screen.getByRole('group', { name: '毎月必須の追加費用' });
    await user.click(within(monthly).getByRole('radio', { name: 'あり' }));
    await user.type(screen.getByRole('textbox', { name: /^毎月必須の追加費用/ }), '300');
    const annual = screen.getByRole('group', { name: '年会費・更新料など' });
    await user.click(within(annual).getByRole('radio', { name: 'あり' }));
    await user.type(screen.getByRole('textbox', { name: /^年会費・更新料など/ }), '3600');
    await user.click(screen.getByRole('radio', { name: '回数が分かる' }));
    await user.type(screen.getByRole('textbox', { name: /^来館回数/ }), '4');
    await user.click(screen.getByRole('radio', { name: '月の合計時間' }));
    await user.type(screen.getByRole('textbox', { name: /^月の合計館内利用時間/ }), '6');
    await selectPrimary(user, '風呂・温泉・サウナ・休憩');

    expect(screen.getByText('計算済みの実質月額').parentElement).toHaveTextContent('8,600円');
    await answerBurden(user);
    await user.click(screen.getByRole('button', { name: '診断結果を見る' }));

    expect(await screen.findByRole('heading', { name: 'ジム会費の診断結果' })).toHaveFocus();
    expect(screen.getByRole('heading', { name: '今の会費を続ける根拠があります' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '結論を支える根拠' }).parentElement).toHaveTextContent('風呂・温泉・サウナ・休憩');
    expect(screen.getByRole('heading', { name: '館内利用1時間あたり' }).parentElement).toHaveTextContent('1,433円');
  });

  it('最重要1件と追加2件だけを選び、各項目に期待の質問を1つだけ出す', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.click(screen.getByRole('radio', { name: 'トレーニング設備・フリーウェイト' }));
    await user.click(screen.getByRole('checkbox', { name: 'プール・水中運動' }));
    await user.click(screen.getByRole('checkbox', { name: '風呂・温泉・サウナ・休憩' }));

    expect(screen.getAllByRole('group', { name: '期待していた使い方や内容に対して、どうでしたか' })).toHaveLength(3);
    expect(screen.getByText('追加で選択中：2／2件')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: '指導・フォーム確認' })).toBeDisabled();
    expect(document.body).not.toHaveTextContent('どの程度使いましたか');
    expect(document.body).not.toHaveTextContent('来月また選ぶ');
  });

  it('最重要項目を選び直しても補助を自動選択せず、明示選択数だけで上限を制御する', async () => {
    const user = userEvent.setup();
    render(<Calculator />);
    const primaryGroup = screen.getByRole('group', { name: '最も重要だったものを1つ選んでください' });

    await user.click(within(primaryGroup).getByRole('radio', { name: 'トレーニング設備・フリーウェイト' }));
    await user.keyboard('{ArrowRight}');

    expect(within(primaryGroup).getByRole('radio', { name: 'スタジオ・プログラム' })).toBeChecked();
    expect(screen.getByText('追加で選択中：0／2件')).toBeInTheDocument();
    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox).not.toBeChecked();
      expect(checkbox).not.toBeDisabled();
    }

    await user.keyboard('{ArrowRight}');

    expect(within(primaryGroup).getByRole('radio', { name: 'プール・水中運動' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'トレーニング設備・フリーウェイト' })).not.toBeChecked();
    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox).not.toBeChecked();
      expect(checkbox).not.toBeDisabled();
    }

    await user.click(screen.getByRole('checkbox', { name: '風呂・温泉・サウナ・休憩' }));
    await user.click(screen.getByRole('checkbox', { name: '指導・フォーム確認' }));
    expect(screen.getByText('追加で選択中：2／2件')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: '友人・コミュニティ' })).toBeDisabled();

    await user.click(within(primaryGroup).getByRole('radio', { name: '風呂・温泉・サウナ・休憩' }));

    expect(screen.getByText('追加で選択中：1／2件')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: '指導・フォーム確認' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'トレーニング設備・フリーウェイト' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'プール・水中運動' })).not.toBeChecked();
    for (const checkbox of screen.getAllByRole('checkbox')) expect(checkbox).not.toBeDisabled();
  });

  it('その他の具体名と期待が未回答なら最初の該当入力へフォーカスする', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await fillBase(user);
    await user.click(screen.getByRole('radio', { name: 'その他' }));
    await answerBurden(user);
    await user.click(screen.getByRole('button', { name: '診断結果を見る' }));

    expect(screen.getByRole('alert')).toHaveTextContent('その他の内容を1～80文字で入力してください');
    expect(screen.getByRole('alert')).toHaveTextContent('この利用が期待どおりだったか選んでください');
    await waitFor(() => expect(screen.getByRole('textbox', { name: '具体的な利用' })).toHaveFocus());
  });

  it('重要な利用が未選択なら要約リンクとフォーカス先を同じグループにする', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await fillBase(user);
    await answerBurden(user);
    await user.click(screen.getByRole('button', { name: '診断結果を見る' }));

    const group = screen.getByRole('group', { name: '最も重要だったものを1つ選んでください' });
    expect(screen.getByRole('alert').querySelector('a[href="#primary-value"]')).toBeInTheDocument();
    await waitFor(() => expect(group).toHaveFocus());
  });

  it('料金区分と「あり」の金額が揃うまで実質月額を表示しない', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.type(screen.getByRole('textbox', { name: /^基本月会費/ }), '8000');
    expect(screen.getByText('実質月額はまだ計算できません').parentElement).toHaveTextContent('毎月必須の追加費用の有無');
    expect(screen.queryByText('計算済みの実質月額')).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: '実際に支払う会費は、生活費に対して無理なく払えますか' })).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('上の月額は');

    await user.click(within(screen.getByRole('group', { name: '毎月必須の追加費用' })).getByRole('radio', { name: 'あり' }));
    await user.click(within(screen.getByRole('group', { name: '年会費・更新料など' })).getByRole('radio', { name: 'あり' }));
    expect(screen.getByText('実質月額はまだ計算できません').parentElement).toHaveTextContent('毎月必須の追加費用の金額');
    expect(screen.getByText('実質月額はまだ計算できません').parentElement).toHaveTextContent('年会費・更新料などの金額');

    await user.type(screen.getByRole('textbox', { name: /^毎月必須の追加費用/ }), '300');
    await user.type(screen.getByRole('textbox', { name: /^年会費・更新料など/ }), '1200');
    expect(screen.getByText('計算済みの実質月額').parentElement).toHaveTextContent('8,400円');

    await user.clear(screen.getByRole('textbox', { name: /^年会費・更新料など/ }));
    expect(screen.getByText('実質月額はまだ計算できません').parentElement).toHaveTextContent('年会費・更新料などの金額');
    expect(screen.queryByText('計算済みの実質月額')).not.toBeInTheDocument();
  });

  it('回数不明でも結論と回数別参考額を表示する', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await fillBase(user, 'unknown');
    await selectPrimary(user, '立地・営業時間・通いやすさ');
    await answerBurden(user);
    await user.click(screen.getByRole('button', { name: '診断結果を見る' }));

    expect(await screen.findByRole('heading', { name: '今の会費を続ける根拠があります' })).toBeInTheDocument();
    const perVisit = screen.getByRole('heading', { name: '来館1回あたり' }).parentElement;
    expect(perVisit).toHaveTextContent('来館回数が分からないため');
    for (const count of [1, 2, 4, 8, 12]) expect(perVisit).toHaveTextContent(`月${count}回なら`);
  });

  it('来館0回では価値質問を省略し、以前の価値回答を判定へ送らない', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await fillBase(user);
    await selectPrimary(user, 'トレーニング設備・フリーウェイト');
    await user.clear(screen.getByRole('textbox', { name: /^来館回数/ }));
    await user.type(screen.getByRole('textbox', { name: /^来館回数/ }), '0');

    expect(screen.queryByRole('group', { name: '最も重要だったものを1つ選んでください' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '最近の利用' }).parentElement?.parentElement).toHaveTextContent('来館0回のため');
    await answerBurden(user, '少し負担に感じる');
    await user.click(screen.getByRole('button', { name: '診断結果を見る' }));

    expect(await screen.findByRole('heading', { name: '今の会費は見直し候補です' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '見直す根拠' }).parentElement).toHaveTextContent('会費を払う主な理由になる利用は特にない');
  });

  it.each(['00', '００'])('来館回数「%s」も0回として価値質問を省略する', (exactVisits) => {
    render(<Calculator initialRaw={{
      ...createEmptyRawAssessmentInput(),
      visitMode: 'exact',
      exactVisits,
      values: [{ id: 'training', customLabel: '', role: 'primary', status: 'fulfilled' }],
    }} />);

    expect(screen.queryByRole('group', { name: '最も重要だったものを1つ選んでください' })).not.toBeInTheDocument();
    expect(screen.getByText(/来館0回のため、重要だった利用の質問は省略/)).toBeInTheDocument();
  });

  it('結果から入力へ戻っても回答を保持する', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await fillBase(user);
    await selectPrimary(user, 'トレーニング設備・フリーウェイト');
    await answerBurden(user);
    await user.click(screen.getByRole('button', { name: '診断結果を見る' }));
    await user.click(await screen.findByRole('button', { name: '入力を修正' }));

    expect(screen.getByRole('textbox', { name: /^基本月会費/ })).toHaveValue('8000');
    expect(screen.getByRole('radio', { name: 'トレーニング設備・フリーウェイト' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '期待どおり得られた' })).toBeChecked();
  });

  it('不正な館内利用時間方式をエラー文とラジオグループへ関連付ける', async () => {
    const user = userEvent.setup();
    const invalidRaw = { ...createEmptyRawAssessmentInput(), timeMode: 'invalid' as never };
    render(<Calculator initialRaw={invalidRaw} />);

    await user.click(screen.getByRole('button', { name: '診断結果を見る' }));

    const group = screen.getByRole('group', { name: /館内利用時間も料金表示に使いますか/ });
    expect(group).toHaveAttribute('aria-describedby', 'time-mode-error');
    expect(group).toHaveAttribute('aria-invalid', 'true');
    expect(within(group).getByRole('radio', { name: '入力しない' })).toHaveAttribute('aria-describedby', 'time-mode-error');
  });
});
