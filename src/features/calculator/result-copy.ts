import type { MoneyComparison } from '../../domain/comparison';
import { formatNumber } from '../../shared/format';

export function createAnnualComparisonText(comparison: MoneyComparison): string {
  if (comparison.lowerSide === 'equal') {
    return '入力した条件では、年間予測の料金は同額です。';
  }
  const lowerLabel = comparison.lowerSide === 'current' ? '現在プラン' : '候補';
  return `入力した条件の料金だけなら、${lowerLabel}の方が年間${formatNumber(comparison.differenceYen)}円低い試算です。`;
}

export function createThreeMonthComparisonText(comparison: MoneyComparison): string {
  if (comparison.lowerSide === 'equal') return '直近3か月の料金は同額です。';
  const lowerLabel = comparison.lowerSide === 'current' ? '現在プラン' : '候補';
  return `直近3か月では、${lowerLabel}の方が${formatNumber(comparison.differenceYen)}円低い試算です。`;
}
