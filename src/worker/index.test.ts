// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { deleteExpiredEvents, handleEventRequest, type EventDatabase } from './index';

function databaseMock() {
  const run = vi.fn(async () => ({ success: true }));
  const bind = vi.fn(() => ({ run }));
  const prepare = vi.fn(() => ({ bind }));
  return { database: { prepare } as EventDatabase, prepare, bind, run };
}

function eventRequest(body: string, contentType = 'application/json') {
  return new Request('https://example.test/api/event', {
    method: 'POST',
    headers: { 'content-type': contentType },
    body,
  });
}

describe('匿名イベントAPI', () => {
  it.each(['calculator_view', 'main_calculation_complete', 'feedback_open'])('許可イベント %s だけを保存する', async (event) => {
    const mock = databaseMock();
    const response = await handleEventRequest(eventRequest(JSON.stringify({ event })), mock.database);
    expect(response.status).toBe(204);
    expect(mock.bind).toHaveBeenCalledWith(event);
  });

  it.each([
    ['未知イベント', JSON.stringify({ event: 'other' }), 400],
    ['追加キー', JSON.stringify({ event: 'calculator_view', fee: 8000 }), 400],
    ['配列', JSON.stringify(['calculator_view']), 400],
    ['壊れたJSON', '{', 400],
    ['過大本文', JSON.stringify({ event: 'x'.repeat(90) }), 413],
  ])('%sを拒否する', async (_label, body, status) => {
    const mock = databaseMock();
    const response = await handleEventRequest(eventRequest(body), mock.database);
    expect(response.status).toBe(status);
    expect(mock.run).not.toHaveBeenCalled();
  });

  it('POSTとJSON以外を拒否する', async () => {
    const mock = databaseMock();
    expect((await handleEventRequest(new Request('https://example.test/api/event'), mock.database)).status).toBe(405);
    expect((await handleEventRequest(eventRequest('{}', 'text/plain'), mock.database)).status).toBe(415);
  });

  it('180日より前のイベントを削除する', async () => {
    const mock = databaseMock();
    await deleteExpiredEvents(mock.database);
    expect(mock.prepare).toHaveBeenCalledWith(expect.stringContaining("datetime('now', '-180 days')"));
    expect(mock.run).toHaveBeenCalledOnce();
  });
});
