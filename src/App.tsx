import { useEffect } from 'react';
import { TopToolbar } from './components/toolbar/TopToolbar';
import { SchemaCanvas } from './components/canvas/SchemaCanvas';
import { StudioSidebar } from './components/inspector/StudioSidebar';
import { KeyboardShortcutsModal } from './components/modals/KeyboardShortcutsModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { decodeSchemaFromUrlHash, takeShareHashFromLocation } from './utils/urlShare';
import { hasCustomWork, validateSchemaPayload } from './utils/schemaValidation';
import { useSchemaStore } from './store/useSchemaStore';
import { ToastHost } from './components/common/ToastHost';
import { DropZoneOverlay } from './components/modals/DropZoneOverlay';
import { toast } from './store/useToastStore';

export default function App() {
  // Activate global keyboard shortcuts
  useKeyboardShortcuts();

  const importSchemaJson = useSchemaStore((s) => s.importSchemaJson);

  useEffect(() => {
    // Read and clear the link right away so a reload never re-imports it
    const payload = takeShareHashFromLocation();
    if (!payload) return;

    async function loadShared() {
      const shared = await decodeSchemaFromUrlHash(payload!);
      if (!shared) {
        toast.error('This share link could not be read', {
          details: ['It may be incomplete or corrupted. Ask for a new link.'],
        });
        return;
      }

      const { tables, modules } = useSchemaStore.getState();
      const result = validateSchemaPayload(shared, modules);
      if (!result.ok) {
        toast.error('This share link is not a valid schema', { details: [result.error] });
        return;
      }
      if (result.tables.length === 0) return;

      if (
        hasCustomWork(tables) &&
        !window.confirm(
          `Open the shared schema (${result.tables.length} tables)?\n\nIt will replace the schema currently in your browser.`
        )
      ) {
        return;
      }

      importSchemaJson({ tables: result.tables, modules: result.modules });
      toast.success(`Shared schema loaded (${result.tables.length} tables)`, {
        action: { label: 'Undo', onClick: () => useSchemaStore.getState().undo() },
      });
    }
    void loadShared();
  }, [importSchemaJson]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground select-none relative">
      <ToastHost />
      <DropZoneOverlay />

      {/* Top Navigation & Actions Toolbar */}
      <TopToolbar />

      {/* Main Studio Workspace: Canvas + Unified Resizable Studio Sidebar */}
      <div className="flex-1 w-full h-full flex overflow-hidden relative">
        <main className="flex-1 h-full relative overflow-hidden">
          <SchemaCanvas />
        </main>

        <StudioSidebar />
      </div>

      {/* Keyboard Shortcuts Cheat-sheet Modal */}
      <KeyboardShortcutsModal />
    </div>
  );
}
