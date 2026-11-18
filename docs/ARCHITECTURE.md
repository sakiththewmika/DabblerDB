# DabblerDB — Technical Architecture

This document provides a technical overview of DabblerDB's architecture, state management patterns, mathematical canvas rendering, and code compilation pipelines.

---

## 📁 Repository & Directory Layout

```
DabblerDB/
├── .github/                       # CI + Pages deploy workflows, issue & PR templates
├── docs/                          # USER_GUIDE.md, ARCHITECTURE.md (this file), screenshots
├── public/                        # Static assets, favicon
├── src/
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── SchemaCanvas.tsx       # Pan/zoom viewport, dot grid, auto-arrange
│   │   │   ├── TableCard.tsx          # One draggable table: header, drag, inline rename
│   │   │   ├── ColumnRow.tsx          # One column line: badges, inline edit, connection ports
│   │   │   ├── ColumnTypePopup.tsx    # Two-step type picker shown on the card
│   │   │   ├── useColumnReorder.ts    # Drag a column's grip to reorder
│   │   │   ├── usePinchZoom.ts        # Two-finger zoom and pan
│   │   │   ├── gestures.ts            # Pure maths for pinch and double-tap
│   │   │   ├── connectionTarget.ts    # Which table is under the pointer
│   │   │   ├── tableLabel.ts          # The sentence a screen reader says for a table
│   │   │   ├── RelationshipEdges.tsx  # SVG Bézier foreign-key curves
│   │   │   └── EmptyCanvasState.tsx   # Shown when there are no tables
│   │   ├── inspector/
│   │   │   ├── StudioSidebar.tsx      # Resizable right drawer with tabs
│   │   │   ├── TableInspector.tsx     # Selected-table editor (composes the two below)
│   │   │   ├── TableMetaSection.tsx   # Name, module, description
│   │   │   ├── ColumnEditor.tsx       # One column's full editor
│   │   │   ├── ColumnTypeSelect.tsx   # Category → type dropdowns
│   │   │   ├── DockedSqlStudio.tsx    # SQL tab: generate + apply SQL
│   │   │   └── ModuleManager.tsx      # Module (group) tab
│   │   ├── toolbar/
│   │   │   ├── TopToolbar.tsx         # Composes everything below
│   │   │   ├── ToolbarMenu.tsx        # Shared dropdown + menu row
│   │   │   ├── TemplatesMenu.tsx / ImportMenu.tsx / ExportMenu.tsx
│   │   │   ├── ModuleFilterBar.tsx    # Module pills + "+ Module"
│   │   │   └── SearchBox.tsx
│   │   ├── common/ToastHost.tsx       # Draws the toasts
│   │   └── modals/                    # Shortcuts cheat-sheet, drag-and-drop overlay
│   ├── data/                      # Starter templates, SQL type lists, module colors, dialectDefaults.ts
│   ├── hooks/                     # Keyboard shortcuts, click-outside, focus trap, double-tap
│   ├── store/
│   │   ├── useSchemaStore.ts      # The schema + undo/redo (Zustand, auto-saved)
│   │   └── useToastStore.ts       # Pop-up messages: toast.success(...) etc.
│   ├── types/schema.ts            # SchemaTable, SchemaColumn, ModuleGroup
│   ├── utils/
│   │   ├── sqlCompiler.ts         # Schema → SQL (3 dialects)
│   │   ├── sqlParser/             # SQL → schema: tokenizer.ts, ddlParser.ts, toSchema.ts
│   │   ├── pointerDrag.ts         # Press-drag-release for mouse, finger and pen
│   │   ├── importFiles.ts         # .sql / .json files → canvas, with toasts
│   │   ├── schemaValidation.ts    # Checks data from files and share links
│   │   ├── urlShare.ts            # Compressed share links
│   │   ├── diagramExporter.ts     # PNG / SVG / JSON export
│   │   ├── identifiers.ts         # Safe table/column names
│   │   └── ids.ts                 # createId('tbl' | 'col' | 'mod')
│   ├── App.tsx                    # Top-level layout
│   └── main.tsx                   # React entrypoint
├── CHANGELOG.md  CONTRIBUTING.md  SECURITY.md
└── package.json  vite.config.ts  tailwind.config.js  eslint.config.js  .nvmrc
```

Tests sit in `__tests__` folders next to the code they test.

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
|  past / future: undo & redo snapshots (not saved)              |
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

### How a change reaches the screen (and the undo stack)

Every action that changes the schema goes through one helper inside the store, `commit(...)`:

```
component  ──►  store action (e.g. updateColumn)  ──►  commit()
                                                         1. save a snapshot  → past[]   (Undo)
                                                         2. apply the change
                                                         3. clear future[]              (Redo)
                                                         4. update lastSavedAt          (auto-save)
```

- Adding a new action is usually a one-liner: `commit((state) => ({ tables: ... }))`.
- Actions that fire on every keystroke pass a `coalesceKey`. Calls with the same key within one second share a single undo step, so typing a description is one Undo, not one per letter.
- Dragging a table is the exception: `TableCard` records one snapshot when the drag starts and then calls `updateTablePosition`, which does not touch history.
- On start-up, `mergePersistedState` checks what was loaded from `localStorage`. Damaged data falls back to the starter schema instead of crashing the app.

### Messages: `useToastStore`

```typescript
toast.success('Saved');
toast.error('Could not read file', { details: ['Line 3 is broken'] });
toast.warning('Imported 3 tables', { action: { label: 'Undo import', onClick: undo } });
```

Toasts with `details` stay until closed; others disappear by themselves. `ToastHost` (mounted once in `App.tsx`) draws them. Never use `alert()`.

---

## 📥 Import Pipeline

All outside data goes through one of two doors, and both end in `importSchemaJson`:

```
 .sql file / pasted SQL ──► parseSqlToTables() ──► { tables, errors, warnings } ─┐
                                                                                 ├─► importSchemaJson ─► toast (+ Undo)
 .json file / share link ─► validateSchemaPayload() ─► { tables, modules } ──────┘
```

- `importFiles.ts` is the single entry used by the Import menu, the drag-and-drop overlay and the empty-canvas screen. It checks file type and size (5 MB), reads the file and shows the result as a toast.
- `schemaValidation.ts` rejects the wrong shape with a readable message, repairs small problems (bad coordinates, unknown module) and removes foreign keys that point at nothing.
- `importSchemaJson` moves any table with an unknown module into the first module.
- A share link (`#schema=...`) is read once and removed from the address bar, so reloading never re-imports it. If the canvas has been edited, the app asks first.

### Reading SQL: `src/utils/sqlParser/`

SQL text becomes canvas tables in three small steps. Each step lives in one file and only knows about the step before it:

```
 SQL text ──► tokenizer.ts ──► ddlParser.ts ──► toSchema.ts ──► SchemaTable[]
              cut into pieces    understand        convert, keep ids,
              (words, strings,   CREATE/ALTER      link foreign keys,
               symbols; skip     TABLE into plain  write warnings
               comments)         objects
```

1. **`tokenizer.ts`** turns `name text DEFAULT 'a;b'` into pieces. Quoted names, `'it''s'` strings, `$$ ... $$` blocks and comments each become one piece (or disappear), so no later step has to worry about a `;` or `--` hiding inside a string.
2. **`ddlParser.ts`** is a small hand-written parser (no library). It reads `CREATE TABLE` (columns, inline and table-level keys, composite keys, `schema.table` names) and `ALTER TABLE ... ADD COLUMN | PRIMARY KEY | UNIQUE | FOREIGN KEY`. It **never throws**: something it cannot understand is skipped (with a line number in the message) and the rest of the script is still read. Whatever follows the closing `)` of a table (`ENGINE=...`, `PARTITION BY`, `WITHOUT ROWID`) is ignored.
3. **`toSchema.ts`** builds the canvas tables. Tables that already exist (matched by name) keep their id, position, module and description. It also links foreign keys, uses `NO ACTION` when the SQL names no `ON DELETE`, and writes the messages.

Messages come in two kinds:
- `errors`: something is wrong (`Line 12: could not understand "..." in table "orders"`, a foreign key to a missing table).
- `warnings`: valid SQL that the canvas cannot show: other statements (`CREATE INDEX`, views, functions, `INSERT`, ...), table-level `CHECK`/`KEY`/composite `UNIQUE`, and column-level `CHECK`/`GENERATED`. Statements with no schema meaning (`SET`, `BEGIN`, `COMMIT`, `PRAGMA`) are skipped quietly.

**Why not a parsing library such as `node-sql-parser`?** A library parses far more of SQL, but its PostgreSQL build alone is about 300 KB, each dialect is a separate build, and its output would still need converting into `SchemaTable`. The hand-written parser is about 600 lines with no dependency, is written to keep going after anything it does not recognise, and only needs to know the shape of tables. If you ever need full SQL (queries, views), swap step 2 for a library: steps 1 and 3 and the rest of the app only deal in `SchemaTable[]`.

To teach the importer something new, add a case in `ddlParser.ts` (or `toSchema.ts`) **and** a test in `src/utils/sqlParser/__tests__/`.

---

## 👆 Pointer, Touch & Keyboard

- **Pointer events everywhere.** Components use `onPointerDown` (never `onMouseDown`), so mouse, finger and pen share one code path. `startPointerDrag` (`src/utils/pointerDrag.ts`) follows only the pointer that started the drag, applies a small movement threshold (so a tap is not a drag) and ends if a second finger lands, which is what lets pinch-to-zoom take over.
- **Pinch zoom** (`usePinchZoom.ts` + `gestures.ts`): the maths is a pure function, `pinchView`, that keeps the spot between your fingers fixed.
- **Releasing a dragged foreign key.** A finger reports the release on the element where the touch began, so `connectionTarget.ts` looks at what is under the pointer instead.
- **Double-tap.** Browsers do not reliably send `dblclick` for touch, so `useDoubleTap` counts taps itself.
- **CSS.** Draggable things carry `touch-none` (so the browser does not scroll or zoom the page instead). Hover-only controls are shown permanently on touch screens with `[@media(hover:none)]:`.

## ♿ Accessibility

- Every button and field has a name. The audit in `src/components/__tests__/accessibility.test.tsx` renders the screens and fails if one is missing, so new icon-only buttons need an `aria-label`.
- Tabs use `role="tablist"/"tab"/"tabpanel"` with arrow-key navigation; the panel edge is a keyboard-resizable `role="separator"`; the shortcuts dialog traps focus (`useFocusTrap`) and gives it back when closed.
- Table cards are focusable groups with a spoken summary (`tableLabel.ts`); arrow keys move them.
- A skip link jumps to the canvas, `:focus-visible` draws an outline, and `prefers-reduced-motion` switches animations off (both in `index.css`).

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

### Which database? (`dialect`)

The store keeps one `dialect` (`'postgres' | 'mysql' | 'sqlite'`). It decides the default columns of a new table (`getDefaultColumns` in `src/data/dialectDefaults.ts`: PostgreSQL gets `uuid` + `gen_random_uuid()`, the others an auto-counting id) and which SQL the Export menu writes. Changing it never edits existing tables or adds an undo step.

### Adding a New SQL Dialect
To support an additional dialect (e.g., MSSQL or Oracle):
1. Add the dialect key to `SupportedDialect` in `src/utils/sqlCompiler.ts`, and to `DIALECTS`, `DIALECT_LABELS`, `isDialect` and `getDefaultColumns` in `src/data/dialectDefaults.ts`:
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
4. The tab in `DockedSqlStudio.tsx` and the toolbar selector are built from `DIALECTS`, so they appear automatically.
5. Add tests next to `src/utils/__tests__/sqlCompiler.test.ts`.

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

