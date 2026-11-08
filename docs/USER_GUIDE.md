# DabblerDB (PrismDB Studio) — User Guide

Welcome to **DabblerDB**! This guide is designed to help you quickly master schema modeling, relationship mapping, and SQL generation.

---

## 🧭 Interface Overview

The interface consists of four primary areas:
1. **Top Navigation Toolbar**: Module filter pills, search input, "+ Add Table", "SQL Studio", "Export .sql", "Reset Demo", and Light/Dark theme toggle.
2. **Infinite Interactive Canvas**: Visual workspace where tables and dynamic relationship curves are rendered.
3. **Right-Hand Inspector Drawer**: Slide-out properties panel to edit the currently selected table, columns, and foreign keys.
4. **Bottom-Left Viewport Toolbar**: Zoom controls (`-`, `% readout`, `+`), `Center View`, and `Auto-Arrange Grid`.

---

## 🏗️ Creating & Managing Tables

### 1. Adding a New Table
- Click the **`+ Add Table`** button in the top toolbar, or click **`Create New Table`** in the empty inspector.
- A new table node will appear on the canvas and open automatically in the right inspector.

### 2. Renaming & Documenting Tables
- Select a table by clicking anywhere on its card.
- In the right-hand Inspector:
  - **Table Name**: Type a new name (e.g., `customers`). Names are automatically formatted into clean SQL identifiers.
  - **Module Group**: Assign the table to a color-coded module (e.g., Identity, Catalog, Sales).
  - **Description / Comment**: Add optional documentation notes.

### 3. Deleting a Table
- Click the **Trash icon** in the inspector header.
- Deleting a table automatically cleans up any foreign key relationships that reference it.

---

## 🔢 Managing Columns & Data Types

Each table contains an ordered list of columns:

### 1. Adding & Editing Columns
- Click **`+ Add Column`** in the inspector.
- **Name**: Enter the column identifier (e.g., `email`, `created_at`).
- **Type**: Choose or type any SQL type (use the built-in datalist for autocomplete: `UUID`, `SERIAL`, `VARCHAR(255)`, `TEXT`, `INT`, `BOOLEAN`, `NUMERIC(12,2)`, `TIMESTAMPTZ`, etc.).
- **Default Value**: Enter a default expression (e.g., `'customer'`, `CURRENT_TIMESTAMP`, `0`).

### 2. Constraints & Badges
- **`PK` (Primary Key)**: Marks the column as primary key (`isPk: true`). Automatically enforces `NOT NULL`.
- **`UQ` (Unique)**: Adds a unique constraint (`isUnique: true`).
- **`Not Null`**: Uncheck to allow null values (`isNullable: true`).

### 3. Reordering Columns
- Use the **`↑`** and **`↓`** arrows next to any column to change its sequence within the table.

---

## 🔗 Linking Foreign Keys & Relationships

DabblerDB automatically calculates and renders SVG cubic Bézier curves between tables:

### 1. Creating a Foreign Key
1. Select the table containing the foreign key column (e.g., `orders`).
2. Locate the column you want to link (e.g., `user_id`).
3. Under **Foreign Key Relation**, open the target table dropdown and select the referenced table (e.g., `FK → users`).
4. Select the desired **`ON DELETE`** referential action:
   - `CASCADE`: Deleting the parent row deletes matching child rows.
   - `SET NULL`: Deleting the parent row sets the child's FK column to `NULL`.
   - `RESTRICT`: Prevents deletion of the parent row if child rows exist.
   - `NO ACTION`: Standard SQL default.

### 2. Live Canvas Edge Highlighting
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
  - Click any module pill in the toolbar to focus exclusively on those tables. Other tables are dimmed for visual clarity.

---

## 🖱️ Canvas Navigation & Shortcuts

- **Pan**: Click and drag any empty area of the canvas.
- **Zoom**: Scroll your mouse wheel or trackpad (25% to 180%).
- **Center View**: Click **`Center`** in the bottom-left toolbar to frame all tables.
- **Auto-Arrange Grid**: Click **`Grid`** in the bottom-left toolbar to neatly reorganize all tables into an organized grid layout.
- **Deselect**: Click any empty canvas area or press **`Esc`**.

---

## 💻 SQL Studio & DDL Compiler

Click **`SQL Studio`** in the top toolbar to open the bi-directional SQL compiler:

1. **Multi-Dialect Code Generation**:
   - Switch between **PostgreSQL**, **MySQL 8.0**, and **SQLite 3** tabs.
   - Includes automatic `CREATE INDEX` performance statements on all foreign key columns.
2. **Reverse-Engineering (SQL to Canvas)**:
   - Edit the SQL statements or paste your own `CREATE TABLE` script directly into the editor.
   - Click **`Apply SQL Changes to Canvas`** to parse the DDL into visual nodes and relationships.
3. **Copy & Export**:
   - Click **`Copy SQL`** to copy the script to your clipboard.
   - Click **`Download .sql`** to download the schema file.
   - In the main toolbar, use **`Export .sql`** for instant 1-click download without opening the modal.

---

## 🌓 Dark / Light Theming & Auto-Save

- **Theme Toggle**: Click the **Sun / Moon** icon in the toolbar to switch between dark and light modes. All canvas grid dots, table cards, badges, and lines adapt instantly.
- **Local-First Auto-Save**: All changes are automatically persisted to your browser's `localStorage` (`prismdb_schema_v1`). You can safely refresh or close your browser without losing work.
- **Reset Starter**: Click the **Reset** icon in the toolbar anytime to restore the default generic 5-table E-Commerce schema.
