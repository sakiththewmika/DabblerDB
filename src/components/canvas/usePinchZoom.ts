import { useEffect, type RefObject } from 'react';
import { pinchView, type CanvasView, type Point } from './gestures';

/**
 * Two-finger pinch to zoom (and two-finger drag to pan) on a touch screen.
 *
 * It listens in the capture phase, so it also sees fingers that land on a table card.
 * Mouse and one-finger drags are handled elsewhere.
 */
export function usePinchZoom(
  containerRef: RefObject<HTMLElement | null>,
  getView: () => CanvasView,
  setView: (view: CanvasView) => void,
  minZoom: number,
  maxZoom: number
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const fingers = new Map<number, Point>();
    let start: { view: CanvasView; a: Point; b: Point; ids: [number, number] } | null = null;

    const relative = (e: PointerEvent): Point => {
      const rect = container.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      fingers.set(e.pointerId, relative(e));
      if (fingers.size === 2 && !start) {
        const [[idA, a], [idB, b]] = [...fingers.entries()];
        start = { view: getView(), a, b, ids: [idA, idB] };
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!fingers.has(e.pointerId)) return;
      fingers.set(e.pointerId, relative(e));
      if (!start) return;
      const a = fingers.get(start.ids[0]);
      const b = fingers.get(start.ids[1]);
      if (a && b) setView(pinchView(start, a, b, minZoom, maxZoom));
    };

    const onUp = (e: PointerEvent) => {
      fingers.delete(e.pointerId);
      if (start && (e.pointerId === start.ids[0] || e.pointerId === start.ids[1])) start = null;
    };

    container.addEventListener('pointerdown', onDown, true);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      container.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [containerRef, getView, setView, minZoom, maxZoom]);
}
