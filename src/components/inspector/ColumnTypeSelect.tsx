import React, { useId, useState } from 'react';
import {
  SQL_TYPE_CATEGORIES,
  getCategoryForType,
  getDefaultTypeForCategory,
  getTypesForCategory,
} from '../../data/sqlDataTypes';

const selectClass =
  'w-full px-2 py-1 text-xs rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:outline-hidden focus:ring-1 focus:ring-accent cursor-pointer truncate';
const labelClass = 'block text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider';

/** Two-step data type picker: 1. category, 2. specific type (or a custom text type). */
export const ColumnTypeSelect: React.FC<{ type: string; onChange: (type: string) => void }> = ({ type, onChange }) => {
  const id = useId();
  const [forceCustom, setForceCustom] = useState(false);
  const category = getCategoryForType(type);
  const isCustom = forceCustom || category === 'custom';

  return (
    <div className="grid grid-cols-2 gap-2 text-xs pt-0.5">
      <div>
        <label htmlFor={`${id}-category`} className={labelClass}>
          1. Category
        </label>
        <select
          id={`${id}-category`}
          value={forceCustom ? 'custom' : category}
          onChange={(e) => {
            const next = e.target.value;
            setForceCustom(next === 'custom');
            if (next !== 'custom') onChange(getDefaultTypeForCategory(next));
          }}
          className={`${selectClass} font-medium`}
        >
          {SQL_TYPE_CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
          <option value="custom">⚙️ Custom Type...</option>
        </select>
      </div>

      <div>
        <label htmlFor={`${id}-type`} className={labelClass}>
          2. Data Type
        </label>
        {isCustom ? (
          <input
            id={`${id}-type`}
            type="text"
            value={type}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-2 py-1 text-xs font-mono rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-accent focus:outline-hidden"
            placeholder="custom_type"
          />
        ) : (
          <select
            id={`${id}-type`}
            value={getTypesForCategory(category).find((t) => t.toUpperCase() === type.toUpperCase()) || type}
            onChange={(e) => onChange(e.target.value)}
            className={`${selectClass} font-mono`}
          >
            {getTypesForCategory(category).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
};
