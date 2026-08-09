import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('GFR-G1R2 初期画面', () => {
  it('小さいヘッダーの後に入力を主役として置き、旧方式を表示しない', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: '今のジム会費に、納得できていますか？' })).toBeInTheDocument();
    const calculator = screen.getByRole('region', { name: '料金と利用価値を入力' });
    const notice = screen.getByRole('complementary', { name: '入力と判定について' });
    expect(calculator.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('textbox', { name: /^月会費/ })).toBeInTheDocument();
    for (const oldText of ['5つの確認方法', '1時間あたり料金で見る', '使った設備・プログラムで見る', 'まとめて見る', '都度払い', '直近3か月']) {
      expect(document.body).not.toHaveTextContent(oldText);
    }
  });
});
