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

async function selectExactCount(user: User, legend: string, count: string) {
  const group = screen.getByRole('group', { name: legend });
  await user.click(within(group).getByRole('radio', { name: '回数が分かる' }));
  await user.type(screen.getByRole('textbox', { name: new RegExp(`^${legend}`) }), count);
}

async function fillCore(user: User, options: {
  monthlyFee?: string;
  visits?: string;
  performed?: string;
  completed?: string;
  contentFit?: string;
  evidence?: string;
  continuation?: string;
  safety?: string;
  barrier?: string;
  services?: string[];
} = {}) {
  await user.type(screen.getByRole('textbox', { name: /^月会費/ }), options.monthlyFee ?? '8000');
  await user.click(screen.getByRole('radio', { name: '月会費以外はない' }));
  await selectExactVisits(user, options.visits ?? '6');
  await user.click(screen.getByRole('radio', { name: '筋力を高める' }));
  await user.click(screen.getByRole('radio', { name: '筋力トレーニング' }));
  await selectExactCount(user, '目的の活動を行った来館回数 S', options.performed ?? '6');
  await selectExactCount(user, '予定した主な内容を完了した回数 F', options.completed ?? '6');
  await user.click(screen.getByRole('radio', { name: options.contentFit ?? '合っていた' }));
  await user.click(screen.getByRole('radio', { name: options.evidence ?? '良い方向' }));
  for (const service of options.services ?? ['特になし']) {
    await user.click(screen.getByRole('checkbox', { name: service }));
  }
  await user.click(screen.getByRole('radio', { name: options.continuation ?? '選びたい' }));
  await user.click(screen.getByRole('radio', { name: options.safety ?? 'なかった' }));
  if (options.barrier) {
    await user.click(within(screen.getByRole('group', { name: '利用・完了・満足を妨げた主な要因' })).getByRole('radio', { name: options.barrier }));
  }
}

async function fillKnownAlternative(user: User, servicesAnswer = '満たす') {
  const availability = screen.getByRole('group', { name: '公式料金を確認した候補も比較しますか' });
  await user.click(within(availability).getByRole('radio', { name: '候補1件を比較する' }));
  await user.type(screen.getByRole('textbox', { name: /^代替プラン名/ }), '比較プラン');
  await user.click(within(screen.getByRole('group', { name: '料金の種類' })).getByRole('radio', { name: '都度利用' }));
  await user.type(screen.getByRole('textbox', { name: /^代替プランの1回料金/ }), '1800');
  await user.click(screen.getByRole('radio', { name: '表示料金以外はない' }));

  for (const [groupName, answer] of [
    ['主な活動と実際に使った付帯サービス', servicesAnswer],
    ['必要な利用時間帯', '満たす'],
    ['必要な店舗範囲', '満たす'],
  ] as const) {
    await user.click(within(screen.getByRole('group', { name: groupName })).getByRole('radio', { name: answer }));
  }
  await user.click(screen.getByRole('checkbox', { name: '通常料金、利用条件、必須費用を公式ページまたは契約書で確認した' }));
}

async function submit(user: User) {
  await user.click(screen.getByRole('button', { name: '診断結果を見る' }));
}

describe('GFR-G1R4 Calculator', () => {
  it('基本診断でC・V/S/F・実運動時間・質・実利用サービス・反実仮想を表示する', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.type(screen.getByRole('textbox', { name: /^月会費/ }), '8000');
    await user.click(screen.getByRole('radio', { name: '追加費用・年会費がある' }));
    await user.type(screen.getByRole('textbox', { name: /^現在の利用に毎月必要な追加費用/ }), '300');
    await user.type(screen.getByRole('textbox', { name: /^年会費等/ }), '3600');
    await selectExactVisits(user, '6');
    await user.click(screen.getByRole('radio', { name: '月の合計実運動時間' }));
    await user.type(screen.getByRole('textbox', { name: /^月の合計実運動時間/ }), '9');
    await user.click(screen.getByRole('radio', { name: '筋力を高める' }));
    await user.click(screen.getByRole('radio', { name: '筋力トレーニング' }));
    await selectExactCount(user, '目的の活動を行った来館回数 S', '6');
    await selectExactCount(user, '予定した主な内容を完了した回数 F', '4');
    await user.click(screen.getByRole('radio', { name: '合っていた' }));
    await user.click(screen.getByRole('radio', { name: '良い方向' }));
    await user.click(screen.getByRole('checkbox', { name: '専門設備' }));
    await user.click(screen.getByRole('checkbox', { name: '温浴・サウナ' }));
    await user.click(screen.getByRole('radio', { name: '選びたい' }));
    await user.click(screen.getByRole('radio', { name: 'なかった' }));
    await user.click(within(screen.getByRole('group', { name: '利用・完了・満足を妨げた主な要因' })).getByRole('radio', { name: '必要な設備を使えなかった' }));
    await submit(user);

    expect(await screen.findByRole('heading', { name: '会費の活用状況' })).toHaveFocus();
    const overview = screen.getByRole('heading', { name: '目的活動は行えているが、内容を見直す' }).closest('.result-overview');
    expect(overview).toHaveTextContent('目的活動 S：6回');
    expect(overview).toHaveTextContent('内容完了 F：4回');
    expect(overview).toHaveTextContent('次の一行動');
    expect(overview).toHaveTextContent('結論が変わる条件');
    expect(screen.getByRole('heading', { name: '実質月額 8,600円' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '実運動1時間あたり' }).parentElement).toHaveTextContent('956円／時間');
    expect(screen.getByText('内容完了率 F÷S').parentElement).toHaveTextContent('66.7%');
    expect(screen.getByRole('heading', { name: '同じ活動回数で、始めた内容を完了できた場合' }).parentElement).toHaveTextContent('1,433円／完了');
    expect(screen.getByText('専門設備')).toBeInTheDocument();
    expect(screen.getByText('温浴・サウナ')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '比較資料不足' }).closest('.comparison-result')).toHaveTextContent('料金の得・損は確定していません');
  });

  it('任意の代替料金をSで比較し、修正時に入力を保持する', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await fillCore(user);
    await fillKnownAlternative(user);
    await submit(user);

    expect(await screen.findByRole('heading', { name: '会費の活用状況' })).toHaveFocus();
    expect(screen.getByRole('heading', { name: '現在プランが同額以下' }).closest('.comparison-result')).toHaveTextContent('現在が月2,800円・年33,600円低い');

    await user.click(screen.getByRole('button', { name: '入力を修正' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: '最近1か月の費用と使い方を入力' })).toHaveFocus());
    expect(screen.getByRole('textbox', { name: /^月会費/ })).toHaveValue('8000');
    expect(screen.getByRole('textbox', { name: /^目的の活動を行った来館回数 S/ })).toHaveValue('6');
    expect(screen.getByRole('radio', { name: '候補1件を比較する' })).toBeChecked();
    expect(screen.getByRole('textbox', { name: /^代替プラン名/ })).toHaveValue('比較プラン');
  });

  it('阻害要因が不要になった時点で非表示にして値も消す', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await fillCore(user, {
      performed: '4',
      completed: '2',
      contentFit: '一部合っていた',
      evidence: 'ほぼ変わらない',
      continuation: '迷う',
      barrier: '混雑していた',
    });
    expect(screen.getByRole('group', { name: '利用・完了・満足を妨げた主な要因' })).toBeInTheDocument();

    const completed = screen.getByRole('textbox', { name: /^予定した主な内容を完了した回数 F/ });
    await user.clear(completed);
    await user.type(completed, '4');
    await user.click(screen.getByRole('radio', { name: '合っていた' }));
    await user.click(screen.getByRole('radio', { name: '良い方向' }));
    await user.click(screen.getByRole('radio', { name: '選びたい' }));
    expect(screen.queryByRole('group', { name: '利用・完了・満足を妨げた主な要因' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: '一部合っていた' }));
    const barrierGroup = screen.getByRole('group', { name: '利用・完了・満足を妨げた主な要因' });
    expect(within(barrierGroup).getByRole('radio', { name: '混雑していた' })).not.toBeChecked();
    await user.click(screen.getByRole('radio', { name: '合っていた' }));
    await submit(user);
    expect(await screen.findByRole('heading', { name: '今のプランを継続候補にする' })).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('主な阻害要因：混雑していた');
  });

  it('付帯サービスの「特になし」を他の選択と排他にする', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    const classes = screen.getByRole('checkbox', { name: 'クラス' });
    const pool = screen.getByRole('checkbox', { name: 'プール' });
    const none = screen.getByRole('checkbox', { name: '特になし' });
    await user.click(classes);
    await user.click(pool);
    expect(classes).toBeChecked();
    expect(pool).toBeChecked();

    await user.click(none);
    expect(none).toBeChecked();
    expect(classes).not.toBeChecked();
    expect(pool).not.toBeChecked();

    await user.click(classes);
    expect(classes).toBeChecked();
    expect(none).not.toBeChecked();
  });

  it('活動変更で完了例・品質質問を切り替え、活動固有回答を引き継がない', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.click(screen.getByRole('radio', { name: '筋力トレーニング' }));
    expect(screen.getByText('予定した主な種目とセット・回数を終えた')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '種目、負荷、フォームは目的に合っていましたか' })).toBeInTheDocument();
    await selectExactCount(user, '目的の活動を行った来館回数 S', '3');
    await user.click(screen.getByRole('radio', { name: '合っていた' }));

    await user.click(screen.getByRole('radio', { name: '有酸素運動' }));
    expect(screen.getByText('予定した時間または距離を終えた')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '運動の種類、強度、時間は目的に合っていましたか' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /^目的の活動を行った来館回数 S/ })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '合っていた' })).not.toBeChecked();
  });

  it('目的変更ではS/Fを保持し、目的に対する内容適合と変化だけを再回答にする', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.click(screen.getByRole('radio', { name: '筋力を高める' }));
    await user.click(screen.getByRole('radio', { name: '筋力トレーニング' }));
    await selectExactCount(user, '目的の活動を行った来館回数 S', '4');
    await selectExactCount(user, '予定した主な内容を完了した回数 F', '4');
    await user.click(screen.getByRole('radio', { name: '合っていた' }));
    await user.click(screen.getByRole('radio', { name: '良い方向' }));

    await user.click(screen.getByRole('radio', { name: '健康維持・運動習慣' }));
    expect(screen.getByRole('textbox', { name: /^目的の活動を行った来館回数 S/ })).toHaveValue('4');
    expect(screen.getByRole('textbox', { name: /^予定した主な内容を完了した回数 F/ })).toHaveValue('4');
    expect(screen.getByRole('radio', { name: '合っていた' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: '良い方向' })).not.toBeChecked();
    expect(screen.getByText(/運動習慣、体調の実感、継続できた週/)).toBeInTheDocument();
  });

  it('安全上の懸念がある場合は阻害要因を求めず、安全確認を料金判断より優先する', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await fillCore(user, {
      performed: '4',
      completed: '2',
      contentFit: '合っていなかった',
      evidence: '望んだ方向と逆',
      continuation: '選ばない',
      safety: 'あった',
    });
    expect(screen.queryByRole('group', { name: '利用・完了・満足を妨げた主な要因' })).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('医療機関等へ確認');
    await submit(user);

    const overview = await screen.findByRole('heading', { name: '安全確認を優先する' });
    expect(overview.closest('.result-overview')).toHaveTextContent('運動を中止し、再開・増量の前に医療機関等へ確認する');
  });

  it('FがSを超える入力と、SがVを超える入力をそれぞれ拒否する', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await fillCore(user, { visits: '4', performed: '3', completed: '4' });
    await submit(user);
    expect(screen.getByRole('alert')).toHaveTextContent('内容完了回数Fは、目的活動回数S以下');
    await waitFor(() => expect(screen.getByRole('textbox', { name: /^予定した主な内容を完了した回数 F/ })).toHaveFocus());

    const completed = screen.getByRole('textbox', { name: /^予定した主な内容を完了した回数 F/ });
    const performed = screen.getByRole('textbox', { name: /^目的の活動を行った来館回数 S/ });
    await user.clear(completed);
    await user.type(completed, '3');
    await user.clear(performed);
    await user.type(performed, '5');
    await user.click(within(screen.getByRole('group', { name: '利用・完了・満足を妨げた主な要因' })).getByRole('radio', { name: '特にない' }));
    await submit(user);
    expect(screen.getByRole('alert')).toHaveTextContent('目的活動回数Sは、来館回数の上限4回以下');
    await waitFor(() => expect(performed).toHaveFocus());
  });
});
