import { describe, it, expect } from 'vitest';
import { generateSvgDiagram } from '../diagramExporter';
import { DEFAULT_TABLES, DEFAULT_MODULES } from '../../data/defaultSchema';

describe('diagramExporter - SVG & PNG Theme Generation', () => {
  it('generates dark mode SVG with dark background and dark card fills', () => {
    const svgDark = generateSvgDiagram(DEFAULT_TABLES, DEFAULT_MODULES, 'dark');

    expect(svgDark).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svgDark).toContain('#0b0f19'); // Dark canvas background
    expect(svgDark).toContain('#111827'); // Dark card background
    expect(svgDark).toContain('#f8fafc'); // Dark mode table header text
  });

  it('generates light mode SVG with light background and clean white card fills', () => {
    const svgLight = generateSvgDiagram(DEFAULT_TABLES, DEFAULT_MODULES, 'light');

    expect(svgLight).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svgLight).toContain('#f8fafc'); // Light canvas background
    expect(svgLight).toContain('#ffffff'); // White card background
    expect(svgLight).toContain('#0f172a'); // Light mode table header text
  });

  it('properly escapes XML entities in table names, comments, and column types', () => {
    const customTables = [
      {
        id: 'tbl_special',
        name: 'test_<script>&"quote"',
        comment: 'A comment with <tags> & "special" characters',
        moduleId: 'mod_1',
        x: 100,
        y: 100,
        columns: [
          {
            id: 'c1',
            name: 'col_<1>',
            type: 'VARCHAR(255)',
            isPk: true,
            isNullable: false,
          },
        ],
      },
    ];

    const svg = generateSvgDiagram(customTables, DEFAULT_MODULES, 'dark');
    expect(svg).toContain('test_&lt;script&gt;&amp;&quot;quote&quot;');
    expect(svg).toContain('col_&lt;1&gt;');
    expect(svg).not.toContain('<script>');
  });

  it('handles empty tables and undefined modules without error', () => {
    const svgEmpty = generateSvgDiagram([], [], 'light');
    expect(svgEmpty).toContain('No tables in schema');
    expect(svgEmpty).toContain('#f8fafc');
  });
});
