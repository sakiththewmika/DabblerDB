import type { SchemaTable, ModuleGroup, ThemeMode } from '../types/schema';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface DiagramColors {
  bg: string;
  cardBg: string;
  cardBorder: string;
  cardHeaderBg: string;
  cardShadowColor: string;
  cardShadowOpacity: string;
  tableName: string;
  textMuted: string;
  commentBg: string;
  commentText: string;
  separator: string;
  colTextPk: string;
  colText: string;
  colType: string;
  pkBadgeText: string;
  pkBadgeBg: string;
  fkBadgeText: string;
  fkBadgeBg: string;
  uqBadgeText: string;
  uqBadgeBg: string;
}

const DARK_COLORS: DiagramColors = {
  bg: '#0b0f19',
  cardBg: '#111827',
  cardBorder: '#1e293b',
  cardHeaderBg: '#1f2937',
  cardShadowColor: '#000000',
  cardShadowOpacity: '0.4',
  tableName: '#f8fafc',
  textMuted: '#94a3b8',
  commentBg: '#1f2937',
  commentText: '#94a3b8',
  separator: '#1e293b',
  colTextPk: '#f8fafc',
  colText: '#cbd5e1',
  colType: '#94a3b8',
  pkBadgeText: '#f59e0b',
  pkBadgeBg: '#f59e0b',
  fkBadgeText: '#3b82f6',
  fkBadgeBg: '#3b82f6',
  uqBadgeText: '#a855f7',
  uqBadgeBg: '#a855f7',
};

const LIGHT_COLORS: DiagramColors = {
  bg: '#f8fafc',
  cardBg: '#ffffff',
  cardBorder: '#e2e8f0',
  cardHeaderBg: '#f1f5f9',
  cardShadowColor: '#0f172a',
  cardShadowOpacity: '0.08',
  tableName: '#0f172a',
  textMuted: '#64748b',
  commentBg: '#f1f5f9',
  commentText: '#64748b',
  separator: '#e2e8f0',
  colTextPk: '#0f172a',
  colText: '#334155',
  colType: '#64748b',
  pkBadgeText: '#b45309',
  pkBadgeBg: '#f59e0b',
  fkBadgeText: '#2563eb',
  fkBadgeBg: '#3b82f6',
  uqBadgeText: '#7e22ce',
  uqBadgeBg: '#a855f7',
};

export function generateSvgDiagram(
  tables: SchemaTable[] = [],
  modules: ModuleGroup[] = [],
  theme: ThemeMode = 'dark'
): string {
  const safeTables = tables || [];
  const safeModules = modules || [];
  const colors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

  if (safeTables.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" style="background-color: ${colors.bg};"><text x="50" y="100" fill="${colors.textMuted}">No tables in schema</text></svg>`;
  }

  const TABLE_WIDTH = 288;
  const moduleMap = new Map(safeModules.map((m) => [m.id, m]));

  // Calculate bounding box
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  safeTables.forEach((t) => {
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
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}" width="${viewBoxWidth}" height="${viewBoxHeight}" style="background-color: ${colors.bg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">`,
    `<defs>`,
    `  <filter id="card-shadow" x="-5%" y="-5%" width="110%" height="115%">`,
    `    <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="${colors.cardShadowColor}" flood-opacity="${colors.cardShadowOpacity}"/>`,
    `  </filter>`,
    `</defs>`,
    `<!-- Background -->`,
    `<rect x="${viewBoxX}" y="${viewBoxY}" width="${viewBoxWidth}" height="${viewBoxHeight}" fill="${colors.bg}" />`
  );

  // 1. Draw Relationship Bézier Edges
  svgParts.push(`<!-- Relationship Edges -->`);
  safeTables.forEach((sourceTable) => {
    sourceTable.columns.forEach((sourceCol, colIndex) => {
      if (!sourceCol.fkTargetTableId) return;

      const targetTable = safeTables.find((t) => t.id === sourceCol.fkTargetTableId);
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
        `<path d="${d}" fill="none" stroke="${targetModuleColor}" stroke-width="2" stroke-opacity="0.85" />`,
        `<circle cx="${sX}" cy="${sY}" r="3" fill="${targetModuleColor}" />`,
        `<circle cx="${tX}" cy="${tY}" r="4" fill="${targetModuleColor}" />`
      );
    });
  });

  // 2. Draw Table Cards
  svgParts.push(`<!-- Table Cards -->`);
  safeTables.forEach((table) => {
    const mod = moduleMap.get(table.moduleId);
    const modColor = mod?.color || '#3b82f6';
    const tableHeight = 44 + (table.comment ? 28 : 0) + table.columns.length * 29 + 12;

    svgParts.push(
      `<g transform="translate(${table.x}, ${table.y})" filter="url(#card-shadow)">`,
      `  <!-- Card Box -->`,
      `  <rect width="${TABLE_WIDTH}" height="${tableHeight}" rx="12" fill="${colors.cardBg}" stroke="${colors.cardBorder}" stroke-width="1" />`,
      `  <!-- Module Color Top Strip -->`,
      `  <rect width="${TABLE_WIDTH}" height="6" rx="3" fill="${modColor}" />`,
      `  <!-- Header Background -->`,
      `  <rect y="6" width="${TABLE_WIDTH}" height="38" fill="${colors.cardHeaderBg}" fill-opacity="${theme === 'dark' ? '0.5' : '0.8'}" />`,
      `  <!-- Table Name -->`,
      `  <circle cx="16" cy="25" r="4" fill="${modColor}" />`,
      `  <text x="28" y="29" fill="${colors.tableName}" font-size="13" font-weight="bold">${escapeXml(table.name)}</text>`,
      `  <text x="${TABLE_WIDTH - 16}" y="29" fill="${colors.textMuted}" font-size="10" text-anchor="end" font-family="monospace">${table.columns.length} cols</text>`
    );

    let currentY = 44;

    if (table.comment) {
      const maxCommentLen = 34;
      const commentText =
        table.comment.length > maxCommentLen
          ? table.comment.slice(0, maxCommentLen - 1).trim() + '…'
          : table.comment;

      svgParts.push(
        `  <rect y="${currentY}" width="${TABLE_WIDTH}" height="28" fill="${colors.commentBg}" fill-opacity="${theme === 'dark' ? '0.25' : '0.5'}" />`,
        `  <text x="16" y="${currentY + 18}" fill="${colors.commentText}" font-size="11" font-style="italic">${escapeXml(commentText)}</text>`
      );
      currentY += 28;
    }

    // Column rows
    table.columns.forEach((col) => {
      const rowY = currentY;
      svgParts.push(
        `  <!-- Column ${escapeXml(col.name)} -->`,
        `  <line x1="0" y1="${rowY}" x2="${TABLE_WIDTH}" y2="${rowY}" stroke="${colors.separator}" stroke-width="1" stroke-opacity="${theme === 'dark' ? '0.5' : '0.8'}" />`
      );

      let textX = 16;
      if (col.isPk) {
        svgParts.push(
          `  <rect x="${textX}" y="${rowY + 7}" width="22" height="15" rx="3" fill="${colors.pkBadgeBg}" fill-opacity="${theme === 'dark' ? '0.2' : '0.15'}" />`,
          `  <text x="${textX + 11}" y="${rowY + 18}" fill="${colors.pkBadgeText}" font-size="9" font-weight="bold" text-anchor="middle">PK</text>`
        );
        textX += 28;
      } else if (col.fkTargetTableId) {
        svgParts.push(
          `  <rect x="${textX}" y="${rowY + 7}" width="22" height="15" rx="3" fill="${colors.fkBadgeBg}" fill-opacity="${theme === 'dark' ? '0.2' : '0.15'}" />`,
          `  <text x="${textX + 11}" y="${rowY + 18}" fill="${colors.fkBadgeText}" font-size="9" font-weight="bold" text-anchor="middle">FK</text>`
        );
        textX += 28;
      } else if (col.isUnique) {
        svgParts.push(
          `  <rect x="${textX}" y="${rowY + 7}" width="22" height="15" rx="3" fill="${colors.uqBadgeBg}" fill-opacity="${theme === 'dark' ? '0.2' : '0.15'}" />`,
          `  <text x="${textX + 11}" y="${rowY + 18}" fill="${colors.uqBadgeText}" font-size="9" font-weight="bold" text-anchor="middle">UQ</text>`
        );
        textX += 28;
      }

      svgParts.push(
        `  <text x="${textX}" y="${rowY + 19}" fill="${col.isPk ? colors.colTextPk : colors.colText}" font-size="11" font-weight="${col.isPk ? 'bold' : 'normal'}" font-family="monospace">${escapeXml(col.name)}</text>`,
        `  <text x="${TABLE_WIDTH - 16}" y="${rowY + 19}" fill="${colors.colType}" font-size="10" text-anchor="end" font-family="monospace">${escapeXml(col.type)}</text>`
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
  theme: ThemeMode = 'dark',
  filename = 'dabblerdb_diagram.svg'
): void {
  const svgContent = generateSvgDiagram(tables, modules, theme);
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

export async function downloadPngDiagram(
  tables: SchemaTable[],
  modules: ModuleGroup[],
  theme: ThemeMode = 'dark',
  filename = 'dabblerdb_diagram.png'
): Promise<void> {
  const colors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;
  const svgContent = generateSvgDiagram(tables, modules, theme);

  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const scale = 2; // Retina 2x scale for crisp diagram rendering
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Canvas 2D context not available'));
          return;
        }

        // Fill background first with theme background to ensure solid color
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);

        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (!blob) {
            reject(new Error('Failed to generate PNG blob'));
            return;
          }

          const pngUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = pngUrl;
          link.download = filename;
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(pngUrl);
          resolve();
        }, 'image/png');
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    img.src = url;
  });
}

export function downloadJsonSchema(
  tables: SchemaTable[],
  modules: ModuleGroup[],
  filename = 'dabblerdb_workspace.json'
): void {
  const data = JSON.stringify({ tables, modules, version: '1.0' }, null, 2);
  const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
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
