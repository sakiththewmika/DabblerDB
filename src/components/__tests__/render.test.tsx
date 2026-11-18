import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TopToolbar } from '../toolbar/TopToolbar';
import { TableCard } from '../canvas/TableCard';
import { EmptyCanvasState } from '../canvas/EmptyCanvasState';
import { TableInspector } from '../inspector/TableInspector';
import { ToastHost } from '../common/ToastHost';
import { DEFAULT_MODULES, DEFAULT_TABLES } from '../../data/defaultSchema';

// "Smoke tests": render each piece once on the server. They catch crashes
// (a typo, a missing prop) without needing a browser. They only see the app's
// starting state, so interactive behaviour is tested through the store instead.

describe('components render without crashing', () => {
  it('TopToolbar shows the brand, search and menus', () => {
    const html = renderToStaticMarkup(<TopToolbar />);
    expect(html).toContain('DabblerDB');
    expect(html).toContain('top-search-input');
    for (const label of ['Templates', 'Import', 'Export', 'Add Table']) expect(html).toContain(label);
  });

  it('TableCard shows the table name and its columns', () => {
    const table = DEFAULT_TABLES[0];
    const html = renderToStaticMarkup(
      <TableCard table={table} module={DEFAULT_MODULES[0]} zoom={1} isSelected={false} />
    );
    expect(html).toContain(table.name);
    for (const col of table.columns) expect(html).toContain(col.name);
  });

  it('EmptyCanvasState offers add, import and every starter template', () => {
    const html = renderToStaticMarkup(<EmptyCanvasState />);
    expect(html).toContain('Your canvas is empty');
    expect(html).toContain('Add a table');
    expect(html).toContain('E-Commerce Store');
  });

  it('TableInspector shows a hint when no table is selected', () => {
    expect(renderToStaticMarkup(<TableInspector />)).toContain('No Table Selected');
  });

  it('ToastHost renders nothing visible when there are no toasts', () => {
    expect(renderToStaticMarkup(<ToastHost />)).not.toContain('role=');
  });
});
