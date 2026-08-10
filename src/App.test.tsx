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

describe('GFR-G1R3 画面構成', () => {
  it('ホームを診断から独立させ、概要・準備物・開始操作を示す', () => {
    renderAt('/');

    expect(screen.getByRole('heading', {
      level: 1,
      name: '今のジム会費を、実際の使い方と変化で確認',
    })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'この診断で分かること' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '準備するもの' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '会費の活用状況を確認する' })).toHaveAttribute('href', '/check');
    expect(screen.getByText(/入力はブラウザ内だけで計算し、外部へ送りません/)).toBeInTheDocument();
    expect(document.querySelector('form')).not.toBeInTheDocument();
  });

  it('診断ページで短い概要の後に入力フォームを主役として置く', () => {
    renderAt('/check');

    expect(screen.getByRole('heading', { level: 1, name: '会費の活用状況を確認' })).toBeInTheDocument();
    expect(document.querySelector('form')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '計算方法を確認する' })).toHaveAttribute('href', '/methodology');
  });

  it('計算方法ページで主要な式と100%の意味、判断の限界を説明する', () => {
    renderAt('/methodology');

    expect(screen.getByRole('heading', { level: 1, name: '計算方法と判断の限界' })).toBeInTheDocument();
    expect(screen.getByText(/実質月額 C ＝/)).toBeInTheDocument();
    expect(screen.getByText(/利用計画達成率 P ＝/)).toBeInTheDocument();
    expect(screen.getByText(/実利用の代替価値率 Q ＝/)).toBeInTheDocument();
    expect(screen.getByText(/料金の得・損や健康効果を含む総合100点ではありません/)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('本人の月額上限');
  });

  it('未定義URLをホームへ黙って置き換えず404として扱う', () => {
    renderAt('/unknown');

    expect(screen.getByRole('heading', { level: 1, name: 'ページが見つかりません' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ホームへ戻る' })).toHaveAttribute('href', '/');
  });
});
