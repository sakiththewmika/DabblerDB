# Contributing to DabblerDB

Thank you for your interest in contributing to DabblerDB! We are building a lightweight, local-first visual database schema designer & SQL/DBML studio.

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md) in all project interactions.

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

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sakiththewmika/DabblerDB.git
   cd DabblerDB
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local dev server:**
   ```bash
   npm run dev
   ```

4. **Verify before creating a PR:**
   All pull requests must pass strict testing, linting, and build checks with zero errors:
   ```bash
   npm test
   npm run lint
   npm run build
   ```

## Pull Request Process

1. Ensure all verification checks (`lint` and `build`) pass locally.
2. Fill out the [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md).
3. Link any related issues in the PR description.
4. Maintainers will review your PR and provide feedback.
