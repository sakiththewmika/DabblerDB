import React, { useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { SearchBox } from './SearchBox';
import { ModuleFilterBar } from './ModuleFilterBar';
import { DialectSelect } from './DialectSelect';
import { TemplatesMenu } from './TemplatesMenu';
import { ImportMenu } from './ImportMenu';
import { ExportMenu } from './ExportMenu';
import { ResetButton } from './ResetButton';

/**
 * Phones: the top bar has no room for search, module filters, templates, import and export,
 * so they live in this "More" panel. It stays mounted while closed (just hidden), because
 * the Import menu owns the hidden file inputs and they must survive the panel closing.
 */
export const MoreMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, open, () => setOpen(false));

  return (
    <div
      ref={ref}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          setOpen(false);
          ref.current?.querySelector('button')?.focus();
        }
      }}
      // Picking an item inside a menu closes the whole panel
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-menu-item]')) setOpen(false);
      }}
    >
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="compact-menu"
        onClick={() => setOpen(!open)}
        className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-colors"
        title="More: search, modules, templates, import, export"
        aria-label="More actions"
      >
        <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
      </button>

      <div
        id="compact-menu"
        hidden={!open}
        className="fixed inset-x-2 top-14 z-50 p-3 space-y-3 rounded-2xl bg-card border border-border shadow-2xl max-h-[calc(100dvh-4rem)] overflow-y-auto"
      >
        <SearchBox className="relative w-full" />
        <ModuleFilterBar wrap />
        <div className="flex flex-wrap items-center gap-2">
          <DialectSelect className="flex" />
          <TemplatesMenu />
          <ImportMenu />
          <ExportMenu />
        </div>
        <ResetButton showLabel />
      </div>
    </div>
  );
};
