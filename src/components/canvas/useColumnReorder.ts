import { useState, type PointerEvent } from 'react';
import { startPointerDrag } from '../../utils/pointerDrag';

/**
 * Drag a column's grip up or down to reorder it (mouse, finger or pen).
 * Rows must carry data-table-id and data-table-col-index so we can find them under the pointer.
 */
export function useColumnReorder(tableId: string, onReorder: (from: number, to: number) => void) {
  const [dragState, setDragState] = useState<{ sourceIndex: number; targetIndex: number } | null>(null);

  const startReorder = (e: PointerEvent, colIndex: number) => {
    e.stopPropagation();
    e.preventDefault();

    let targetIdx = colIndex;
    setDragState({ sourceIndex: colIndex, targetIndex: colIndex });
    document.body.style.cursor = 'grabbing';

    startPointerDrag(e, {
      onMove: (_dx, _dy, move) => {
        for (const el of document.elementsFromPoint(move.clientX, move.clientY)) {
          const row = el.closest(`[data-table-col-index][data-table-id="${tableId}"]`) as HTMLElement | null;
          if (row?.dataset.tableColIndex !== undefined) {
            const idx = parseInt(row.dataset.tableColIndex, 10);
            if (!isNaN(idx) && idx !== targetIdx) {
              targetIdx = idx;
              setDragState({ sourceIndex: colIndex, targetIndex: idx });
            }
            break;
          }
        }
      },
      onEnd: () => {
        document.body.style.cursor = '';
        if (targetIdx !== colIndex) onReorder(colIndex, targetIdx);
        setDragState(null);
      },
    });
  };

  return { dragState, startReorder };
}
