export type ThemeMode = 'dark' | 'light';

export interface ModuleGroup {
  id: string;
  name: string;
  color: string;
}

export type FkOnDeleteAction = 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';

export interface SchemaColumn {
  id: string;
  name: string;
  type: string;
  isPk: boolean;
  isUnique?: boolean;
  isNullable?: boolean;
  defaultValue?: string;
  fkTargetTableId?: string;
  fkTargetColumnId?: string;
  fkOnDelete?: FkOnDeleteAction;
}

export interface SchemaTable {
  id: string;
  name: string;
  moduleId: string;
  x: number;
  y: number;
  comment?: string;
  columns: SchemaColumn[];
}

export interface SchemaExport {
  modules: ModuleGroup[];
  tables: SchemaTable[];
  version?: string;
  lastSavedAt?: string;
}
