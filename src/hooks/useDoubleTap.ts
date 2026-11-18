import { useRef, type PointerEvent, type MouseEvent } from 'react';
import { isDoubleTap } from '../components/canvas/gestures';

/**
 * "Double-click to edit" that also works with a finger.
 * Browsers do not reliably send double-click for touch, so taps are counted here.
 *
 *   const doubleTap = useDoubleTap(() => startEditing());
 *   <span {...doubleTap}>name</span>
 */
export function useDoubleTap(onDouble: (event: MouseEvent | PointerEvent) => void) {
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null);
  const lastFired = useRef(0);

  const fire = (event: MouseEvent | PointerEvent) => {
    // Some browsers send both a double tap and a double-click: only react once
    if (Date.now() - lastFired.current < 500) return;
    lastFired.current = Date.now();
    lastTap.current = null;
    onDouble(event);
  };

  return {
    onDoubleClick: (e: MouseEvent) => fire(e),
    onPointerUp: (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return; // the mouse uses onDoubleClick
      const tap = { time: Date.now(), x: e.clientX, y: e.clientY };
      if (isDoubleTap(lastTap.current, tap)) fire(e);
      else lastTap.current = tap;
    },
  };
}
