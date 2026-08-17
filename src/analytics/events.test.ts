import { describe, expect, it, vi } from 'vitest';
import { createEventTracker } from './events';

describe('匿名イベント送信', () => {
  it('有効時も同じイベントはページ表示内で1回だけ送る', async () => {
    const send = vi.fn(async () => undefined);
    const track = createEventTracker({ enabled: () => true, send });
    track('calculator_view');
    track('calculator_view');
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(send).toHaveBeenCalledWith('calculator_view');
  });

  it('無効時は送らず、送信失敗を利用処理へ伝播しない', async () => {
    const disabledSend = vi.fn(async () => undefined);
    createEventTracker({ enabled: () => false, send: disabledSend })('feedback_open');
    expect(disabledSend).not.toHaveBeenCalled();

    const failingSend = vi.fn(async () => { throw new Error('offline'); });
    expect(() => createEventTracker({ enabled: () => true, send: failingSend })('main_calculation_complete')).not.toThrow();
    await vi.waitFor(() => expect(failingSend).toHaveBeenCalledTimes(1));
  });
});
