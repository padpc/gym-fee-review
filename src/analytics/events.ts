import type { AnalyticsEventName } from './eventNames';

interface TrackerOptions {
  enabled: () => boolean;
  send: (event: AnalyticsEventName) => Promise<unknown>;
}

export function createEventTracker({ enabled, send }: TrackerOptions) {
  const sent = new Set<AnalyticsEventName>();
  return (event: AnalyticsEventName) => {
    if (!enabled() || sent.has(event)) return;
    sent.add(event);
    void send(event).catch(() => undefined);
  };
}

function isProductionVisitor(): boolean {
  if (!import.meta.env.PROD || window.location.hostname !== 'gym-fee-review.smallframe.workers.dev') return false;
  try {
    return window.sessionStorage.getItem('gfr:internal') !== '1';
  } catch {
    return true;
  }
}

export const trackEvent = createEventTracker({
  enabled: isProductionVisitor,
  send: async (event) => {
    const response = await fetch('/api/event', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event }),
      keepalive: true,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    if (!response.ok) throw new Error(`Analytics request failed: ${response.status}`);
  },
});
