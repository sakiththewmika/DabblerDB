/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { blend, contrastRatio, hexToRgb, readableTextColor, type Rgb } from '../contrast';
import { MODULE_COLORS } from '../../data/moduleColors';

/**
 * Colour contrast check (WCAG AA): normal text needs a ratio of 4.5, large text and icons 3.
 * The theme colours are read from src/index.css, so changing a colour there is checked here.
 * If you add a new text-on-background combination to the UI, add a line to `pairs` below.
 */

// Read the file as plain text (importing a .css file in tests gives an empty string)
const css = readFileSync(new URL('../../index.css', import.meta.url), 'utf8');
function themeColors(selector: ':root' | '.dark'): Record<string, string> {
  const block = css.match(new RegExp(`${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`))![1];
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,6})/g)].map((m) => [m[1], m[2]]));
}

// Tailwind palette values used with hard-coded classes in the components
const T = {
  white: '#ffffff', slate900: '#0f172a', slate800: '#1e293b', slate700: '#334155',
  slate600: '#475569', slate500: '#64748b', slate400: '#94a3b8', slate300: '#cbd5e1',
  red400: '#f87171', red500: '#ef4444', red600: '#dc2626', red700: '#b91c1c',
  emerald400: '#34d399', emerald500: '#10b981', emerald600: '#059669', emerald700: '#047857',
  amber400: '#fbbf24', amber500: '#f59e0b', amber600: '#d97706', amber700: '#b45309', amber800: '#92400e',
  blue400: '#60a5fa', blue500: '#3b82f6', blue600: '#2563eb', blue700: '#1d4ed8',
  purple400: '#a78bfa', purple500: '#8b5cf6', purple600: '#7c3aed', purple700: '#6d28d9',
  cyan600: '#0891b2', cyan700: '#0e7490',
};

type Pair = { name: string; text: Rgb | string; background: Rgb | string; min: number };

function pairsFor(theme: 'light' | 'dark'): Pair[] {
  const c = themeColors(theme === 'light' ? ':root' : '.dark');
  const dark = theme === 'dark';
  const pick = (light: string, darkValue: string) => (dark ? darkValue : light);
  const accentTint = (alpha: number) => blend(c['accent-primary'], c['card-bg'], alpha);
  const tint = (color: string, alpha: number) => blend(color, c['card-bg'], alpha);

  return [
    // Theme colours
    { name: 'text on page', text: c['text-primary'], background: c['bg-primary'], min: 4.5 },
    { name: 'muted text on page', text: c['text-muted'], background: c['bg-primary'], min: 4.5 },
    { name: 'muted text on card', text: c['text-muted'], background: c['card-bg'], min: 4.5 },
    { name: 'muted text on chips', text: c['text-muted'], background: c['bg-muted'], min: 4.5 },
    { name: 'muted text on card header', text: c['text-muted'], background: blend(c['card-header'], c['card-bg'], 0.5), min: 4.5 },
    { name: 'muted text on canvas', text: c['text-muted'], background: c['canvas-bg'], min: 4.5 },
    { name: 'accent text on page', text: c['accent-primary'], background: c['bg-primary'], min: 4.5 },
    { name: 'accent text on card', text: c['accent-primary'], background: c['card-bg'], min: 4.5 },
    { name: 'accent text on soft accent background', text: c['accent-primary'], background: accentTint(0.2), min: 4.5 },
    { name: 'button text on accent', text: c['accent-foreground'], background: c['accent-primary'], min: 4.5 },
    { name: 'button text on accent (hover)', text: c['accent-foreground'], background: c['accent-hover'], min: 4.5 },

    // Hard-coded colours in the components
    { name: 'form label (slate on card)', text: pick(T.slate600, T.slate400), background: c['card-bg'], min: 4.5 },
    { name: 'input placeholder', text: pick(T.slate500, T.slate400), background: pick(T.white, T.slate900), min: 4.5 },
    { name: 'input text', text: pick(T.slate900, '#f1f5f9'), background: pick(T.white, T.slate900), min: 4.5 },
    { name: 'search icon / clear button', text: pick(T.slate500, T.slate400), background: pick(T.white, T.slate900), min: 3 },
    { name: 'PK badge', text: pick(T.amber800, T.amber400), background: tint(T.amber500, 0.15), min: 4.5 },
    { name: 'FK badge', text: pick(T.blue700, T.blue400), background: tint(T.blue500, 0.15), min: 4.5 },
    { name: 'UQ badge', text: pick(T.purple700, T.purple400), background: tint(T.purple500, 0.15), min: 4.5 },
    { name: 'success text (Auto-saved, SQL ok)', text: pick(T.emerald700, T.emerald400), background: c['card-bg'], min: 4.5 },
    { name: 'success message box', text: pick(T.emerald700, T.emerald400), background: tint(T.emerald500, 0.1), min: 4.5 },
    { name: 'error message box', text: pick(T.red700, T.red400), background: tint(T.red500, 0.1), min: 4.5 },
    { name: 'success icon', text: pick(T.emerald600, T.emerald500), background: c['card-bg'], min: 3 },
    { name: 'error icon', text: pick(T.red600, T.red500), background: c['card-bg'], min: 3 },
    { name: 'warning icon', text: pick(T.amber600, T.amber500), background: c['card-bg'], min: 3 },
    { name: 'primary key marker in inspector', text: pick(T.amber700, T.amber500), background: c['card-bg'], min: 4.5 },
    { name: 'toolbar menu icon: blue', text: pick(T.blue700, T.blue400), background: tint(T.blue500, 0.1), min: 3 },
    { name: 'toolbar menu icon: emerald', text: pick(T.emerald700, T.emerald400), background: tint(T.emerald500, 0.1), min: 3 },
    { name: 'toolbar menu icon: purple', text: pick(T.purple700, T.purple400), background: tint(T.purple500, 0.1), min: 3 },
    { name: 'toolbar menu icon: amber', text: pick(T.amber700, T.amber400), background: tint(T.amber500, 0.1), min: 3 },
    { name: 'toolbar menu icon: cyan', text: pick(T.cyan700, '#22d3ee'), background: tint('#06b6d4', 0.1), min: 3 },
    { name: 'toolbar menu icon on hover: blue', text: T.white, background: T.blue600, min: 3 },
    { name: 'toolbar menu icon on hover: emerald', text: T.white, background: T.emerald600, min: 3 },
    { name: 'toolbar menu icon on hover: purple', text: T.white, background: T.purple600, min: 3 },
    { name: 'toolbar menu icon on hover: amber', text: T.white, background: T.amber600, min: 3 },
    { name: 'toolbar menu icon on hover: cyan', text: T.white, background: T.cyan600, min: 3 },
    { name: 'delete button (red)', text: T.white, background: T.red600, min: 4.5 },
  ];
}

describe('colour contrast', () => {
  for (const theme of ['light', 'dark'] as const) {
    describe(`${theme} theme`, () => {
      for (const p of pairsFor(theme)) {
        it(`${p.name} is at least ${p.min}:1`, () => {
          const ratio = contrastRatio(p.text, p.background);
          expect(ratio, `${p.name} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(p.min);
        });
      }
    });
  }

  it('picks black or white text so a module colour label is always readable', () => {
    for (const color of MODULE_COLORS) {
      expect(contrastRatio(readableTextColor(color), color), color).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('does the maths right (black on white is 21:1)', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
  });
});
