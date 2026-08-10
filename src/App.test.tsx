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

describe('GFR-G1R4 画面構成', () => {
  it('ホームを診断から独立させ、V・S・Fを使う概要・準備物・開始操作を示す', () => {
    renderAt('/');

    expect(screen.getByRole('heading', {
      level: 1,
      name: '会費を、通った回数だけでなく「できた活動」から確認',
    })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'この診断で分かること' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '準備するもの' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ジム会費を診断する' })).toHaveAttribute('href', '/check');
    expect(screen.getByText(/来館・目的活動・内容完了それぞれの1回単価/)).toBeInTheDocument();
    expect(screen.getByText(/入力はブラウザ内だけで計算し、外部へ送りません/)).toBeInTheDocument();
    expect(document.querySelector('form')).not.toBeInTheDocument();
  });

  it('診断ページで短い概要の後に入力フォームを主役として置く', () => {
    renderAt('/check');

    expect(screen.getByRole('heading', { level: 1, name: '会費と使い方を診断' })).toBeInTheDocument();
    expect(document.querySelector('form')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '計算方法を確認する' })).toHaveAttribute('href', '/methodology');
  });

  it('計算方法ページで主要な式と100%の意味、判断の限界を説明する', () => {
    renderAt('/methodology');

    expect(screen.getByRole('heading', { level: 1, name: '計算方法と判断の限界' })).toBeInTheDocument();
    expect(screen.getByText(/実質月額 C ＝/)).toBeInTheDocument();
    expect(screen.getByText(/目的活動1回あたり ＝ C ÷ 目的活動回数 S/)).toBeInTheDocument();
    expect(screen.getByText(/内容完了率 ＝ F ÷ S × 100/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '結論を決める順序' })).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('本人の月額上限');
  });

  it('未定義URLをホームへ黙って置き換えず404として扱う', () => {
    renderAt('/unknown');

    expect(screen.getByRole('heading', { level: 1, name: 'ページが見つかりません' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ホームへ戻る' })).toHaveAttribute('href', '/');
  });
});
