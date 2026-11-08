import type { SchemaTable, ModuleGroup } from '../types/schema';

export function generateSvgDiagram(tables: SchemaTable[], modules: ModuleGroup[]): string {
  if (tables.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><text x="50" y="100" fill="#888">No tables in schema</text></svg>`;
  }

  const TABLE_WIDTH = 288;
  const moduleMap = new Map(modules.map((m) => [m.id, m]));

  // Calculate bounding box
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  tables.forEach((t) => {
    const tableHeight = 44 + (t.comment ? 28 : 0) + t.columns.length * 29 + 12;
    if (t.x < minX) minX = t.x;
    if (t.y < minY) minY = t.y;
    if (t.x + TABLE_WIDTH > maxX) maxX = t.x + TABLE_WIDTH;
    if (t.y + tableHeight > maxY) maxY = t.y + tableHeight;
  });

  const padding = 60;
  const viewBoxX = minX - padding;
  const viewBoxY = minY - padding;
  const viewBoxWidth = maxX - minX + padding * 2;
  const viewBoxHeight = maxY - minY + padding * 2;

  const svgParts: string[] = [];

  // SVG Header with styles
  svgParts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}" width="${viewBoxWidth}" height="${viewBoxHeight}" style="background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">`,
    `<defs>`,
    `  <filter id="card-shadow" x="-5%" y="-5%" width="110%" height="115%">`,
    `    <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.4"/>`,
    `  </filter>`,
    `</defs>`,
    `<!-- Background -->`,
    `<rect x="${viewBoxX}" y="${viewBoxY}" width="${viewBoxWidth}" height="${viewBoxHeight}" fill="#0b0f19" />`
  );

  // 1. Draw Relationship Bézier Edges
  svgParts.push(`<!-- Relationship Edges -->`);
  tables.forEach((sourceTable) => {
    sourceTable.columns.forEach((sourceCol, colIndex) => {
      if (!sourceCol.fkTargetTableId) return;

      const targetTable = tables.find((t) => t.id === sourceCol.fkTargetTableId);
      if (!targetTable) return;

      const sourceHeaderHeight = 44 + (sourceTable.comment ? 28 : 0);
      const sourceY = sourceTable.y + sourceHeaderHeight + colIndex * 29 + 14.5;

      let targetColIndex = targetTable.columns.findIndex((c) => c.id === sourceCol.fkTargetColumnId);
      if (targetColIndex === -1) {
        targetColIndex = targetTable.columns.findIndex((c) => c.isPk);
        if (targetColIndex === -1) targetColIndex = 0;
      }

      const targetHeaderHeight = 44 + (targetTable.comment ? 28 : 0);
      const targetY = targetTable.y + targetHeaderHeight + targetColIndex * 29 + 14.5;

      const isSelf = sourceTable.id === targetTable.id;
      const targetModuleColor = moduleMap.get(targetTable.moduleId)?.color || '#3b82f6';

      let d: string;
      let sX: number;
      let sY: number;
      let tX: number;
      let tY: number;

      if (isSelf) {
        sX = sourceTable.x + TABLE_WIDTH;
        sY = sourceY;
        tX = sourceTable.x + TABLE_WIDTH - 20;
        tY = sourceTable.y;
        const loopOut = sourceTable.x + TABLE_WIDTH + 45;
        d = `M ${sX} ${sY} C ${loopOut} ${sY}, ${loopOut} ${sourceTable.y - 25}, ${tX} ${sourceTable.y - 25} L ${tX} ${tY}`;
      } else {
        const sourceRight = sourceTable.x + TABLE_WIDTH;
        const targetRight = targetTable.x + TABLE_WIDTH;

        if (targetTable.x >= sourceRight - 40) {
          sX = sourceRight;
          sY = sourceY;
          tX = targetTable.x;
          tY = targetY;
          const dx = Math.max(40, (tX - sX) * 0.45);
          d = `M ${sX} ${sY} C ${sX + dx} ${sY}, ${tX - dx} ${tY}, ${tX} ${tY}`;
        } else if (targetRight <= sourceTable.x + 40) {
          sX = sourceTable.x;
          sY = sourceY;
          tX = targetRight;
          tY = targetY;
          const dx = Math.max(40, (sX - tX) * 0.45);
          d = `M ${sX} ${sY} C ${sX - dx} ${sY}, ${tX + dx} ${tY}, ${tX} ${tY}`;
        } else {
          sX = sourceRight;
          sY = sourceY;
          tX = targetRight;
          tY = targetY;
          const offsetOut = Math.max(sX, tX) + 50;
          d = `M ${sX} ${sY} C ${offsetOut} ${sY}, ${offsetOut} ${tY}, ${tX} ${tY}`;
        }
      }

      svgParts.push(
        `<path d="${d}" fill="none" stroke="${targetModuleColor}" stroke-width="2" stroke-opacity="0.8" />`,
        `<circle cx="${sX}" cy="${sY}" r="3" fill="${targetModuleColor}" />`,
        `<circle cx="${tX}" cy="${tY}" r="4" fill="${targetModuleColor}" />`
      );
    });
  });

  // 2. Draw Table Cards
  svgParts.push(`<!-- Table Cards -->`);
  tables.forEach((table) => {
    const mod = moduleMap.get(table.moduleId);
    const modColor = mod?.color || '#3b82f6';
    const tableHeight = 44 + (table.comment ? 28 : 0) + table.columns.length * 29 + 12;

    svgParts.push(
      `<g transform="translate(${table.x}, ${table.y})" filter="url(#card-shadow)">`,
      `  <!-- Card Box -->`,
      `  <rect width="${TABLE_WIDTH}" height="${tableHeight}" rx="12" fill="#111827" stroke="#1e293b" stroke-width="1" />`,
      `  <!-- Module Color Top Strip -->`,
      `  <rect width="${TABLE_WIDTH}" height="6" rx="3" fill="${modColor}" />`,
      `  <!-- Header Background -->`,
      `  <rect y="6" width="${TABLE_WIDTH}" height="38" fill="#1f2937" fill-opacity="0.5" />`,
      `  <!-- Table Name -->`,
      `  <circle cx="16" cy="25" r="4" fill="${modColor}" />`,
      `  <text x="28" y="29" fill="#f8fafc" font-size="13" font-weight="bold">${table.name}</text>`,
      `  <text x="${TABLE_WIDTH - 16}" y="29" fill="#94a3b8" font-size="10" text-anchor="end" font-family="monospace">${table.columns.length} cols</text>`
    );

    let currentY = 44;

    if (table.comment) {
      svgParts.push(
        `  <rect y="${currentY}" width="${TABLE_WIDTH}" height="28" fill="#1f2937" fill-opacity="0.25" />`,
        `  <text x="16" y="${currentY + 18}" fill="#94a3b8" font-size="11" font-style="italic">${table.comment}</text>`
      );
      currentY += 28;
    }

    // Column rows
    table.columns.forEach((col) => {
      const rowY = currentY;
      svgParts.push(
        `  <!-- Column ${col.name} -->`,
        `  <line x1="0" y1="${rowY}" x2="${TABLE_WIDTH}" y2="${rowY}" stroke="#1e293b" stroke-width="1" stroke-opacity="0.5" />`
      );

      let textX = 16;
      if (col.isPk) {
        svgParts.push(
          `  <rect x="${textX}" y="${rowY + 7}" width="22" height="15" rx="3" fill="#f59e0b" fill-opacity="0.2" />`,
          `  <text x="${textX + 11}" y="${rowY + 18}" fill="#f59e0b" font-size="9" font-weight="bold" text-anchor="middle">PK</text>`
        );
        textX += 28;
      } else if (col.fkTargetTableId) {
        svgParts.push(
          `  <rect x="${textX}" y="${rowY + 7}" width="22" height="15" rx="3" fill="#3b82f6" fill-opacity="0.2" />`,
          `  <text x="${textX + 11}" y="${rowY + 18}" fill="#3b82f6" font-size="9" font-weight="bold" text-anchor="middle">FK</text>`
        );
        textX += 28;
      } else if (col.isUnique) {
        svgParts.push(
          `  <rect x="${textX}" y="${rowY + 7}" width="22" height="15" rx="3" fill="#a855f7" fill-opacity="0.2" />`,
          `  <text x="${textX + 11}" y="${rowY + 18}" fill="#a855f7" font-size="9" font-weight="bold" text-anchor="middle">UQ</text>`
        );
        textX += 28;
      }

      svgParts.push(
        `  <text x="${textX}" y="${rowY + 19}" fill="${col.isPk ? '#f8fafc' : '#cbd5e1'}" font-size="11" font-weight="${col.isPk ? 'bold' : 'normal'}" font-family="monospace">${col.name}</text>`,
        `  <text x="${TABLE_WIDTH - 16}" y="${rowY + 19}" fill="#94a3b8" font-size="10" text-anchor="end" font-family="monospace">${col.type}</text>`
      );

      currentY += 29;
    });

    svgParts.push(`</g>`);
  });

  svgParts.push(`</svg>`);
  return svgParts.join('\n');
}

export function downloadSvgDiagram(
  tables: SchemaTable[],
  modules: ModuleGroup[],
  filename = 'dabblerdb_diagram.svg'
): void {
  const svgContent = generateSvgDiagram(tables, modules);
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadJsonSchema(
  tables: SchemaTable[],
  modules: ModuleGroup[],
  filename = 'dabblerdb_schema.json'
): void {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    modules,
    tables,
  };
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

