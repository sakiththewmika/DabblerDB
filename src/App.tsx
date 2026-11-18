import { useEffect, useState } from 'react';
import { TopToolbar } from './components/toolbar/TopToolbar';
import { SchemaCanvas } from './components/canvas/SchemaCanvas';
import { StudioSidebar } from './components/inspector/StudioSidebar';
import { KeyboardShortcutsModal } from './components/modals/KeyboardShortcutsModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { decodeSchemaFromUrlHash, takeShareHashFromLocation } from './utils/urlShare';
import { hasCustomWork, validateSchemaPayload } from './utils/schemaValidation';
import { useSchemaStore } from './store/useSchemaStore';
import { Sparkles, X } from 'lucide-react';

export default function App() {
  // Activate global keyboard shortcuts
  useKeyboardShortcuts();

  const importSchemaJson = useSchemaStore((s) => s.importSchemaJson);
  const [sharedToast, setSharedToast] = useState<{ count: number } | null>(null);

  useEffect(() => {
    // Read and clear the link right away so a reload never re-imports it
    const payload = takeShareHashFromLocation();
    if (!payload) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    async function loadShared() {
      const shared = await decodeSchemaFromUrlHash(payload!);
      if (!shared) {
        window.alert('This share link could not be read. It may be incomplete or corrupted.');
        return;
      }

      const { tables, modules } = useSchemaStore.getState();
      const result = validateSchemaPayload(shared, modules);
      if (!result.ok) {
        window.alert(`This share link is not a valid schema: ${result.error}`);
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
      setSharedToast({ count: result.tables.length });
      timer = setTimeout(() => setSharedToast(null), 5000);
    }
    loadShared();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [importSchemaJson]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground select-none relative">
      {/* Shared Schema Notification Toast */}
      {sharedToast && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-accent/40 shadow-xl text-xs font-semibold text-foreground animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <span>Shared schema loaded successfully ({sharedToast.count} tables)!</span>
          <button
            type="button"
            onClick={() => setSharedToast(null)}
            className="ml-2 p-0.5 rounded text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
