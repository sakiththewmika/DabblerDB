import { TopToolbar } from './components/toolbar/TopToolbar';
import { SchemaCanvas } from './components/canvas/SchemaCanvas';
import { StudioSidebar } from './components/inspector/StudioSidebar';
import { KeyboardShortcutsModal } from './components/modals/KeyboardShortcutsModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export default function App() {
  // Activate global keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground select-none">
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
