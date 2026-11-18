import { describe, expect, it } from 'vitest';
import { distance, isDoubleTap, midpoint, pinchView, type CanvasView } from '../gestures';

const view: CanvasView = { pan: { x: 100, y: 50 }, zoom: 1 };
const start = { view, a: { x: 100, y: 200 }, b: { x: 200, y: 200 } }; // fingers 100px apart

describe('pinchView', () => {
  it('does nothing when the fingers have not moved', () => {
    expect(pinchView(start, start.a, start.b, 0.25, 1.8)).toEqual(view);
  });

  it('zooms in when the fingers spread apart, keeping the spot between them in place', () => {
    const next = pinchView(start, { x: 50, y: 200 }, { x: 250, y: 200 }, 0.25, 1.8); // 200px apart
    expect(next.zoom).toBe(1.8); // 2x would be 200%, so it stops at the 180% limit
    // The canvas point under the original centre (150,200) must still be under the new centre (150,200)
    const anchor = { x: 150 - 100, y: 200 - 50 };
    expect(next.pan.x + anchor.x * next.zoom).toBeCloseTo(150, 0);
    expect(next.pan.y + anchor.y * next.zoom).toBeCloseTo(200, 0);
  });

  it('zooms out when the fingers come together', () => {
    const next = pinchView(start, { x: 125, y: 200 }, { x: 175, y: 200 }, 0.25, 1.8); // 50px apart
    expect(next.zoom).toBeCloseTo(0.5);
  });

  it('never goes past the zoom limits', () => {
    expect(pinchView(start, { x: 0, y: 0 }, { x: 1000, y: 0 }, 0.25, 1.8).zoom).toBe(1.8);
    expect(pinchView(start, { x: 150, y: 200 }, { x: 151, y: 200 }, 0.25, 1.8).zoom).toBe(0.25);
  });

  it('pans when both fingers move together', () => {
    const next = pinchView(start, { x: 130, y: 240 }, { x: 230, y: 240 }, 0.25, 1.8);
    expect(next.zoom).toBe(1);
    expect(next.pan).toEqual({ x: 130, y: 90 });
  });

  it('copes with two fingers on exactly the same spot', () => {
    const same = { view, a: { x: 5, y: 5 }, b: { x: 5, y: 5 } };
    expect(pinchView(same, { x: 5, y: 5 }, { x: 50, y: 5 }, 0.25, 1.8).zoom).toBe(1);
  });
});

describe('helpers', () => {
  it('distance and midpoint', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(midpoint({ x: 0, y: 0 }, { x: 10, y: 20 })).toEqual({ x: 5, y: 10 });
  });
});

describe('isDoubleTap', () => {
  const tap = (time: number, x = 10, y = 10) => ({ time, x, y });

  it('needs a previous tap', () => {
    expect(isDoubleTap(null, tap(0))).toBe(false);
  });

  it('accepts two quick taps in the same place', () => {
    expect(isDoubleTap(tap(0), tap(200, 14, 12))).toBe(true);
  });

  it('rejects slow taps and taps far apart', () => {
    expect(isDoubleTap(tap(0), tap(600))).toBe(false);
    expect(isDoubleTap(tap(0), tap(100, 200, 200))).toBe(false);
  });
});
