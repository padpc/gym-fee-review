import { cleanup, render, screen, within } from '@testing-library/react';
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

describe('GFR-G1R9 画面構成', () => {
  it('主要導線を上部に置き、診断は目安で最終判断は利用者が行うと示す', () => {
    renderAt('/check');

    const brandLink = screen.getByRole('link', { name: 'ジム会費、元とれてる？' });
    expect(brandLink).toHaveAttribute('href', '/');
    expect(brandLink).not.toHaveAttribute('aria-current');
    const brandMark = brandLink.querySelector('.site-name__mark');
    expect(brandMark).toHaveAttribute('aria-hidden', 'true');
    expect(brandMark).toHaveAttribute('src', '/favicon.svg');
    const headerNavigation = screen.getByRole('navigation', { name: '主要ナビゲーション' });
    expect(within(headerNavigation).getByRole('link', { name: 'ホーム' })).toHaveAttribute('href', '/');
    expect(within(headerNavigation).getByRole('link', { name: '診断する' })).toHaveAttribute('aria-current', 'page');
    expect(within(headerNavigation).getByRole('link', { name: '計算方法' })).toHaveAttribute('href', '/methodology');
    const footerNavigation = screen.getByRole('navigation', { name: 'フッターナビゲーション' });
    expect(within(footerNavigation).getByRole('link', { name: '診断する' })).toHaveAttribute('aria-current', 'page');
    expect(document.body).toHaveTextContent('この診断は、入力した内容を整理するための目安です。継続・休会・変更・退会の最終判断はご自身で行ってください。');
    expect(document.body).not.toHaveTextContent('契約を変える前に、契約先の最新料金と条件を公式情報で確認してください。');
    expect(document.body).not.toHaveTextContent('入力は保存・送信しません。活動や時間を勝手な金額へ換算せず、不透明な総合点を出しません。');
    expect(screen.queryByRole('link', { name: /この診断への意見を送る/ })).not.toBeInTheDocument();
  });

  it('ホームに通常の概要を置き、質問数の訴求とFAQを置かない', () => {
    renderAt('/');

    expect(screen.getByRole('heading', { level: 1, name: '今の会費に、払い続ける理由があるか整理' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'この診断で見ること' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '料金・利用・期待・負担を、一つの結論へまとめます' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '料金明細と来館記録を確認してから始めると、より正確です' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '結論と診断後の確認' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ジム会費を診断する' })).toHaveAttribute('href', '/check');
    expect(document.querySelector('.home-panel--overview')).toBeInTheDocument();
    expect(document.querySelector('.home-panel--prepare')).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('最初にすることを一つ示します');
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
    expect(screen.getByText(/「あり」の金額がそろってから実質月額を確定します/)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('入力済み料金の小計');
    const pageIndex = screen.getByRole('navigation', { name: 'このページの目次' });
    expect(within(pageIndex).getByText('ページ内目次')).toBeInTheDocument();
    expect(within(pageIndex).getByRole('link', { name: '料金の計算' })).toHaveAttribute('href', '#monthly-cost');
    expect(within(pageIndex).getByRole('link', { name: '結論の分かれ方' })).toHaveAttribute('href', '#decision');
    expect(screen.getByRole('heading', { name: '3つの料金を月額へそろえる' })).toBeInTheDocument();
    expect(screen.getByLabelText('8,000円 足す 500円 足す 6,000円 割る 12 は 9,000円')).toBeInTheDocument();
    expect(screen.getByText('1,125円')).toBeInTheDocument();
    expect(screen.getByText('750円')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '金額だけでは見えない利用価値' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'どういうときに続ける根拠があるか' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '「元が取れた」を金額だけでは決めません' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '今の会費を続ける根拠があります' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '今の会費は見直し候補です' })).toBeInTheDocument();
    expect(document.querySelectorAll('.outcome-guide__item')).toHaveLength(4);
    expect(screen.queryByRole('link', { name: 'ジム会費を診断する' })).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('規則1');
  });

  it('未定義URLをホームへ黙って置き換えず404として扱う', () => {
    renderAt('/unknown');
    expect(screen.getByRole('heading', { level: 1, name: 'ページが見つかりません' })).toBeInTheDocument();
  });
});
