import React, { useState } from 'react';
import { SQL_TYPE_CATEGORIES, getCategoryForType, getTypesForCategory } from '../../data/sqlDataTypes';

const categoryButton = (active: boolean) =>
  `px-2 py-1 text-left rounded-lg text-[11px] font-medium transition-colors ${
    active ? 'bg-accent text-accent-foreground font-semibold shadow-2xs' : 'hover:bg-muted text-foreground/80'
  }`;

/** Floating two-step type picker that opens under a column on the canvas card. */
export const ColumnTypePopup: React.FC<{
  currentType: string;
  onPick: (type: string) => void;
  onClose: () => void;
}> = ({ currentType, onPick, onClose }) => {
  const [category, setCategory] = useState(() => getCategoryForType(currentType));
  const [customType, setCustomType] = useState(() => (getCategoryForType(currentType) === 'custom' ? currentType : ''));

  const applyCustom = () => {
    if (customType.trim()) onPick(customType.trim());
  };

  return (
    <div
      className="absolute right-2 top-full mt-1 z-50 bg-card border border-border shadow-2xl rounded-xl p-2.5 flex gap-2 text-xs animate-in fade-in zoom-in-95"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Step 1: category */}
      <div className="flex flex-col gap-0.5 border-r border-border/80 pr-2.5 w-32 shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-0.5 mb-1">
          1. Category
        </span>
        {SQL_TYPE_CATEGORIES.map((cat) => (
          <button key={cat.id} type="button" onClick={() => setCategory(cat.id)} className={categoryButton(category === cat.id)}>
            {cat.name}
          </button>
        ))}
        <button type="button" onClick={() => setCategory('custom')} className={categoryButton(category === 'custom')}>
          ⚙️ Custom...
        </button>
      </div>

      {/* Step 2: type */}
      <div className="flex flex-col gap-0.5 w-36 shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-0.5 mb-1">
          2. Type
        </span>
        {category === 'custom' ? (
          <div className="p-1 space-y-2">
            <input
              type="text"
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              placeholder="e.g. citext"
              aria-label="Custom data type"
              autoFocus
              className="w-full px-2 py-1 text-[11px] font-mono rounded border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-accent focus:outline-hidden"
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyCustom();
                if (e.key === 'Escape') onClose();
              }}
            />
            <div className="flex gap-1">
              <button
                type="button"
                onClick={applyCustom}
                className="flex-1 px-2 py-1 bg-accent text-white rounded text-[11px] font-semibold hover:bg-accent-hover"
              >
                Apply
              </button>
              <button type="button" onClick={onClose} className="px-2 py-1 bg-muted text-muted-foreground rounded text-[11px]">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          getTypesForCategory(category).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onPick(t)}
              className={`px-2 py-1 text-left rounded-lg font-mono text-[11px] hover:bg-accent/15 hover:text-accent transition-colors ${
                currentType.toUpperCase() === t.toUpperCase() ? 'bg-accent/10 text-accent font-bold' : 'text-foreground/90'
              }`}
            >
              {t}
            </button>
          ))
        )}
      </div>
    </div>
  );
};
