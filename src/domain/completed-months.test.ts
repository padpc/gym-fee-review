import { describe, expect, it } from 'vitest';
import { getCompletedMonths } from './completed-months';

describe('直近の完了3か月', () => {
  it('現在月を除く3か月を返す', () => {
    expect(getCompletedMonths(new Date(2026, 7, 8))).toEqual([
      { key: '2026-07', label: '2026年7月', relativeLabel: '直近1か月' },
      { key: '2026-06', label: '2026年6月', relativeLabel: '2か月前' },
      { key: '2026-05', label: '2026年5月', relativeLabel: '3か月前' },
    ]);
  });

  it('年をまたぐ', () => {
    expect(getCompletedMonths(new Date(2026, 0, 1)).map((month) => month.key)).toEqual([
      '2025-12',
      '2025-11',
      '2025-10',
    ]);
  });
});
