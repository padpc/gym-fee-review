const beaconSource = 'https://static.cloudflareinsights.com/beacon.min.js';

export function appendWebAnalytics(documentObject: Document, token: string): HTMLScriptElement | null {
  const normalizedToken = token.trim();
  if (!normalizedToken || documentObject.querySelector(`script[src="${beaconSource}"]`)) return null;
  const script = documentObject.createElement('script');
  script.type = 'module';
  script.src = beaconSource;
  script.dataset.cfBeacon = JSON.stringify({ token: normalizedToken });
  script.defer = true;
  documentObject.body.append(script);
  return script;
}

export function loadWebAnalytics(): void {
  if (!import.meta.env.PROD || window.location.hostname !== 'gym-fee-review.smallframe.workers.dev') return;
  try {
    if (window.sessionStorage.getItem('gfr:internal') === '1') return;
  } catch {
    // Storageが読めなくても、公開利用者の標準集計は継続する。
  }
  appendWebAnalytics(document, import.meta.env.VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN ?? '');
}
