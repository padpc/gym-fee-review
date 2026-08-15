import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import App from './App';

function renderAt(pathname: string) {
  window.history.replaceState({}, '', pathname);
  return render(<App />);
}

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
});

describe('GFR-G1R7 画面構成', () => {
  it('ホームに通常の概要を置き、質問数の訴求とFAQを置かない', () => {
    renderAt('/');

    expect(screen.getByRole('heading', { level: 1, name: '今の会費に、払い続ける理由があるか整理' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'この診断で見ること' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '料金・利用・期待・負担を、一つの結論へまとめます' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '料金明細と来館記録を確認してから始めると、より正確です' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ジム会費を診断する' })).toHaveAttribute('href', '/check');
    expect(document.body).not.toHaveTextContent('細かな記録がなくても始められます');
    expect(document.body).not.toHaveTextContent('4問');
    expect(document.body).not.toHaveTextContent('最近1か月の4つだけ');
    expect(screen.queryByRole('heading', { name: 'よくある質問' })).not.toBeInTheDocument();
    expect(document.querySelector('form')).not.toBeInTheDocument();
  });

  it('診断ページで料金の意味を明確にした入力フォームを主役として置く', () => {
    renderAt('/check');

    expect(screen.getByRole('heading', { level: 1, name: '今の会費を払って続ける理由を確認' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /^基本月会費/ })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '毎月必須の追加費用' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '年会費・更新料など' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '計算方法を確認する' })).toHaveAttribute('href', '/methodology');
  });

  it('方法ページで料金式、重要な利用、代表条件と限界を簡潔に説明する', () => {
    renderAt('/methodology');

    expect(screen.getByRole('heading', { level: 1, name: '計算方法と判断の考え方' })).toBeInTheDocument();
    expect(screen.getByText(/実質月額 C ＝ 基本月会費/)).toBeInTheDocument();
    expect(screen.getByText(/両方の有無と必要な金額がそろうまで実質月額を確定表示しません/)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('入力済み料金の小計');
    expect(screen.getByRole('heading', { name: '会費を払う理由として重要だった利用' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '結論に使う代表的な条件' })).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('規則1');
  });

  it('未定義URLをホームへ黙って置き換えず404として扱う', () => {
    renderAt('/unknown');
    expect(screen.getByRole('heading', { level: 1, name: 'ページが見つかりません' })).toBeInTheDocument();
  });
});
