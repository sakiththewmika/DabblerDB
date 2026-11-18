import { useSchemaStore } from '../store/useSchemaStore';
import { toast } from '../store/useToastStore';

/**
 * Run a change right away and show a message with an Undo button, instead of asking
 * "Are you sure?" first. Every change in the store is already undoable, so nothing is lost.
 *
 *   doWithUndo('Deleted table "users"', () => deleteTable(id));
 *
 * The Undo button only works while that change is still the latest one. If the person
 * has edited something since, undoing would remove their newer work, so it does nothing
 * and points them to Ctrl/Cmd + Z, which steps back one change at a time.
 */
export function doWithUndo(message: string, change: () => void, details?: string[]): void {
  change();
  const afterChange = useSchemaStore.getState().past.at(-1);

  toast.info(message, {
    details,
    // Details keep a message open until it is closed; this one should still go away
    duration: 8000,
    action: {
      label: 'Undo',
      onClick: () => {
        const store = useSchemaStore.getState();
        if (store.past.at(-1) !== afterChange) {
          toast.warning('Other changes were made since. Use Ctrl/Cmd + Z to step back one at a time.');
          return;
        }
        store.undo();
      },
    },
  });
}
