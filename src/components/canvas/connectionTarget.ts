/**
 * Which table (and column) is under the pointer? Used when you let go while
 * dragging a new foreign key.
 *
 * With a finger the browser reports the release on the element where the touch
 * STARTED, so we look at what is under the pointer instead of trusting the event target.
 */
export function findConnectionTarget(clientX: number, clientY: number): { tableId: string; columnId?: string } | null {
  const element = document.elementFromPoint(clientX, clientY);
  const card = element?.closest<HTMLElement>('[data-table-card]');
  if (!card?.dataset.tableCard) return null;
  const row = element?.closest<HTMLElement>('[data-col-id]');
  return { tableId: card.dataset.tableCard, columnId: row?.dataset.colId };
}
