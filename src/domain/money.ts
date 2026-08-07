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
  return Math.floor((units + UNITS_PER_YEN / 2) / UNITS_PER_YEN);
}

export function perVisitRoundedYen(totalUnits: number, visits: number): number | null {
  assertNonNegativeSafeInteger(totalUnits, 'totalUnits');
  assertNonNegativeSafeInteger(visits, 'visits');
  if (visits === 0) return null;

  const denominator = UNITS_PER_YEN * visits;
  return Math.floor((totalUnits + denominator / 2) / denominator);
}
