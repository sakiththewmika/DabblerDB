import React from 'react';
import { Database } from 'lucide-react';
import { useSchemaStore } from '../../store/useSchemaStore';
import { DIALECTS, isDialect } from '../../data/dialectDefaults';

/** Picks the database you are designing for. Affects new tables and the .sql export. */
export const DialectSelect: React.FC<{ className?: string }> = ({ className = 'hidden md:flex' }) => {
  const dialect = useSchemaStore((s) => s.dialect);
  const setDialect = useSchemaStore((s) => s.setDialect);

  return (
    <label
      className={`${className} items-center gap-1.5 px-2 py-1.5 rounded-xl border border-border bg-card text-xs text-foreground`}
      title="The database you are designing for. New tables and the .sql export use it."
    >
      <Database className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
      <span className="sr-only">Database</span>
      <select
        value={dialect}
        onChange={(e) => isDialect(e.target.value) && setDialect(e.target.value)}
        className="bg-transparent font-medium focus:outline-hidden cursor-pointer"
      >
        {DIALECTS.map((d) => (
          <option key={d.id} value={d.id}>
            {d.label}
          </option>
        ))}
      </select>
    </label>
  );
};
