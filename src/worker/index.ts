import { allowedEventNames, type AnalyticsEventName } from '../analytics/eventNames';

interface StatementResult {
  success?: boolean;
}

interface BoundStatement {
  run(): Promise<StatementResult>;
}

interface PreparedStatement {
  bind(...values: unknown[]): BoundStatement;
}

export interface EventDatabase {
  prepare(query: string): PreparedStatement;
}

export interface WorkerEnvironment {
  ASSETS: { fetch(request: Request): Promise<Response> };
  DB: EventDatabase;
}

const allowedEvents = new Set<string>(allowedEventNames);
const maximumBodyBytes = 80;

function jsonError(status: number, code: string): Response {
  return Response.json({ error: code }, {
    status,
    headers: {
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

export async function handleEventRequest(request: Request, database: EventDatabase): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { allow: 'POST', 'cache-control': 'no-store' } });
  }
  if (request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    return jsonError(415, 'unsupported_media_type');
  }
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBodyBytes) return jsonError(413, 'body_too_large');

  const bodyText = await request.text();
  if (new TextEncoder().encode(bodyText).byteLength > maximumBodyBytes) return jsonError(413, 'body_too_large');

  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return jsonError(400, 'invalid_json');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return jsonError(400, 'invalid_body');
  const entries = Object.entries(body);
  if (entries.length !== 1 || entries[0][0] !== 'event' || typeof entries[0][1] !== 'string') {
    return jsonError(400, 'invalid_body');
  }
  const event = entries[0][1];
  if (!allowedEvents.has(event)) return jsonError(400, 'unknown_event');

  await database
    .prepare('INSERT INTO events (event_name, occurred_at) VALUES (?, CURRENT_TIMESTAMP)')
    .bind(event as AnalyticsEventName)
    .run();
  return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
}

export async function deleteExpiredEvents(database: EventDatabase): Promise<void> {
  await database
    .prepare("DELETE FROM events WHERE occurred_at < datetime('now', '-180 days')")
    .bind()
    .run();
}

export default {
  async fetch(request: Request, environment: WorkerEnvironment): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/event') {
      try {
        return await handleEventRequest(request, environment.DB);
      } catch {
        return jsonError(503, 'temporarily_unavailable');
      }
    }
    return environment.ASSETS.fetch(request);
  },
  async scheduled(_controller: unknown, environment: WorkerEnvironment): Promise<void> {
    await deleteExpiredEvents(environment.DB);
  },
};
