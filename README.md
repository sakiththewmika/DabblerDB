# DabblerDB

[![CI](https://github.com/dabblerdb/dabblerdb/actions/workflows/ci.yml/badge.svg)](https://github.com/dabblerdb/dabblerdb/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)

**DabblerDB** is a lightweight, local-first visual database schema designer and SQL/DBML studio running entirely in the browser. Designed for developers, database architects, and students who want rapid, zero-latency schema prototyping without signing up, configuring cloud databases, or sacrificing privacy.

---

## ✨ Features

- ⚡ **Local-First & Zero Latency**: All schema definitions, tables, and relationships are automatically saved to your browser's `localStorage` (`dabblerdb_schema_v1`). No cloud lock-in, zero latency, and absolute privacy.
- 🎨 **Interactive Infinite Canvas**: Smooth pan and scroll-wheel zoom (25% to 180%) over a responsive dot-grid background, complete with "Center View" and "Auto-Arrange Grid" layout tools.
- 🔗 **Animated Foreign Key Edges**: Dependency-free SVG cubic Bézier curves computed in real time between columns. Connected edges animate with a directional dashed flow when a table is selected.
- 🛠️ **Full Table & Column CRUD**: Add, rename, reorder, and delete tables and columns. Configure Primary Keys (`PK`), Unique constraints (`UQ`), Not Null rules, and custom default values.
- 🔄 **Live Foreign Key Editor**: Map foreign keys to referenced tables with configurable `ON DELETE` referential actions (`CASCADE`, `SET NULL`, `RESTRICT`, `NO ACTION`).
- 🏷️ **Color-Coded Modules**: Organize tables into modular logical domains (e.g., *Identity*, *Catalog*, *Sales*) with custom color pickers and one-click filtering.
- 🔍 **Live Search**: Instant real-time filtering across table names and column identifiers directly on the canvas.
- 💻 **Bi-Directional SQL Studio**: Generate clean, production-ready DDL for **PostgreSQL**, **MySQL 8.0**, and **SQLite 3**, complete with automatic performance indexes on foreign key columns. Edit SQL and reverse-engineer it back to visual canvas nodes with one click.
- 📥 **1-Click SQL Export**: Instantly download your full database schema as a `.sql` script with a single click.
- 🌓 **Dynamic Theme Switching**: Seamless Light Mode and Dark Mode support powered by semantic CSS variables and Tailwind CSS.
- 📦 **Generic E-Commerce Starter**: Preloaded with a clean 5-table E-Commerce starter schema (`users`, `categories`, `products`, `orders`, `order_items`).

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (Node 20+ recommended)
- npm 9+

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/dabblerdb/dabblerdb.git
   cd dabblerdb
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

4. **Build for production:**
   ```bash
   npm run build
   ```

5. **Run linter:**
   ```bash
   npm run lint
   ```

---

## 📚 Documentation

- 📖 **[User Guide](docs/USER_GUIDE.md)** — Step-by-step instructions on creating tables, linking foreign keys, using modules, canvas navigation, and SQL compilation.
- 🏗️ **[Architecture Documentation](docs/ARCHITECTURE.md)** — Technical details on state management with Zustand, SVG cubic Bézier math, and adding new SQL dialects.
- 🤝 **[Contributing Guidelines](CONTRIBUTING.md)** — Branching strategy, Conventional Commits format, and PR workflow.
- 📜 **[Code of Conduct](CODE_OF_CONDUCT.md)** — Contributor Covenant pledge and community standards.

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 8](https://vite.dev/)
- **Styling**: [Tailwind CSS 3.4](https://tailwindcss.com/) + PostCSS + Autoprefixer
- **State Management**: [Zustand 5](https://github.com/pmndrs/zustand) with `persist` middleware
- **Icons**: [Lucide React](https://lucide.dev/)
- **CI/CD**: GitHub Actions

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
