# DabblerDB — User Guide

Welcome to **DabblerDB**! This guide is designed to help you quickly master schema modeling, relationship mapping, SQL generation, and workspace exports.

---

## 🧭 Interface Overview

The interface consists of four primary areas:
1. **Top Navigation Toolbar**: Undo/Redo history, scrollable module filter pills, live table & column search (`/`), `+ Add Table` (`Shift + N`), Starter `Templates`, dedicated `Import` (JSON, SQL), multi-format `Export` (.sql, PNG, SVG, JSON, URL Link), and Dark/Light theme toggle.
2. **Infinite Interactive Canvas**: Visual workspace where tables, column rows, and precision cubic Bézier foreign key curves are rendered.
3. **Docked Resizable Sidebar**: Multi-tab drawer holding the **Inspector** (columns, constraints, FK mappings), **SQL Studio** (live multi-dialect DDL editor and reverse compiler), and **Modules** manager.
4. **Bottom-Left Viewport Toolbar**: Viewport zoom controls (`-`, `% readout`, `+`), `Center View`, `Auto-Arrange Grid`, toggleable canvas grid cells, and `?` Keyboard Shortcuts reference.

---

## 🏗️ Creating & Managing Tables

### 1. Adding a New Table
- Click the **`+ Add Table`** button in the top toolbar, or press **`Shift + N`**.
- A new table node will appear centered in your viewport and open automatically in the right inspector.

### 2. Renaming & Documenting Tables
- **Inline Canvas Editing**: Double-click the table name in the card header on the canvas. Type the new name and press **`Enter`** (or click away). Press **`Esc`** to cancel.
- **Inspector Drawer**: Select a table by clicking anywhere on its card to edit:
  - **Table Name**: Type a new name (e.g., `customers`). Names are automatically formatted into clean SQL identifiers.
  - **Module Group**: Assign the table to a color-coded module (e.g., Identity, Catalog, Sales).
  - **Description / Comment**: Add optional documentation notes (displayed cleanly on canvas cards and vector exports).

### 3. Deleting or Duplicating a Table
- **Duplicate**: Select a table and press **`Cmd / Ctrl + D`** to duplicate it with a +40px offset.
- **Delete**: Select a table and press **`Delete`** / **`Backspace`**, or click the **Trash icon** in the inspector header.
- Deleting a table automatically cleans up any foreign key relationships that reference it.

---

## 🔢 Managing Columns & Data Types

### 1. Direct Inline Column Editing on Canvas Cards
- **Double-Click Name**: Double-click any column name on a table card to edit it inline.
- **Double-Click Type**: Double-click any data type badge on a table card to open the quick two-step category $\to$ type selector.
- **`+ Add Column` Button**: Hover over any table card to reveal the subtle `+ Add Column` footer button. Clicking it instantly appends a new column and focuses its inline editor.
- **Row Reorder & Quick Delete**: Drag-and-drop column rows to reorder them directly on the card, or hover over a column to reveal the quick delete (`×`) icon.

### 2. Constraints & Badges
- **`PK` (Primary Key)**: Marks the column as primary key (`isPk: true`). Automatically enforces `NOT NULL`.
- **`FK` (Foreign Key)**: Indicates foreign key reference to another table.
- **`UQ` (Unique)**: Adds a unique constraint (`isUnique: true`).
- **`Not Null`**: Toggle to enforce required non-null values (`isNullable: false`).
- **Default Value**: Enter a default expression (e.g., `'active'`, `CURRENT_TIMESTAMP`, `gen_random_uuid()`, `0`).

---

## 🔗 Precision Foreign Key Edges & Drag-to-Connect Ports

DabblerDB automatically calculates and renders SVG cubic Bézier curves anchored directly between column rows:

### 1. Drag-to-Connect Visual Ports
1. Hover over any column row on a canvas card to reveal the left and right connection port dots.
2. Click and drag a connection line from a column port.
3. Drop it onto a target table card. DabblerDB automatically establishes the foreign key relationship and binds it to the target's primary key (`PK`).

### 2. Configuring Referential Actions (`ON DELETE`)
Open the table in the right-hand **Inspector** drawer to configure the referential action:
- `CASCADE`: Deleting the parent row deletes matching child rows.
- `SET NULL`: Deleting the parent row sets the child's FK column to `NULL`.
- `RESTRICT`: Prevents deletion of the parent row if child rows exist.
- `NO ACTION`: Standard SQL default.

### 3. Live Edge Highlighting
- When a table is selected, all connected relationship curves are highlighted with an **animated dashed flow**, while unrelated edges are gently dimmed.
- Self-referencing relationships (e.g., `employees.manager_id -> employees.id`) automatically loop cleanly around the card.

---

## 🎨 Organizing with Color-Coded Modules

Modules allow you to group related tables logically:
- **Default Modules**:
  - 🔵 **Identity** (`users`, `profiles`)
  - 🟢 **Catalog** (`categories`, `products`)
  - 🟡 **Sales** (`orders`, `order_items`)
- **Creating Custom Modules**:
  1. Click **`+ Module`** in the top navigation toolbar.
  2. Enter a module name (e.g., `Billing`, `Analytics`).
  3. Pick a theme color preset.
  4. Click **`Create Module`**.
- **Filtering by Module**:
  - The module pill container displays up to ~3 modules and scrolls horizontally (`overflow-x-auto`).
  - Click any module pill in the toolbar to focus exclusively on those tables. Other tables are dimmed for visual clarity.

---

## ⌨️ Global Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Cmd / Ctrl + Z` | Undo last schema mutation |
| `Cmd / Ctrl + Shift + Z` / `Ctrl + Y` | Redo schema mutation |
| `Shift + N` | Create a new table in the center of the canvas |
| `Cmd / Ctrl + D` | Duplicate the currently selected table |
| `Cmd / Ctrl + K` or `/` | Focus the table & column search bar |
| `Delete` / `Backspace` | Delete the currently selected table |
| `Escape` | Deselect current table / close modals & popovers |
| `?` | Open the keyboard shortcuts cheat-sheet modal |

---

## 💻 Docked SQL Studio & Multi-Dialect Compiler

Click the **`SQL Studio`** tab in the right sidebar (or open it from the top toolbar) to use the bi-directional SQL compiler:

1. **Multi-Dialect Code Generation**:
   - Switch between **PostgreSQL**, **MySQL 8.0**, and **SQLite 3** tabs.
   - Includes automatic `CREATE INDEX` performance statements on all foreign key columns.
2. **Reverse-Engineering (SQL to Canvas)**:
   - Edit SQL statements or paste your own `CREATE TABLE` scripts directly into the editor.
   - Click **`Apply SQL Changes to Canvas`** to parse the DDL into visual nodes and relationships.
3. **Copy & 1-Click Download**:
   - Click **`Copy SQL`** to copy the generated script to your clipboard.
   - Click **`Download .sql`** to save the DDL file.

---

## 📥 Import, Export & Sharing

### 1. Dedicated Import Dropdown (`Import ▾`)
- **JSON Workspace**: Restores full schema layouts (tables, coordinates, modules, colors).
- **SQL DDL Script**: Parses `.sql` DDL files (e.g. PostgreSQL, MySQL `CREATE TABLE`) directly into visual canvas tables and foreign key relations.

### 2. Export & Share Dropdown (`Export ▾`)
- **Export .sql**: PostgreSQL / SQL DDL script ready for production deployment.
- **Export PNG Image**: High-resolution 2x retina diagram image automatically matched to your current Light or Dark theme.
- **Export SVG Diagram**: Scalable vector graphics diagram with truncated descriptions for READMEs and documentation.
- **Export JSON Workspace**: Complete backup of tables, positions, and module colors.
- **Share via URL Link**: Generates a shareable URL hash containing the compressed schema—no server storage required.

---

## 🌓 Dark / Light Theming & Auto-Save

- **Theme Toggle**: Click the **Sun / Moon** icon in the toolbar to switch between dark and light modes. Canvas grid cells, cards, badges, edges, and diagram exports adapt instantly.
- **Local-First Auto-Save**: All changes are automatically persisted to your browser's `localStorage` (`dabblerdb_schema_v1`). You can safely refresh or close your browser without losing work.
- **Starter Templates**: Use the **Templates** dropdown to load starter schemas: *E-Commerce Store*, *SaaS Multi-Tenant & RBAC*, and *Blog & CMS*.
