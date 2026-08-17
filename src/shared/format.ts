const numberFormatter = new Intl.NumberFormat('ja-JP');

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatYen(value: number): string {
  return `${formatNumber(value)}円`;
}
