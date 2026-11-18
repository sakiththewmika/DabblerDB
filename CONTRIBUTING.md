# Contributing to DabblerDB

Thank you for your interest in contributing to DabblerDB! We are building a lightweight, local-first visual database schema designer & SQL studio.

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md) in all project interactions.

## Your First Contribution (10 minutes)

1. **Set up** (needs [Node.js](https://nodejs.org/) 22.12 or newer; `nvm use` reads `.nvmrc`):
   ```bash
   git clone https://github.com/sakiththewmika/DabblerDB.git
   cd DabblerDB
   npm install
   npm run dev      # open http://localhost:5173
   ```
2. **Find something to do.** Look for issues labelled `good first issue`, or pick from the list below.
3. **Make a small change**, run `npm test`, `npm run lint` and `npm run build`, then open a pull request.

You do not need to understand the whole project. Most changes touch one or two files.

## Where Things Live

| I want to change... | Look in |
| :--- | :--- |
| Something the user clicks in the top bar | `src/components/toolbar/` (one file per menu) |
| A table card on the canvas, or a column row | `src/components/canvas/` (`TableCard.tsx`, `ColumnRow.tsx`) |
| The right-hand editing panel | `src/components/inspector/` (`ColumnEditor.tsx`, `TableMetaSection.tsx`) |
| What an action does to the schema (add table, delete column, undo) | `src/store/useSchemaStore.ts` |
| Pop-up messages | `src/store/useToastStore.ts` — call `toast.success('...')` from anywhere |
| SQL export | `src/utils/sqlCompiler.ts` |
| SQL import (reading `.sql` text) | `src/utils/sqlParser/` — `tokenizer.ts` → `ddlParser.ts` → `toSchema.ts` |
| Dragging with mouse, finger or pen | `src/utils/pointerDrag.ts`, `src/components/canvas/gestures.ts` |
| Which columns a new table gets | `src/data/dialectDefaults.ts` |
| File import (`.sql`, `.json`, drag & drop) | `src/utils/importFiles.ts` |
| Checking data from files and links | `src/utils/schemaValidation.ts` |
| Starter templates, SQL type lists | `src/data/` |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full picture.

### Rules worth knowing

- **Change the schema through the store actions** (`addTable`, `updateColumn`, ...). They save an undo step for you. Never edit `tables` directly.
- **Show problems with a toast, not `alert()`.** Use `toast.error('Short sentence', { details: ['more info'] })`.
- **Don't use `window.confirm()`.** For a delete, do the change and offer Undo: `doWithUndo('Deleted table "x"', () => deleteTable(id))` (`src/utils/undoToast.ts`). For something that replaces the whole schema, ask with `await confirmDialog({ title, message, confirmLabel, danger: true })` (`src/store/useConfirmStore.ts`).
- **Keep text readable.** Normal text needs a contrast ratio of 4.5:1 (icons and large text 3:1) in both themes. Prefer the theme colours (`text-muted-foreground`, `text-accent`). If you use a fixed colour such as `text-emerald-500`, add the pair to `src/utils/__tests__/colorContrast.test.ts` to check it. Don't dim text with opacity (`text-muted-foreground/60`).
- **Every button and field needs a name for screen readers.** An icon-only button needs `aria-label="..."`. The test in `src/components/__tests__/accessibility.test.tsx` fails if you forget.
- **Use pointer events, not mouse events** (`onPointerDown`, not `onMouseDown`), so touch and pen work. `startPointerDrag` in `src/utils/pointerDrag.ts` does the boring parts for you.

## Good First Tasks

- Add a new starter template in `src/data/starterTemplates.ts`.
- Teach the SQL importer something new (for example `CREATE TYPE ... AS ENUM`, or `ALTER TABLE ... ALTER COLUMN ... SET DEFAULT`): add a case in `src/utils/sqlParser/` and a test next to it.
- Add `happy-dom` as a dev dependency and write click-and-type tests for the toolbar menus.
- Make the Studio panel usable on a phone (it is 340px wide at minimum).

## Writing Tests

Tests live in `__tests__` folders next to the code and run with `npm test` (Vitest). The easiest ones to copy from:

- `src/utils/__tests__/sqlParserEdgeCases.test.ts` — feed SQL text in, check the tables that come out.
- `src/store/__tests__/useSchemaStore.test.ts` — call a store action, check the result and undo.

A bug fix should come with a test that fails without the fix.

## Branching Guidelines

- Always branch off `main`.
- Name your branch according to the type of work:
  - `feat/<feature-name>` for new features or capabilities
  - `fix/<bug-name>` for bug fixes
  - `chore/<task-name>` for maintenance, dependencies, or scaffolding
  - `docs/<doc-name>` for documentation updates
- Keep pull requests focused, concise, and modular.

## Commit Message Standards

We strictly follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<optional scope>): <description>

[optional body]

[optional footer(s)]
```

Common types:
- `feat`: A new user-facing feature
- `fix`: A bug fix
- `chore`: Maintenance, config, or dependency updates
- `docs`: Documentation changes
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `style`: Changes that do not affect code logic (formatting, etc.)
- `test`: Adding or correcting tests
- `ci`: CI/CD workflow updates

Example:
```
feat(canvas): add pan and zoom controls to schema designer
```

## Local Development Workflow

Setup is described in [Your First Contribution](#your-first-contribution-10-minutes). Before creating a PR:

1. **Verify:**
   All pull requests must pass testing, linting, and build checks with zero errors:
   ```bash
   npm test
   npm run lint
   npm run build
   ```

## Pull Request Process

1. Ensure all verification checks (`test`, `lint` and `build`) pass locally.
2. Fill out the [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md).
3. Link any related issues in the PR description.
4. Maintainers will review your PR and provide feedback.
