/** Pure maths for touch gestures on the canvas (no React, easy to test). */

export interface Point {
  x: number;
  y: number;
}

/** Where the canvas is looking: `pan` is the offset in pixels, `zoom` is the scale (1 = 100%). */
export interface CanvasView {
  pan: Point;
  zoom: number;
}

export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * The view for a two-finger gesture.
 *
 * `start` is the view and the two finger positions when the second finger touched down.
 * `a` and `b` are where the fingers are now (all positions relative to the canvas).
 *
 *  - Spreading the fingers zooms in, pinching zooms out.
 *  - The spot of the canvas that was between your fingers stays between your fingers,
 *    so moving both fingers together also pans.
 */
export function pinchView(
  start: { view: CanvasView; a: Point; b: Point },
  a: Point,
  b: Point,
  minZoom: number,
  maxZoom: number
): CanvasView {
  const startDistance = distance(start.a, start.b);
  const scale = startDistance === 0 ? 1 : distance(a, b) / startDistance;
  const zoom = clamp(start.view.zoom * scale, minZoom, maxZoom);

  // The point of the canvas under the fingers' centre when the gesture began
  const startCentre = midpoint(start.a, start.b);
  const anchor = {
    x: (startCentre.x - start.view.pan.x) / start.view.zoom,
    y: (startCentre.y - start.view.pan.y) / start.view.zoom,
  };

  const centre = midpoint(a, b);
  return {
    zoom,
    pan: { x: Math.round(centre.x - anchor.x * zoom), y: Math.round(centre.y - anchor.y * zoom) },
  };
}

/** Two taps close together in time and place count as a double tap. */
export function isDoubleTap(
  previous: { time: number; x: number; y: number } | null,
  current: { time: number; x: number; y: number },
  maxDelayMs = 350,
  maxDistancePx = 24
): boolean {
  if (!previous) return false;
  return (
    current.time - previous.time <= maxDelayMs &&
    Math.hypot(current.x - previous.x, current.y - previous.y) <= maxDistancePx
  );
}
