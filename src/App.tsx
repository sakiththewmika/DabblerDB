import { TopToolbar } from './components/toolbar/TopToolbar';
import { SchemaCanvas } from './components/canvas/SchemaCanvas';
import { TableInspector } from './components/inspector/TableInspector';
import { SqlStudioModal } from './components/modals/SqlStudioModal';

export default function App() {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground select-none">
      {/* Top Navigation & Actions Toolbar */}
      <TopToolbar />

      {/* Main Studio Workspace: Canvas + Live Inspector */}
      <div className="flex-1 w-full h-full flex overflow-hidden relative">
        <main className="flex-1 h-full relative overflow-hidden">
          <SchemaCanvas />
        </main>

        <TableInspector />
      </div>

      {/* SQL Studio Modal */}
      <SqlStudioModal />
    </div>
  );
}
