import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Calculator } from './Calculator';

type User = ReturnType<typeof userEvent.setup>;

async function selectExactVisits(user: User, visits: string) {
  const group = screen.getByRole('group', { name: '最近の典型的な1か月の来館回数' });
  await user.click(within(group).getByRole('radio', { name: '回数が分かる' }));
  await user.type(screen.getByRole('textbox', { name: /^来館回数/ }), visits);
}

async function selectPurposeCounts(
  user: User,
  plannedLegend: string,
  achievedLegend: string,
  planned: string,
  achieved: string,
) {
  const plannedGroup = screen.getByRole('group', { name: plannedLegend });
  await user.click(within(plannedGroup).getByRole('radio', { name: '回数が分かる' }));
  await user.type(screen.getByRole('textbox', { name: new RegExp(`^${plannedLegend}`) }), planned);

  const achievedGroup = screen.getByRole('group', { name: achievedLegend });
  await user.click(within(achievedGroup).getByRole('radio', { name: '回数が分かる' }));
  await user.type(screen.getByRole('textbox', { name: new RegExp(`^${achievedLegend}`) }), achieved);
}

async function fillCoreExact(user: User, options: {
  monthlyFee?: string;
  visits?: string;
  planned?: string;
  achieved?: string;
  purpose?: string;
  evidence?: string;
  barrier?: string;
} = {}) {
  await user.type(screen.getByRole('textbox', { name: /^月会費/ }), options.monthlyFee ?? '8000');
  await user.click(screen.getByRole('radio', { name: '月会費以外はない' }));
  await selectExactVisits(user, options.visits ?? '6');
  await user.click(screen.getByRole('radio', { name: options.purpose ?? '筋力を高める' }));
  await selectPurposeCounts(
    user,
    '予定した筋トレの来館回数',
    '筋トレを完了できた来館回数',
    options.planned ?? '8',
    options.achieved ?? '6',
  );
  await user.click(screen.getByRole('radio', { name: options.evidence ?? '目的に沿う良い変化・利用があった' }));
  await user.click(screen.getByRole('radio', { name: options.barrier ?? '特にない' }));
}

async function fillKnownAlternative(user: User, options: {
  kind?: 'monthly' | 'per-visit';
  amount?: string;
  equipment?: string;
  hours?: string;
  location?: string;
} = {}) {
  const availability = screen.getByRole('group', { name: '公式料金が分かる候補はありますか' });
  await user.click(within(availability).getByRole('radio', { name: '公式料金が分かる' }));
  await user.type(screen.getByRole('textbox', { name: /^代替プラン名/ }), '比較プラン');

  const kindGroup = screen.getByRole('group', { name: '料金の種類' });
  const kind = options.kind ?? 'per-visit';
  await user.click(within(kindGroup).getByRole('radio', { name: kind === 'per-visit' ? '都度利用' : '月額プラン' }));
  await user.type(
    screen.getByRole('textbox', { name: kind === 'per-visit' ? /^代替プランの1回料金/ : /^代替プランの月会費/ }),
    options.amount ?? (kind === 'per-visit' ? '1800' : '6000'),
  );
  await user.click(screen.getByRole('radio', { name: '表示料金以外はない' }));

  for (const [groupName, answer] of [
    ['必要な設備・サービス', options.equipment ?? '満たす'],
    ['必要な利用回数・時間帯', options.hours ?? '満たす'],
    ['必要な店舗範囲', options.location ?? '満たす'],
  ] as const) {
    await user.click(within(screen.getByRole('group', { name: groupName })).getByRole('radio', { name: answer }));
  }
  await user.click(screen.getByRole('checkbox', { name: '通常料金、利用条件、必須費用を公式ページまたは契約書で確認した' }));
}

async function submit(user: User) {
  await user.click(screen.getByRole('button', { name: '活用状況を計算する' }));
}

describe('GFR-G1R3 Calculator', () => {
  it('実質月額・実績・同等な都度利用から根拠付き結果を出し、修正時に入力を保持する', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.type(screen.getByRole('textbox', { name: /^月会費/ }), '8000');
    await user.click(screen.getByRole('radio', { name: '追加費用・年会費がある' }));
    await user.type(screen.getByRole('textbox', { name: /^現在の利用に毎月必要な追加費用/ }), '300');
    await user.type(screen.getByRole('textbox', { name: /^年会費等/ }), '3600');
    await selectExactVisits(user, '6');
    await user.click(screen.getByRole('radio', { name: '月の合計時間' }));
    await user.type(screen.getByRole('textbox', { name: /^月の合計滞在時間/ }), '9');
    await user.click(screen.getByRole('radio', { name: '筋力を高める' }));
    await selectPurposeCounts(user, '予定した筋トレの来館回数', '筋トレを完了できた来館回数', '8', '6');
    await user.click(screen.getByRole('radio', { name: '目的に沿う良い変化・利用があった' }));
    await user.click(screen.getByRole('radio', { name: '特にない' }));
    await fillKnownAlternative(user);
    await submit(user);

    expect(await screen.findByRole('heading', { name: '会費の活用状況' })).toHaveFocus();
    expect(screen.getByRole('heading', { name: '実質月額 8,600円' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '利用計画達成率' }).parentElement).toHaveTextContent('75%');
    expect(screen.getByRole('heading', { name: '利用計画達成率' }).parentElement).toHaveTextContent('予定までは、あと2回');
    expect(screen.getByRole('heading', { name: '1回あたり料金' }).parentElement).toHaveTextContent('1,433円／回');
    expect(screen.getByRole('heading', { name: '1時間あたり料金' }).parentElement).toHaveTextContent('956円／時間');
    const comparison = screen.getByRole('heading', { name: '現在プランが同額以下' }).closest('.comparison-result');
    expect(comparison).toHaveTextContent('125.6%');
    expect(comparison).toHaveTextContent('現在が月2,200円・年26,400円低い');
    expect(screen.getByRole('heading', { name: '利用計画と実行方法を1か月だけ見直して再確認する' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '入力を修正' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: '今の費用と使い方を入力' })).toHaveFocus());
    expect(screen.getByRole('textbox', { name: /^月会費/ })).toHaveValue('8000');
    expect(screen.getByRole('textbox', { name: /^来館回数/ })).toHaveValue('6');
    expect(screen.getByRole('radio', { name: '筋力を高める' })).toBeChecked();
  });

  it('目的を変えると質問文が変わり、目的別の回数と実感をリセットする', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.type(screen.getByRole('textbox', { name: /^月会費/ }), '8000');
    await user.click(screen.getByRole('radio', { name: '月会費以外はない' }));
    await selectExactVisits(user, '6');
    await user.click(screen.getByRole('radio', { name: '筋力を高める' }));
    await selectPurposeCounts(user, '予定した筋トレの来館回数', '筋トレを完了できた来館回数', '8', '6');
    await user.click(screen.getByRole('radio', { name: '目的に沿う良い変化・利用があった' }));
    await user.click(screen.getByRole('radio', { name: '特にない' }));

    await user.click(screen.getByRole('radio', { name: '健康維持・運動習慣' }));
    const plannedGroup = screen.getByRole('group', { name: '予定したジム運動の来館日数' });
    const achievedGroup = screen.getByRole('group', { name: 'ジムで運動できた来館日数' });
    expect(within(plannedGroup).getByRole('radio', { name: '回数が分かる' })).not.toBeChecked();
    expect(within(achievedGroup).getByRole('radio', { name: '回数が分かる' })).not.toBeChecked();
    expect(screen.queryByRole('textbox', { name: /^予定したジム運動の来館日数/ })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '目的に沿う良い変化・利用があった' })).not.toBeChecked();

    await selectPurposeCounts(user, '予定したジム運動の来館日数', 'ジムで運動できた来館日数', '8', '6');
    await user.click(screen.getByRole('radio', { name: '目的に沿う良い変化・利用があった' }));

    await submit(user);
    expect(await screen.findByRole('heading', { name: '利用計画達成率' }).then((heading) => heading.parentElement)).toHaveTextContent('75%');
    expect(screen.getByText(/健康維持・運動習慣：目的に沿う良い変化・利用があった/)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('本人の月額上限');
  });

  it('目的変更時に代替の同等性回答と公式確認を引き継がない', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await fillCoreExact(user);
    await fillKnownAlternative(user);
    expect(screen.getByRole('checkbox', { name: '通常料金、利用条件、必須費用を公式ページまたは契約書で確認した' })).toBeChecked();
    expect(within(screen.getByRole('group', { name: '必要な設備・サービス' })).getByRole('radio', { name: '満たす' })).toBeChecked();

    await user.click(screen.getByRole('radio', { name: '健康維持・運動習慣' }));

    expect(screen.getByRole('checkbox', { name: '通常料金、利用条件、必須費用を公式ページまたは契約書で確認した' })).not.toBeChecked();
    expect(within(screen.getByRole('group', { name: '必要な設備・サービス' })).getByRole('radio', { name: '満たす' })).not.toBeChecked();
    expect(within(screen.getByRole('group', { name: '必要な利用回数・時間帯' })).getByRole('radio', { name: '満たす' })).not.toBeChecked();
    expect(within(screen.getByRole('group', { name: '必要な店舗範囲' })).getByRole('radio', { name: '満たす' })).not.toBeChecked();
  });

  it('安い候補でも必要設備を満たさなければ同等・お得と判定しない', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await fillCoreExact(user, { planned: '6', achieved: '6' });
    await fillKnownAlternative(user, { kind: 'monthly', amount: '6000', equipment: '満たさない' });
    await submit(user);

    const comparison = (await screen.findByRole('heading', { name: '料金だけでは同等と判断できない' })).closest('.comparison-result');
    expect(comparison).toHaveTextContent('必要な設備・サービスを満たさないため、料金だけで同等とは扱いません');
    expect(comparison).not.toHaveTextContent('同等の代替が低い');
    expect(comparison).not.toHaveTextContent('現在の実質月額が0円');
  });

  it('代替不明では得・損を断定せず、同額になる都度料金を示す', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await fillCoreExact(user);
    await submit(user);

    const comparison = (await screen.findByRole('heading', { name: '比較資料不足' })).closest('.comparison-result');
    expect(comparison).toHaveTextContent('料金の得・損は確定していません');
    expect(comparison).toHaveTextContent('1,333円／回');
    expect(comparison).toHaveTextContent('現在会費と都度料金が同額になる条件');
  });

  it('0回を除算せず、支払額・0%・契約自体の確認候補を示す', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await fillCoreExact(user, { visits: '0', planned: '8', achieved: '0' });
    await submit(user);

    expect(await screen.findByRole('heading', { name: '会費の活用状況' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '1回あたり料金' }).parentElement).toHaveTextContent('利用0回・支払額8,000円');
    expect(screen.getByRole('heading', { name: '利用計画達成率' }).parentElement).toHaveTextContent('0%');
    expect(screen.getByText(/来館0回かつ目的に使えた来館回数0回/)).toBeInTheDocument();
  });

  it('回数範囲を中央値へ置き換えず、単価と代替料金を範囲で示す', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.type(screen.getByRole('textbox', { name: /^月会費/ }), '8000');
    await user.click(screen.getByRole('radio', { name: '月会費以外はない' }));
    const visitGroup = screen.getByRole('group', { name: '最近の典型的な1か月の来館回数' });
    await user.click(within(visitGroup).getByRole('radio', { name: 'だいたい分かる' }));
    await user.click(screen.getByRole('radio', { name: '週1回前後（月4～6回）' }));
    await user.click(screen.getByRole('radio', { name: '1回の平均時間' }));
    await user.type(screen.getByRole('textbox', { name: /^1回の平均滞在時間/ }), '60');
    await user.click(screen.getByRole('radio', { name: '筋力を高める' }));
    await selectPurposeCounts(user, '予定した筋トレの来館回数', '筋トレを完了できた来館回数', '6', '4');
    await user.click(screen.getByRole('radio', { name: '目的に沿う良い変化・利用があった' }));
    await user.click(screen.getByRole('radio', { name: '特にない' }));
    await fillKnownAlternative(user);
    await submit(user);

    expect(await screen.findByRole('heading', { name: '回数によって変わる' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '1回あたり料金' }).parentElement).toHaveTextContent('1,333～2,000円／回');
    expect(screen.getByRole('heading', { name: '1時間あたり料金' }).parentElement).toHaveTextContent('1,333～2,000円／時間');
    expect(screen.getByRole('heading', { name: '回数によって変わる' }).closest('.comparison-result')).toHaveTextContent('90%～135%');
  });

  it('入力エラーをまとめて先頭へフォーカスし、来館数を超える実績を拒否する', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await submit(user);
    expect(screen.getByRole('alert')).toHaveTextContent('8件の入力を確認してください');
    await waitFor(() => expect(screen.getByRole('textbox', { name: /^月会費/ })).toHaveFocus());

    await user.type(screen.getByRole('textbox', { name: /^月会費/ }), '8000');
    await user.click(screen.getByRole('radio', { name: '月会費以外はない' }));
    await selectExactVisits(user, '4');
    await user.click(screen.getByRole('radio', { name: '筋力を高める' }));
    await selectPurposeCounts(user, '予定した筋トレの来館回数', '筋トレを完了できた来館回数', '8', '5');
    await user.click(screen.getByRole('radio', { name: '目的に沿う良い変化・利用があった' }));
    await user.click(screen.getByRole('radio', { name: '特にない' }));
    await submit(user);

    expect(screen.getByRole('alert')).toHaveTextContent('目的に使えた来館回数は、来館回数の上限4回以下');
    await waitFor(() => expect(screen.getByRole('textbox', { name: /^筋トレを完了できた来館回数/ })).toHaveFocus());
  });
});
