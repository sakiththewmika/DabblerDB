# Changelog

All notable changes to DabblerDB are listed here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Phone layout: the Studio panel is a bottom sheet (Inspector, SQL Studio and Modules tabs, with a handle and a close arrow), the collapsed strip floats over the canvas, and tapping a table only selects it instead of covering the screen. Search, module filters, database choice, templates, import, export and reset are in a "More" menu. The zoom bar shows icons only, and text fields are 16px so iPhones do not zoom the page.
- Touch and pen support: pan, move tables, connect foreign keys, reorder columns and resize the panel with a finger or pen; pinch to zoom; double-tap to edit.
- Keyboard control of the canvas: `Tab` to a table, `Enter` to select it, arrow keys to move it. Skip link, visible focus outline, and reduced-motion support.
- Screen reader support: names for every button and field, tab/dialog/separator roles, spoken summaries for tables, and a test that fails if a button or field loses its name.
- A real SQL tokenizer and parser (`src/utils/sqlParser/`): handles `pg_dump` and `mysqldump` files, `ALTER TABLE ... ADD COLUMN`, casts such as `'x'::text`, `ON DELETE SET DEFAULT`, and reports the line number of problems.
- A database setting (PostgreSQL, MySQL or SQLite). New tables get columns that are valid for it, and `.sql` export uses it.
- Toast notifications with an **Undo import** button, replacing browser `alert()` pop-ups.
- Drag-and-drop import of `.sql` and `.json` files anywhere on the page.
- Empty-canvas screen with quick actions and starter templates.
- SQL import now lists everything it skipped (indexes, views, `CHECK`, composite `UNIQUE`, ...).
- Imported data (JSON files and share links) is validated before it is loaded.
- Saved data in `localStorage` is validated on start-up, so damaged data no longer crashes the app.

### Changed
- The top bar no longer runs off the screen on laptop-sized windows (it needed 1536px). Below 1280px its extra controls move into the "More" menu, and the Import, Export and Templates names only show on very wide screens.
- Colours now meet WCAG AA contrast (4.5:1 for text). The blue accent is darker in light mode and lighter in dark mode (buttons use dark text there). Small labels, placeholders, badges (PK/FK/UQ), status messages and toolbar icons were adjusted, and the table name label at far zoom picks black or white text to suit its module colour. `colorContrast.test.ts` checks every pair so it cannot slip back.
- Deleting a table or module no longer asks "Are you sure?". It happens at once and a message offers **Undo** (also for the Delete key). Resetting and opening a shared link that replaces your work use an in-app dialog instead of the browser pop-up.
- Rapid edits to the same field (typing a description) are one undo step instead of one per keystroke.
- The store, toolbar, table card and inspector were split into small files with tests (see `docs/ARCHITECTURE.md`).
- CI and deploy use Node 22, which the test runner requires.

### Fixed
- Clicking a table no longer adds an empty step to the undo history. Dragging adds exactly one.
- A foreign key without `ON DELETE` is now imported as `NO ACTION` (the SQL default) instead of `CASCADE`, and `SET DEFAULT` is no longer turned into `CASCADE`.
- Type names keep the case of `enum('Small','Big')` values when importing.
- Pressing a button on the canvas (such as zoom) no longer deselects the table.
- SQL import: trailing `DEFAULT` values, composite primary keys, `schema.table` names and `ALTER TABLE ... ADD FOREIGN KEY` are now handled.
- Opening a share link no longer overwrites local edits on every reload, and asks before replacing your work.
- SQL import no longer reports success when no table was found.
- Imported tables always join an existing module.
- Underscores can be typed at the end of a name in the inspector (`user_id`).
- Two tables or columns created in the same millisecond can no longer get the same id.
