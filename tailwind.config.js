/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--bg-primary)',
        foreground: 'var(--text-primary)',
        muted: {
          DEFAULT: 'var(--bg-muted)',
          foreground: 'var(--text-muted)',
        },
        card: {
          DEFAULT: 'var(--card-bg)',
          foreground: 'var(--card-text)',
          header: 'var(--card-header)',
        },
        border: 'var(--border-color)',
        canvas: {
          bg: 'var(--canvas-bg)',
          grid: 'var(--canvas-grid)',
        },
        accent: {
          DEFAULT: 'var(--accent-primary)',
          hover: 'var(--accent-hover)',
          foreground: 'var(--accent-foreground)',
        },
      },
    },
  },
  plugins: [],
};
