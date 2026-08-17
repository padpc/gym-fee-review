import { afterEach, describe, expect, it } from 'vitest';
import { appendWebAnalytics } from './webAnalytics';

afterEach(() => document.querySelectorAll('script[data-cf-beacon]').forEach((script) => script.remove()));

describe('Cloudflare Web Analytics', () => {
  it('実トークンがあるときだけ公式beaconを1回追加する', () => {
    expect(appendWebAnalytics(document, '')).toBeNull();
    const script = appendWebAnalytics(document, 'site-token');
    expect(script).not.toBeNull();
    expect(script).toHaveAttribute('type', 'module');
    expect(script).toHaveAttribute('src', 'https://static.cloudflareinsights.com/beacon.min.js');
    expect(script?.dataset.cfBeacon).toBe('{"token":"site-token"}');
    expect(appendWebAnalytics(document, 'site-token')).toBeNull();
  });
});
