# DabblerDB

[![CI](https://github.com/dabblerdb/dabblerdb/actions/workflows/ci.yml/badge.svg)](https://github.com/dabblerdb/dabblerdb/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)

**DabblerDB** is a lightweight, local-first visual database schema designer and SQL/DBML studio running entirely in the browser. Designed for developers, database architects, and students who want rapid, zero-latency schema prototyping without signing up, configuring cloud databases, or sacrificing privacy.

---

## ✨ Features

- ⚡ **Local-First & Zero Latency**: All schema definitions and visual state stay completely in your browser via local persistence.
- 🎨 **Visual Canvas**: Drag-and-drop table entities, visually map foreign key relationships, and re-arrange tables smoothly.
- 🌓 **Dynamic Theme Switching**: Tailored Dark and Light modes powered by semantic CSS variables and Tailwind CSS.
- 💾 **SQL & DBML Generation**: Bi-directional parsing and code generation supporting PostgreSQL, MySQL, SQLite, and DBML.
- 🛡️ **Privacy by Default**: No servers, no tracking, and no external API dependencies.
- 📦 **Generic Starter Schemas**: Preloaded with clean e-commerce and blog schema templates to jumpstart design work.

---

## 🏗️ Architecture Overview

DabblerDB follows a strictly modular, client-side-only architecture:

```
src/
├── assets/         # Static assets and icons
├── components/     # UI components (Canvas, Toolbar, Sidebar, Modals)
├── store/          # Zustand store with auto-save persistence
├── types/          # TypeScript domain models (Table, Column, Relation, Dialect)
├── utils/          # SQL/DBML generators and schema parsers
├── App.tsx         # Main application layout
├── index.css       # Tailwind CSS & theme design tokens
└── main.tsx        # React entrypoint
```

- **State Management**: Zustand store managing nodes, edges, selections, and schema metadata with transparent `localStorage` persistence.
- **Rendering & Design**: Tailwind CSS utility layer built atop dynamic CSS variables for effortless Light/Dark switching.
- **Code Generation**: Pure TypeScript generators translating visual graph representations into idiomatic DDL for PostgreSQL, MySQL, SQLite, and DBML.

---

## 🚀 Getting Started

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

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🛠️ Scripts

- `npm run dev` - Starts Vite dev server with HMR.
- `npm run build` - Type-checks with TypeScript compiler (`tsc -b`) and produces production build in `dist/`.
- `npm run lint` - Lints TypeScript and React codebase via ESLint.
- `npm run preview` - Previews the production build locally.

---

## 🤝 Contributing

We welcome contributions from the community! Please read our [Contributing Guidelines](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before submitting pull requests.

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
