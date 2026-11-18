import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { TopToolbar } from '../toolbar/TopToolbar';
import { MoreMenu } from '../toolbar/MoreMenu';
import { ResetButton } from '../toolbar/ResetButton';
import { ConfirmDialog } from '../common/ConfirmHost';
import { SchemaCanvas } from '../canvas/SchemaCanvas';
import { TableCard } from '../canvas/TableCard';
import { ColumnRow } from '../canvas/ColumnRow';
import { ColumnTypePopup } from '../canvas/ColumnTypePopup';
import { EmptyCanvasState } from '../canvas/EmptyCanvasState';
import { SidebarPanel, SidebarRail } from '../inspector/StudioSidebar';
import { TableInspector } from '../inspector/TableInspector';
import { TableMetaSection } from '../inspector/TableMetaSection';
import { ColumnEditor } from '../inspector/ColumnEditor';
import { DockedSqlStudio } from '../inspector/DockedSqlStudio';
import { ModuleManager } from '../inspector/ModuleManager';
import { KeyboardShortcutsModal, ShortcutsDialog } from '../modals/KeyboardShortcutsModal';
import { DEFAULT_MODULES, DEFAULT_TABLES } from '../../data/defaultSchema';

/**
 * Accessibility audit. Every button and form field on every screen must have a name
 * that a screen reader can say. This catches the most common mistake: an icon-only
 * button without an aria-label.
 *
 * It reads the HTML as text, which is crude but needs no browser. For full checks,
 * also try the app with a screen reader or the browser's Lighthouse "Accessibility" report.
 */

const attr = (tag: string, name: string) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const textOf = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&[a-z#0-9]+;/gi, 'x').trim();

/** Problems found in one piece of rendered HTML. */
function audit(html: string): string[] {
  const problems: string[] = [];

  // Buttons need text or an aria-label. (A title alone is only a tooltip, and is not enough.)
  for (const m of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
    const [, attrs, inner] = m;
    const named = attr(attrs, 'aria-label') || attr(attrs, 'aria-labelledby') || textOf(inner) || /<span[^>]*sr-only/.test(inner);
    if (!named) problems.push(`button without a name: <button${attrs.slice(0, 90)}>`);
  }

  // Form fields need an aria-label, or to sit inside a <label>
  const labelSpans = [...html.matchAll(/<label\b[\s\S]*?<\/label>/g)].map((m) => [m.index!, m.index! + m[0].length]);
  for (const m of html.matchAll(/<(input|select|textarea)\b([^>]*)>/g)) {
    const [, tag, attrs] = m;
    const type = attr(attrs, 'type');
    if (type === 'hidden' || attrs.includes('class="hidden"') || (tag === 'input' && type === 'file')) continue;
    const insideLabel = labelSpans.some(([from, to]) => m.index! > from && m.index! < to);
    const labelledByFor = attr(attrs, 'id') && new RegExp(`<label[^>]*for="${attr(attrs, 'id')}"`).test(html);
    if (!attr(attrs, 'aria-label') && !attr(attrs, 'aria-labelledby') && !insideLabel && !labelledByFor) {
      problems.push(`${tag} without a label: <${tag}${attrs.slice(0, 90)}>`);
    }
  }

  // Images need alt text (or aria-hidden for decoration)
  for (const m of html.matchAll(/<img\b([^>]*)>/g)) {
    if (attr(m[1], 'alt') === undefined) problems.push(`image without alt: <img${m[1].slice(0, 60)}>`);
  }
  return problems;
}

const table = DEFAULT_TABLES.find((t) => t.columns.some((c) => c.fkTargetTableId)) ?? DEFAULT_TABLES[1];
const noop = () => {};

const screens: Array<[string, () => ReactElement]> = [
  ['top toolbar', () => <TopToolbar />],
  ['phone "More" menu', () => <MoreMenu />],
  ['reset button with label', () => <ResetButton showLabel />],
  ['canvas', () => <SchemaCanvas />],
  ['table card', () => <TableCard table={table} module={DEFAULT_MODULES[0]} zoom={1} isSelected />],
  [
    'column row',
    () => (
      <ColumnRow
        tableId={table.id}
        column={table.columns[0]}
        index={0}
        editing={null}
        isDragSource={false}
        isDropTarget={false}
        onEditingChange={noop}
        onSaveEdit={noop}
        onChangeType={noop}
        onDelete={noop}
        onStartReorder={noop}
        onStartConnecting={noop}
      />
    ),
  ],
  [
    'column row while editing the name',
    () => (
      <ColumnRow
        tableId={table.id}
        column={table.columns[0]}
        index={0}
        editing={{ colId: table.columns[0].id, field: 'name', value: 'x' }}
        isDragSource={false}
        isDropTarget={false}
        onEditingChange={noop}
        onSaveEdit={noop}
        onChangeType={noop}
        onDelete={noop}
        onStartReorder={noop}
        onStartConnecting={noop}
      />
    ),
  ],
  ['column type popup', () => <ColumnTypePopup currentType="text" onPick={noop} onClose={noop} />],
  ['empty canvas', () => <EmptyCanvasState />],
  ['sidebar (collapsed strip)', () => <SidebarRail />],
  ['sidebar (open panel)', () => <SidebarPanel />],
  ['inspector without selection', () => <TableInspector />],
  ['table details', () => <TableMetaSection table={table} />],
  ['column editor', () => <ColumnEditor table={table} column={table.columns[0]} index={0} />],
  ['SQL studio', () => <DockedSqlStudio />],
  ['module manager', () => <ModuleManager />],
];

describe('accessibility audit: every button and field has a name', () => {
  it.each(screens)('%s', (_name, render) => {
    expect(audit(renderToStaticMarkup(render()))).toEqual([]);
  });
});

describe('audit helper itself', () => {
  it('flags an icon-only button and an unlabelled input', () => {
    const problems = audit('<button type="button" title="Delete"><svg></svg></button><input type="text"/>');
    expect(problems).toHaveLength(2);
  });

  it('accepts aria-label, visible text and wrapping labels', () => {
    expect(audit('<button aria-label="Close"><svg></svg></button><button>Save</button><label>Name <input type="text"/></label>')).toEqual([]);
  });
});

describe('confirm dialog', () => {
  it('renders nothing when no question is waiting', () => {
    expect(renderToStaticMarkup(<ConfirmDialog />)).toBe('');
  });
});

describe('keyboard shortcuts dialog', () => {
  it('renders nothing while closed', () => {
    expect(renderToStaticMarkup(<KeyboardShortcutsModal />)).toBe('');
  });

  it('is a labelled modal dialog when open', () => {
    const html = renderToStaticMarkup(<ShortcutsDialog />);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="shortcuts-title"');
    expect(html).toContain('id="shortcuts-title"');
    expect(audit(html)).toEqual([]);
  });
});

describe('phone layout', () => {
  it('the Studio panel is a bottom sheet on small screens and a sized column on larger ones', () => {
    const html = renderToStaticMarkup(<SidebarPanel />);
    expect(html).toContain('max-md:fixed');
    expect(html).toContain('max-md:bottom-0');
    expect(html).toContain('md:w-[var(--studio-width)]');
    expect(html).toContain('--studio-width:');
  });

  it('the panel resize edge is hidden on phones, where it has no use', () => {
    expect(renderToStaticMarkup(<SidebarPanel />)).toMatch(/role="separator"[^>]*class="max-md:hidden|class="max-md:hidden[^"]*"[^>]*role="separator"/);
  });

  it('the collapsed strip floats over the canvas on phones', () => {
    expect(renderToStaticMarkup(<SidebarRail />)).toContain('max-md:fixed');
  });

  it('the More menu starts closed but stays in the page (the Import menu needs its file inputs)', () => {
    const html = renderToStaticMarkup(<MoreMenu />);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="compact-menu"');
    expect(html).toContain('id="compact-menu" hidden');
    expect(html).toContain('type="file"');
  });
});

describe('structure for screen readers and keyboards', () => {
  it('table cards are focusable groups with a spoken summary', () => {
    const html = renderToStaticMarkup(
      <TableCard table={table} module={DEFAULT_MODULES[0]} zoom={1} isSelected referencedTableNames={['users']} />
    );
    expect(html).toContain('role="group"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain(`aria-label="Table ${table.name}, ${table.columns.length} columns, references users, selected"`);
  });

  it('the canvas is a labelled region the skip link can jump to', () => {
    const html = renderToStaticMarkup(<SchemaCanvas />);
    expect(html).toContain('id="schema-canvas"');
    expect(html).toContain('role="region"');
  });

  it('the sidebar tabs follow the tab pattern', () => {
    const html = renderToStaticMarkup(<SidebarPanel />);
    expect(html).toContain('role="tablist"');
    expect((html.match(/role="tab"/g) ?? []).length).toBe(3);
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('role="tabpanel"');
    // only the active tab is in the Tab key order
    expect((html.match(/tabindex="-1"/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('the panel edge can be resized with the keyboard', () => {
    const html = renderToStaticMarkup(<SidebarPanel />);
    expect(html).toContain('role="separator"');
    expect(html).toContain('aria-valuemin="340"');
    expect(html).toContain('aria-valuemax="850"');
  });

  it('toolbar menus say whether they are open', () => {
    const html = renderToStaticMarkup(<TopToolbar />);
    expect(html).toContain('aria-haspopup="true"');
    expect(html).toContain('aria-expanded="false"');
  });

  it('decorative lines between tables are hidden from screen readers', () => {
    expect(renderToStaticMarkup(<SchemaCanvas />)).toContain('aria-hidden="true"');
  });
});
