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

describe('GFR-G1R5 画面構成', () => {
  it('ホームを診断から独立させ、料金と複数の利用価値を確認できることを示す', () => {
    renderAt('/');

    expect(screen.getByRole('heading', {
      level: 1,
      name: '回数だけでは見えない、あなたが残したい価値まで確認',
    })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'この診断で分かること' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '準備するもの' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ジム会費を診断する' })).toHaveAttribute('href', '/check');
    expect(screen.getByText(/実質月額と、分かる範囲の1回・1時間あたり料金/)).toBeInTheDocument();
    expect(screen.getByText(/風呂・サウナ、交流、通いやすさも同じ価値/)).toBeInTheDocument();
    expect(screen.getByText(/入力はブラウザ内だけで計算し、外部へ送りません/)).toBeInTheDocument();
    expect(document.querySelector('form')).not.toBeInTheDocument();
  });

  it('診断ページで短い概要の後に入力フォームを主役として置く', () => {
    renderAt('/check');

    expect(screen.getByRole('heading', { level: 1, name: '今の会費を払って続ける理由を確認' })).toBeInTheDocument();
    expect(document.querySelector('form')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '計算方法を確認する' })).toHaveAttribute('href', '/methodology');
  });

  it('計算方法ページで料金式、利用価値、透明な判断規則と限界を説明する', () => {
    renderAt('/methodology');

    expect(screen.getByRole('heading', { level: 1, name: '計算方法と判断の限界' })).toBeInTheDocument();
    expect(screen.getByText(/実質月額 C ＝/)).toBeInTheDocument();
    expect(screen.getByText(/来館1回あたり ＝ C ÷ 来館回数/)).toBeInTheDocument();
    expect(screen.getByText(/館内利用1時間あたり ＝ C ÷ 月の館内利用時間/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '複数の利用価値を、項目ごとに確認' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '結論を決める規則' })).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('目的活動回数');
    expect(document.body).not.toHaveTextContent('内容完了率');
  });

  it('未定義URLをホームへ黙って置き換えず404として扱う', () => {
    renderAt('/unknown');

    expect(screen.getByRole('heading', { level: 1, name: 'ページが見つかりません' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ホームへ戻る' })).toHaveAttribute('href', '/');
  });
});
