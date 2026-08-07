export interface CompletedMonth {
  key: string;
  label: string;
  relativeLabel: string;
}

const relativeLabels = ['直近1か月', '2か月前', '3か月前'] as const;

export function getCompletedMonths(now: Date = new Date()): CompletedMonth[] {
  return relativeLabels.map((relativeLabel, index) => {
    const month = new Date(now.getFullYear(), now.getMonth() - index - 1, 1);
    const year = month.getFullYear();
    const monthNumber = month.getMonth() + 1;
    return {
      key: `${year}-${String(monthNumber).padStart(2, '0')}`,
      label: `${year}年${monthNumber}月`,
      relativeLabel,
    };
  });
}
