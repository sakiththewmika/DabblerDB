import React, { useRef } from 'react';
import { FilePlus2, FileUp, Plus } from 'lucide-react';
import { useSchemaStore } from '../../store/useSchemaStore';
import { STARTER_TEMPLATES } from '../../data/starterTemplates';
import { ACCEPTED_IMPORT_TYPES, importFile } from '../../utils/importFiles';

/** Shown in the middle of the canvas when there are no tables yet. */
export const EmptyCanvasState: React.FC = () => {
  const addTable = useSchemaStore((s) => s.addTable);
  const loadTemplate = useSchemaStore((s) => s.loadTemplate);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-4 pointer-events-none">
      <div
        className="pointer-events-auto w-full max-w-md rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-xl p-6 text-center cursor-default"
        // Do not start panning the canvas when clicking inside the card
        onPointerDown={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-bold text-foreground">Your canvas is empty</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Start from scratch, import a SQL file, or open an example.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => addTable()}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-semibold hover:bg-accent-hover transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add a table
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <FileUp className="w-3.5 h-3.5" />
            Import .sql / .json
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_IMPORT_TYPES}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importFile(file);
            e.target.value = '';
          }}
        />

        <p className="mt-4 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Or start from an example
        </p>
        <div className="space-y-1.5">
          {STARTER_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => loadTemplate(tpl.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border border-border text-left hover:bg-muted transition-colors"
            >
              <FilePlus2 className="w-4 h-4 shrink-0 text-accent" />
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-foreground">{tpl.name}</span>
                <span className="block text-[11px] text-muted-foreground truncate">{tpl.description}</span>
              </span>
            </button>
          ))}
        </div>

        <p className="mt-4 text-[11px] text-muted-foreground">Tip: drag a .sql file anywhere on this page to import it.</p>
      </div>
    </div>
  );
};
