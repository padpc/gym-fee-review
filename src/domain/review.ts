import { perHourRoundedYen, perVisitRoundedYen, unitsToRoundedYen, yenToUnits } from './money';

export type Criterion = 'per-visit' | 'per-hour' | 'services' | 'continuation' | 'all';
export type VisitMode = 'exact' | 'range' | 'unknown';
export type TimeMode = 'total' | 'average';
export type UsageFrequency = '1-3' | '4-plus' | 'not-countable';

export const criterionOptions: ReadonlyArray<{
  id: Criterion;
  label: string;
  description: string;
}> = [
  { id: 'per-visit', label: '1回あたり料金で見る', description: '先月の実数、概数、回数不明から確認' },
  { id: 'per-hour', label: '1時間あたり料金で見る', description: '合計時間、または平均滞在時間から確認' },
  { id: 'services', label: '使った設備・プログラムで見る', description: '実際の利用と大切なものを分けて整理' },
  { id: 'continuation', label: '続けやすさで見る', description: '料金以外で失いたくない条件を整理' },
  { id: 'all', label: 'まとめて見る', description: '料金・利用サービス・続けやすさを分けて確認' },
];

export const visitBandOptions = [
  { id: 'monthly-1-3', label: '月1～3回', min: 1, max: 3 },
  { id: 'weekly-1', label: '週1回前後（月4～6回）', min: 4, max: 6 },
  { id: 'weekly-2', label: '週2回前後（月7～10回）', min: 7, max: 10 },
  { id: 'weekly-3', label: '週3回前後（月11～14回）', min: 11, max: 14 },
  { id: 'weekly-4', label: '週4回前後（月15～20回）', min: 15, max: 20 },
  { id: 'monthly-21-plus', label: '月21回以上', min: 21, max: null },
] as const;

export type VisitBandId = (typeof visitBandOptions)[number]['id'];

export type VisitKnowledge =
  | { kind: 'exact'; visits: number }
  | { kind: 'bounded'; bandId: VisitBandId; min: number; max: number }
  | { kind: 'at-least'; bandId: 'monthly-21-plus'; min: 21 }
  | { kind: 'unknown' };

export type TimeInput =
  | { kind: 'total'; totalMinutes: number }
  | { kind: 'average'; averageMinutes: number };

export const serviceCatalog = [
  { id: 'machines', label: 'マシン・フリーウエイト' },
  { id: 'classes', label: 'スタジオ・グループレッスン' },
  { id: 'pool', label: 'プール' },
  { id: 'sauna', label: '風呂・サウナ' },
  { id: 'support', label: 'トレーナー・スタッフのサポート' },
  { id: 'multi-location', label: '複数店舗・24時間等の利用可能性' },
  { id: 'amenities', label: 'ロッカー・タオル・水等の付帯サービス' },
  { id: 'other', label: '美容、ゴルフ、ワークスペース等のその他サービス' },
] as const;

export type ServiceId = (typeof serviceCatalog)[number]['id'];
export type UsedServices = Partial<Record<ServiceId, UsageFrequency>>;

export const continuationCatalog = [
  { id: 'nearby', label: '自宅・職場からの近さ' },
  { id: 'opening-hours', label: '使いたい時間に開いている' },
  { id: 'needed-offering', label: '必要な器具・プログラムがある' },
  { id: 'environment', label: '混雑・清潔さ・雰囲気が許容できる' },
  { id: 'people-reservation', label: 'スタッフ・仲間・予約枠が継続理由になっている' },
] as const;

export type ContinuationId = (typeof continuationCatalog)[number]['id'];

export const usageFrequencyLabels: Record<UsageFrequency, string> = {
  '1-3': '1～3回',
  '4-plus': '4回以上',
  'not-countable': '回数では表しにくい',
};

export const unknownVisitScenarios = [0, 1, 2, 4, 6, 8, 10, 12, 16, 20] as const;

export interface FeeValues {
  monthlyFeeYen: number;
  monthlyFixedFeeYen: number;
  annualFeeYen: number;
}

export interface ValidatedReviewInput {
  criterion: Criterion;
  fees: FeeValues;
  visits: VisitKnowledge | null;
  time: TimeInput | null;
  usedServices: UsedServices;
  importantServices: ServiceId[];
  continuation: ContinuationId[];
}

export interface MonthlyEquivalent {
  units: number;
  roundedYen: number;
}

export type PerVisitResult =
  | { kind: 'exact'; visits: number; yenPerVisit: number | null; unusedPaymentYen: number }
  | {
      kind: 'bounded';
      bandId: VisitBandId;
      minVisits: number;
      maxVisits: number;
      minYenPerVisit: number;
      maxYenPerVisit: number;
    }
  | { kind: 'at-least'; bandId: 'monthly-21-plus'; minVisits: 21; maxYenPerVisit: number }
  | {
      kind: 'unknown';
      rows: Array<{ visits: number; yenPerVisit: number | null; unusedPaymentYen: number | null }>;
    };

export type PerHourResult =
  | { kind: 'total'; totalMinutes: number; yenPerHour: number }
  | {
      kind: 'exact';
      visits: number;
      averageMinutes: number;
      totalMinutes: number;
      yenPerHour: number | null;
    }
  | {
      kind: 'bounded';
      bandId: VisitBandId;
      minVisits: number;
      maxVisits: number;
      averageMinutes: number;
      minTotalMinutes: number;
      maxTotalMinutes: number;
      minYenPerHour: number;
      maxYenPerHour: number;
    }
  | {
      kind: 'at-least';
      bandId: 'monthly-21-plus';
      minVisits: 21;
      averageMinutes: number;
      minTotalMinutes: number;
      maxYenPerHour: number;
    }
  | {
      kind: 'unknown';
      averageMinutes: number;
      rows: Array<{ visits: number; totalMinutes: number; yenPerHour: number | null }>;
    };

export interface ServiceReviewItem {
  id: ServiceId;
  label: string;
}

export interface UsedServiceReviewItem extends ServiceReviewItem {
  frequency: UsageFrequency;
  frequencyLabel: string;
}

export interface ServiceReview {
  used: UsedServiceReviewItem[];
  important: ServiceReviewItem[];
  importantButUnused: ServiceReviewItem[];
}

export interface ReviewResult {
  criterion: Criterion;
  monthly: MonthlyEquivalent & { fees: FeeValues };
  visits: VisitKnowledge | null;
  timeInput: TimeInput | null;
  perVisit: PerVisitResult | null;
  perHour: PerHourResult | null;
  services: ServiceReview | null;
  continuation: Array<{ id: ContinuationId; label: string }> | null;
}

export function calculateMonthlyEquivalent(fees: FeeValues): MonthlyEquivalent {
  const units = yenToUnits(fees.monthlyFeeYen + fees.monthlyFixedFeeYen) + fees.annualFeeYen;
  return { units, roundedYen: unitsToRoundedYen(units) };
}

export function calculatePerVisitResult(monthlyUnits: number, visits: VisitKnowledge): PerVisitResult {
  if (visits.kind === 'exact') {
    return {
      kind: 'exact',
      visits: visits.visits,
      yenPerVisit: perVisitRoundedYen(monthlyUnits, visits.visits),
      unusedPaymentYen: unitsToRoundedYen(monthlyUnits),
    };
  }
  if (visits.kind === 'bounded') {
    return {
      kind: 'bounded',
      bandId: visits.bandId,
      minVisits: visits.min,
      maxVisits: visits.max,
      minYenPerVisit: perVisitRoundedYen(monthlyUnits, visits.max) ?? 0,
      maxYenPerVisit: perVisitRoundedYen(monthlyUnits, visits.min) ?? 0,
    };
  }
  if (visits.kind === 'at-least') {
    return {
      kind: 'at-least',
      bandId: visits.bandId,
      minVisits: visits.min,
      maxYenPerVisit: perVisitRoundedYen(monthlyUnits, visits.min) ?? 0,
    };
  }
  return {
    kind: 'unknown',
    rows: unknownVisitScenarios.map((scenarioVisits) => ({
      visits: scenarioVisits,
      yenPerVisit: perVisitRoundedYen(monthlyUnits, scenarioVisits),
      unusedPaymentYen: scenarioVisits === 0 ? unitsToRoundedYen(monthlyUnits) : null,
    })),
  };
}

export function calculatePerHourResult(
  monthlyUnits: number,
  visits: VisitKnowledge | null,
  time: TimeInput,
): PerHourResult {
  if (time.kind === 'total') {
    const yenPerHour = perHourRoundedYen(monthlyUnits, time.totalMinutes);
    if (yenPerHour === null) throw new RangeError('totalMinutes must be greater than zero.');
    return { kind: 'total', totalMinutes: time.totalMinutes, yenPerHour };
  }
  if (!visits) throw new RangeError('visit knowledge is required for average stay time.');

  if (visits.kind === 'exact') {
    const totalMinutes = time.averageMinutes * visits.visits;
    return {
      kind: 'exact',
      visits: visits.visits,
      averageMinutes: time.averageMinutes,
      totalMinutes,
      yenPerHour: perHourRoundedYen(monthlyUnits, totalMinutes),
    };
  }
  if (visits.kind === 'bounded') {
    const minTotalMinutes = time.averageMinutes * visits.min;
    const maxTotalMinutes = time.averageMinutes * visits.max;
    return {
      kind: 'bounded',
      bandId: visits.bandId,
      minVisits: visits.min,
      maxVisits: visits.max,
      averageMinutes: time.averageMinutes,
      minTotalMinutes,
      maxTotalMinutes,
      minYenPerHour: perHourRoundedYen(monthlyUnits, maxTotalMinutes) ?? 0,
      maxYenPerHour: perHourRoundedYen(monthlyUnits, minTotalMinutes) ?? 0,
    };
  }
  if (visits.kind === 'at-least') {
    const minTotalMinutes = time.averageMinutes * visits.min;
    return {
      kind: 'at-least',
      bandId: visits.bandId,
      minVisits: visits.min,
      averageMinutes: time.averageMinutes,
      minTotalMinutes,
      maxYenPerHour: perHourRoundedYen(monthlyUnits, minTotalMinutes) ?? 0,
    };
  }
  return {
    kind: 'unknown',
    averageMinutes: time.averageMinutes,
    rows: unknownVisitScenarios.map((scenarioVisits) => {
      const totalMinutes = scenarioVisits * time.averageMinutes;
      return {
        visits: scenarioVisits,
        totalMinutes,
        yenPerHour: perHourRoundedYen(monthlyUnits, totalMinutes),
      };
    }),
  };
}

export function buildServiceReview(
  usedServices: UsedServices,
  importantServices: ServiceId[],
): ServiceReview {
  const importantIds = new Set(importantServices);
  const used = serviceCatalog.flatMap((service) => {
    const frequency = usedServices[service.id];
    return frequency
      ? [{ ...service, frequency, frequencyLabel: usageFrequencyLabels[frequency] }]
      : [];
  });
  const important = serviceCatalog.filter((service) => importantIds.has(service.id));
  const importantButUnused = important.filter((service) => !usedServices[service.id]);
  return { used, important, importantButUnused };
}

export function buildContinuationReview(ids: ContinuationId[]) {
  const selected = new Set(ids);
  return continuationCatalog.filter((item) => selected.has(item.id));
}

export function buildReviewResult(input: ValidatedReviewInput): ReviewResult {
  const monthlyEquivalent = calculateMonthlyEquivalent(input.fees);
  const includesPerVisit = input.criterion === 'per-visit' || input.criterion === 'all';
  const includesPerHour = input.criterion === 'per-hour' || (input.criterion === 'all' && input.time !== null);
  const includesServices = input.criterion === 'services' || input.criterion === 'all';
  const includesContinuation = input.criterion === 'continuation' || input.criterion === 'all';

  return {
    criterion: input.criterion,
    monthly: { ...monthlyEquivalent, fees: input.fees },
    visits: input.visits,
    timeInput: input.time,
    perVisit: includesPerVisit && input.visits
      ? calculatePerVisitResult(monthlyEquivalent.units, input.visits)
      : null,
    perHour: includesPerHour && input.time
      ? calculatePerHourResult(monthlyEquivalent.units, input.visits, input.time)
      : null,
    services: includesServices ? buildServiceReview(input.usedServices, input.importantServices) : null,
    continuation: includesContinuation ? buildContinuationReview(input.continuation) : null,
  };
}

export function getCriterionLabel(criterion: Criterion): string {
  return criterionOptions.find((option) => option.id === criterion)?.label ?? criterion;
}

export function getVisitBandLabel(bandId: VisitBandId): string {
  return visitBandOptions.find((option) => option.id === bandId)?.label ?? bandId;
}
