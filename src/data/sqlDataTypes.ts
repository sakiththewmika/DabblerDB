export interface SqlTypeCategory {
  id: string;
  name: string;
  types: string[];
  defaultType: string;
}

export const SQL_TYPE_CATEGORIES: SqlTypeCategory[] = [
  {
    id: 'ids',
    name: 'ID & Keys',
    types: ['UUID', 'SERIAL', 'BIGSERIAL'],
    defaultType: 'UUID',
  },
  {
    id: 'text',
    name: 'Text & String',
    types: ['VARCHAR(255)', 'VARCHAR(100)', 'VARCHAR(50)', 'TEXT', 'CHAR(1)'],
    defaultType: 'VARCHAR(255)',
  },
  {
    id: 'numeric',
    name: 'Numeric',
    types: [
      'INT',
      'BIGINT',
      'SMALLINT',
      'NUMERIC(12,2)',
      'DECIMAL(10,2)',
      'REAL',
      'DOUBLE PRECISION',
    ],
    defaultType: 'INT',
  },
  {
    id: 'datetime',
    name: 'Date & Time',
    types: ['TIMESTAMPTZ', 'TIMESTAMP', 'DATE', 'TIME'],
    defaultType: 'TIMESTAMPTZ',
  },
  {
    id: 'boolean',
    name: 'Boolean & Binary',
    types: ['BOOLEAN', 'BYTEA', 'BLOB'],
    defaultType: 'BOOLEAN',
  },
  {
    id: 'json',
    name: 'JSON & Document',
    types: ['JSONB', 'JSON'],
    defaultType: 'JSONB',
  },
];

export const COMMON_SQL_TYPES: string[] = Array.from(
  new Set(SQL_TYPE_CATEGORIES.flatMap((c) => c.types))
);

export function isCommonSqlType(type: string): boolean {
  if (!type) return false;
  const upper = type.trim().toUpperCase();
  return COMMON_SQL_TYPES.some((t) => t.toUpperCase() === upper);
}

export function getCategoryForType(type: string): string {
  if (!type) return 'text';
  const upper = type.trim().toUpperCase();
  for (const cat of SQL_TYPE_CATEGORIES) {
    if (cat.types.some((t) => t.toUpperCase() === upper)) {
      return cat.id;
    }
  }
  return 'custom';
}

export function getTypesForCategory(categoryId: string): string[] {
  const cat = SQL_TYPE_CATEGORIES.find((c) => c.id === categoryId);
  return cat ? cat.types : [];
}

export function getDefaultTypeForCategory(categoryId: string): string {
  const cat = SQL_TYPE_CATEGORIES.find((c) => c.id === categoryId);
  return cat ? cat.defaultType : 'VARCHAR(255)';
}
