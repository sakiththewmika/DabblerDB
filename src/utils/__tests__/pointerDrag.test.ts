import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startPointerDrag } from '../pointerDrag';

// A stand-in for the browser window, so the test needs no browser or DOM library.
let fakeWindow: EventTarget;

const send = (type: string, pointerId: number, clientX = 0, clientY = 0) =>
  fakeWindow.dispatchEvent(Object.assign(new Event(type), { pointerId, clientX, clientY }));

beforeEach(() => {
  fakeWindow = new EventTarget();
  vi.stubGlobal('window', fakeWindow);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const press = (pointerId = 1) => ({ pointerId, clientX: 100, clientY: 100 });

describe('startPointerDrag', () => {
  it('reports how far the pointer moved since the press', () => {
    const onMove = vi.fn();
    startPointerDrag(press(), { onMove });
    send('pointermove', 1, 130, 90);
    expect(onMove).toHaveBeenCalledWith(30, -10, expect.anything());
  });

  it('ignores small movements until the threshold is passed, then calls onStart once', () => {
    const onStart = vi.fn();
    const onMove = vi.fn();
    startPointerDrag(press(), { threshold: 8, onStart, onMove });

    send('pointermove', 1, 103, 102); // 3.6px: still a tap
    expect(onStart).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();

    send('pointermove', 1, 120, 100);
    send('pointermove', 1, 140, 100);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledTimes(2);
  });

  it('tells onEnd whether the pointer moved, so a tap can be told from a drag', () => {
    const tap = vi.fn();
    startPointerDrag(press(), { threshold: 8, onMove: vi.fn(), onEnd: tap });
    send('pointerup', 1, 101, 100);
    expect(tap).toHaveBeenCalledWith(expect.anything(), false);

    const drag = vi.fn();
    startPointerDrag(press(2), { threshold: 8, onMove: vi.fn(), onEnd: drag });
    send('pointermove', 2, 200, 100);
    send('pointerup', 2, 200, 100);
    expect(drag).toHaveBeenCalledWith(expect.anything(), true);
  });

  it('follows only the pointer that started it', () => {
    const onMove = vi.fn();
    startPointerDrag(press(1), { onMove });
    send('pointermove', 99, 500, 500);
    expect(onMove).not.toHaveBeenCalled();
  });

  it('ends when a second finger touches down, so pinch-to-zoom can take over', () => {
    const onEnd = vi.fn();
    const onMove = vi.fn();
    startPointerDrag(press(1), { onMove, onEnd });
    send('pointerdown', 2, 300, 300);
    expect(onEnd).toHaveBeenCalledTimes(1);
    send('pointermove', 1, 150, 150);
    expect(onMove).not.toHaveBeenCalled();
  });

  it('ends on pointercancel (for example when the browser takes over scrolling)', () => {
    const onEnd = vi.fn();
    startPointerDrag(press(), { onMove: vi.fn(), onEnd });
    send('pointercancel', 1);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('stops listening after it ends, and ends only once', () => {
    const onEnd = vi.fn();
    const onMove = vi.fn();
    startPointerDrag(press(), { onMove, onEnd });
    send('pointerup', 1);
    send('pointerup', 1);
    send('pointermove', 1, 300, 300);
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onMove).not.toHaveBeenCalled();
  });

  it('can be cancelled from code', () => {
    const onEnd = vi.fn();
    const cancel = startPointerDrag(press(), { onMove: vi.fn(), onEnd });
    cancel();
    expect(onEnd).toHaveBeenCalledWith(null, false);
  });
});
