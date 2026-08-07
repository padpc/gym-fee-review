import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('GFR-S01 初期画面', () => {
  it('承認済みH1を表示し、注意と計算機のDOM順を視覚順と一致させる', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'ジム会費、元とれてる？' })).toBeInTheDocument();
    const calculator = screen.getByRole('region', { name: '自分の料金で確かめる' });
    const notice = screen.getByRole('complementary', { name: '料金だけの試算です' });
    expect(calculator.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
