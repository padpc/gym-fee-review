export const UNITS_PER_YEN = 12;

function assertNonNegativeSafeInteger(value: number, name: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative safe integer.`);
  }
}

export function yenToUnits(yen: number): number {
  assertNonNegativeSafeInteger(yen, 'yen');
  return yen * UNITS_PER_YEN;
}

export function unitsToRoundedYen(units: number): number {
  assertNonNegativeSafeInteger(units, 'units');
  return roundRatioHalfUp(units, UNITS_PER_YEN);
}

export function roundRatioHalfUp(numerator: number, denominator: number): number {
  assertNonNegativeSafeInteger(numerator, 'numerator');
  if (!Number.isSafeInteger(denominator) || denominator <= 0) {
    throw new RangeError('denominator must be a positive safe integer.');
  }
  return Math.floor((numerator + denominator / 2) / denominator);
}

export function perVisitRoundedYen(totalUnits: number, visits: number): number | null {
  assertNonNegativeSafeInteger(totalUnits, 'totalUnits');
  assertNonNegativeSafeInteger(visits, 'visits');
  if (visits === 0) return null;

  return roundRatioHalfUp(totalUnits, UNITS_PER_YEN * visits);
}

export function perHourRoundedYen(monthlyUnits: number, totalMinutes: number): number | null {
  assertNonNegativeSafeInteger(monthlyUnits, 'monthlyUnits');
  assertNonNegativeSafeInteger(totalMinutes, 'totalMinutes');
  if (totalMinutes === 0) return null;
  return roundRatioHalfUp(monthlyUnits * 5, totalMinutes);
}
