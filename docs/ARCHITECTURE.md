# DabblerDB — Technical Architecture

This document provides a technical overview of DabblerDB's architecture, state management patterns, mathematical canvas rendering, and code compilation pipelines.

---

## 📁 Repository & Directory Layout

```
DabblerDB/
├── .github/
│   ├── workflows/ci.yml           # GitHub Actions automated lint & build pipeline
│   ├── ISSUE_TEMPLATE/            # Standard bug report template
│   └── PULL_REQUEST_TEMPLATE.md   # PR checklist and guidelines
├── docs/
│   ├── USER_GUIDE.md              # User instructions and feature walkthroughs
│   └── ARCHITECTURE.md            # Technical specifications (this document)
├── public/                        # Static assets, favicon, and SVG icons
├── src/
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── RelationshipEdges.tsx  # Dynamic SVG cubic Bézier curves
│   │   │   ├── SchemaCanvas.tsx       # Infinite pan/zoom viewport & dot grid
│   │   │   └── TableCard.tsx          # Draggable table node cards
│   │   ├── inspector/
│   │   │   └── TableInspector.tsx     # Table metadata & live column/FK editor
│   │   ├── modals/
│   │   │   └── SqlStudioModal.tsx     # Multi-dialect SQL studio & DDL compiler
│   │   └── toolbar/
│   │       └── TopToolbar.tsx         # Navigation, module filters, search, and actions
│   ├── data/
│   │   └── defaultSchema.ts       # Canonical 5-table E-Commerce starter schema
│   ├── store/
│   │   └── useSchemaStore.ts      # Zustand local-first store with auto-save
│   ├── types/
│   │   └── schema.ts              # Canonical schema domain interfaces
│   ├── utils/
│   │   └── sqlCompiler.ts         # Multi-dialect DDL compiler and SQL parser
│   ├── App.tsx                    # Top-level workspace composition
│   ├── index.css                  # Tailwind CSS & semantic design tokens
│   └── main.tsx                   # React 19 entrypoint
├── eslint.config.js               # ESLint configuration
├── tailwind.config.js             # Tailwind theme & class-based dark mode
├── tsconfig.json                  # TypeScript compiler configuration
└── vite.config.ts                 # Vite bundler configuration
```

---

## 🧠 State Architecture: Canonical AST in Zustand

DabblerDB uses [Zustand](https://github.com/pmndrs/zustand) with the `persist` middleware to implement a lightweight, local-first Abstract Syntax Tree (AST):

```
+----------------------------------------------------------------+
|                        useSchemaStore                          |
+----------------------------------------------------------------+
|  tables: SchemaTable[]           modules: ModuleGroup[]        |
|  selectedTableId: string | null  activeModuleFilter: string    |
|  searchQuery: string             theme: 'dark' | 'light'       |
|  isSqlStudioOpen: boolean        lastSavedAt: string           |
+----------------------------------------------------------------+
                               |
               Persisted to localStorage:
                 'dabblerdb_schema_v1'
```

### Domain Interfaces (`src/types/schema.ts`)

```typescript
export interface ModuleGroup {
  id: string;
  name: string;
  color: string;
}

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
  fkOnDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
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
```

### Relational Integrity Enforcement
When tables or columns are deleted, `useSchemaStore` automatically cascades relational cleanup:
- **`deleteTable(id)`**: Clears any `fkTargetTableId === id` across all tables.
- **`deleteColumn(tableId, columnId)`**: Clears any `fkTargetColumnId === columnId` across all tables.

---

## 📐 SVG Cubic Bézier Calculation (`RelationshipEdges.tsx`)

DabblerDB does not use heavy external graph libraries (such as React Flow). Instead, foreign key curves are computed in real time using native SVG cubic Bézier paths:

```
  Source Anchor (P0)                  Target Anchor (P3)
      (x1, y1)  --------------------->   (x2, y2)
         \                                  ^
          \-- CP1 (x1 + dx, y1)             |
                                  CP2 (x2 - dx, y2)
```

### 1. Anchor Coordinate Calculation
For source table $S$ and target table $T$:
- Card width is fixed at $W = 288\text{px}$ (`w-72`).
- The vertical center of row $i$ in a table is calculated via:
  $$Y = y_{\text{table}} + \text{headerHeight} + (i \times 29\text{px}) + 14.5\text{px}$$
- If $T.x \ge S.x + W - 40$ (Target is to the right):
  - $P_0 = (S.x + W, Y_S)$
  - $P_3 = (T.x, Y_T)$
  - $dx = \max(40, |P_3.x - P_0.x| \times 0.45)$
  - $CP_1 = (P_0.x + dx, P_0.y)$
  - $CP_2 = (P_3.x - dx, P_3.y)$
- If $T$ is to the left, anchors flip to the left edge of $S$ and right edge of $T$.

### 2. Self-Referencing Loops
If $S.\text{id} === T.\text{id}$:
- The path routes outward from the right of the column $(S.x + W, Y_S)$, loops outward by $+45\text{px}$, curves upward above the table $(S.y - 25\text{px})$, and enters through the top $(S.x + W - 20\text{px}, S.y)$.

### 3. Edge Highlight Animation
When a table is selected, active edges receive:
```css
stroke-dasharray: 6 4;
animation: dash 1s linear infinite;
```
Flowing dashes visually convey the direction from the source foreign key to the referenced primary key.

---

## ⚙️ Multi-Dialect SQL Compilation (`sqlCompiler.ts`)

The compiler converts visual `SchemaTable` entities into standards-compliant DDL:

```
                   +------------------------+
                   |  Visual Schema Tables  |
                   +------------------------+
                               |
               +---------------+---------------+
               |               |               |
               v               v               v
          PostgreSQL        MySQL 8.0+      SQLite 3
          - UUID          - VARCHAR(36)   - TEXT
          - TIMESTAMPTZ   - DATETIME      - TEXT
          - BOOLEAN       - TINYINT(1)    - INTEGER
          - "ident"       - `ident`       - "ident"
          - AUTO INDEXES  - AUTO INDEXES  - PRAGMA keys
```

### Adding a New SQL Dialect
To support an additional dialect (e.g., MSSQL or Oracle):
1. Add the dialect key to `SupportedDialect` in `src/utils/sqlCompiler.ts`:
   ```typescript
   export type SupportedDialect = 'postgres' | 'mysql' | 'sqlite' | 'mssql';
   ```
2. Update `quoteIdentifier`:
   ```typescript
   if (dialect === 'mssql') return `[${name}]`;
   ```
3. Add type conversions in `mapTypeToDialect`:
   ```typescript
   if (dialect === 'mssql') {
     if (t === 'UUID') return 'UNIQUEIDENTIFIER';
     if (t === 'BOOLEAN') return 'BIT';
   }
   ```
4. Add dialect tab in `src/components/modals/SqlStudioModal.tsx`.

---

## 🌓 Theming Architecture

The theming engine is built entirely on Tailwind CSS utility classes backed by CSS variables:

```css
/* src/index.css */
:root {
  --bg-primary: #ffffff;
  --text-primary: #0f172a;
  --card-bg: #ffffff;
  --border-color: #e2e8f0;
  --canvas-bg: #f8fafc;
  --canvas-grid: #cbd5e1;
}

.dark {
  --bg-primary: #090d16;
  --text-primary: #f8fafc;
  --card-bg: #111827;
  --border-color: #1e293b;
  --canvas-bg: #0b0f19;
  --canvas-grid: #243048;
}
```

- In `tailwind.config.js`, semantic names map directly to CSS variables (`background: 'var(--bg-primary)'`, etc.).
- When `toggleTheme` is called, `classList.toggle('dark')` updates `document.documentElement`, instantly updating the entire canvas, grid dots, and modals with zero layout shift.

