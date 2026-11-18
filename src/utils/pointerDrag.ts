/**
 * One way to do "press, drag, release" for mouse, finger and pen.
 *
 * Call it from an onPointerDown handler:
 *
 *   onPointerDown={(e) =>
 *     startPointerDrag(e, {
 *       onMove: (dx, dy) => moveThing(dx, dy),
 *       onEnd: () => finish(),
 *     })
 *   }
 *
 * - dx / dy are how far the pointer moved since the press, in screen pixels.
 * - It only follows the pointer that started the drag, so a second finger is ignored...
 * - ...and a second finger touching down ENDS the drag, so pinch-to-zoom can take over.
 * - `threshold` (pixels) stops a small wobble during a tap from counting as a drag.
 */
export interface PointerDragHandlers {
  /** Called once, when the pointer has moved further than `threshold`. */
  onStart?: () => void;
  onMove: (dx: number, dy: number, event: PointerEvent) => void;
  /** Called when the drag finishes. `event` is null if it was cancelled from code. */
  onEnd?: (event: PointerEvent | null, moved: boolean) => void;
  threshold?: number;
}

export function startPointerDrag(
  start: { pointerId: number; clientX: number; clientY: number },
  handlers: PointerDragHandlers
): () => void {
  const threshold = handlers.threshold ?? 0;
  let moved = false;
  let finished = false;

  const finish = (event: PointerEvent | null) => {
    if (finished) return;
    finished = true;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    window.removeEventListener('pointerdown', onOtherPointerDown);
    handlers.onEnd?.(event, moved);
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== start.pointerId) return;
    const dx = e.clientX - start.clientX;
    const dy = e.clientY - start.clientY;
    if (!moved) {
      if (Math.hypot(dx, dy) < threshold) return;
      moved = true;
      handlers.onStart?.();
    }
    handlers.onMove(dx, dy, e);
  };

  const onUp = (e: PointerEvent) => {
    if (e.pointerId === start.pointerId) finish(e);
  };

  const onOtherPointerDown = (e: PointerEvent) => {
    if (e.pointerId !== start.pointerId) finish(e);
  };

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  window.addEventListener('pointerdown', onOtherPointerDown);

  return () => finish(null);
}
