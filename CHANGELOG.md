# Changelog

All notable changes to DabblerDB are listed here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Toast notifications with an **Undo import** button, replacing browser `alert()` pop-ups.
- Drag-and-drop import of `.sql` and `.json` files anywhere on the page.
- Empty-canvas screen with quick actions and starter templates.
- SQL import now lists everything it skipped (indexes, views, `CHECK`, composite `UNIQUE`, ...).
- Imported data (JSON files and share links) is validated before it is loaded.
- Saved data in `localStorage` is validated on start-up, so damaged data no longer crashes the app.

### Changed
- Rapid edits to the same field (typing a description) are one undo step instead of one per keystroke.
- The store, toolbar, table card and inspector were split into small files with tests (see `docs/ARCHITECTURE.md`).
- CI and deploy use Node 22, which the test runner requires.

### Fixed
- SQL import: trailing `DEFAULT` values, composite primary keys, `schema.table` names and `ALTER TABLE ... ADD FOREIGN KEY` are now handled.
- Opening a share link no longer overwrites local edits on every reload, and asks before replacing your work.
- SQL import no longer reports success when no table was found.
- Imported tables always join an existing module.
- Underscores can be typed at the end of a name in the inspector (`user_id`).
- Two tables or columns created in the same millisecond can no longer get the same id.
