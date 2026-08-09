import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('GFR-G1R 初期画面', () => {
  it('改訂価値を表示し、旧3か月・都度比較を表示しない', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'ジム会費を、自分の基準で見直す' }),
    ).toBeInTheDocument();
    const calculator = screen.getByRole('region', { name: '会費の見え方を確認する' });
    const notice = screen.getByRole('complementary', { name: '入力と結果について' });
    expect(calculator.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(document.body).not.toHaveTextContent('直近3か月');
    expect(document.body).not.toHaveTextContent('都度払い');
    expect(document.body).not.toHaveTextContent('年間差');
  });
});
