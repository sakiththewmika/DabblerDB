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
| SQL export or SQL import | `src/utils/sqlCompiler.ts` |
| File import (`.sql`, `.json`, drag & drop) | `src/utils/importFiles.ts` |
| Checking data from files and links | `src/utils/schemaValidation.ts` |
| Starter templates, SQL type lists | `src/data/` |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full picture.

### Two rules worth knowing

- **Change the schema through the store actions** (`addTable`, `updateColumn`, ...). They save an undo step for you. Never edit `tables` directly.
- **Show problems with a toast, not `alert()`.** Use `toast.error('Short sentence', { details: ['more info'] })`.

## Good First Tasks

- Add `aria-label`s to the remaining icon-only buttons (accessibility).
- Make table dragging work with touch and pen (replace `onMouseDown` with pointer events in `TableCard.tsx`).
- Replace the remaining `window.confirm()` dialogs with an undo toast.
- Make the default column type depend on the SQL dialect (`gen_random_uuid()` only exists in PostgreSQL).
- Support more SQL in the importer (for example `CREATE TYPE ... AS ENUM`) and add a test in `src/utils/__tests__/`.
- Add a new starter template in `src/data/starterTemplates.ts`.

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
