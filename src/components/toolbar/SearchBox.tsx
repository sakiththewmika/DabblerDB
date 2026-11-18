import React from 'react';
import { Search, X } from 'lucide-react';
import { useSchemaStore } from '../../store/useSchemaStore';

/** Table and column search. The id is used by the "/" and Ctrl/Cmd+K shortcuts. */
export const SearchBox: React.FC = () => {
  const searchQuery = useSchemaStore((s) => s.searchQuery);
  const setSearchQuery = useSchemaStore((s) => s.setSearchQuery);

  return (
    <div className="relative flex-1 max-w-xs min-w-[140px]">
      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none" />
      <input
        id="top-search-input"
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search tables & columns..."
        aria-label="Search tables and columns"
        className="w-full pl-8 pr-12 py-1.5 text-xs rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-accent transition-all"
      />
      {searchQuery ? (
        <button
          type="button"
          onClick={() => setSearchQuery('')}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      ) : (
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground bg-muted/60 border border-border/60 pointer-events-none">
          /
        </kbd>
      )}
    </div>
  );
};
