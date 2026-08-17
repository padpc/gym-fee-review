export const allowedEventNames = [
  'calculator_view',
  'main_calculation_complete',
  'feedback_open',
] as const;

export type AnalyticsEventName = typeof allowedEventNames[number];
