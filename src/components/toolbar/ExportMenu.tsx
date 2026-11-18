import React, { useState } from 'react';
import { Check, Download, FileCode, FileJson, Image, Share2 } from 'lucide-react';
import { useSchemaStore } from '../../store/useSchemaStore';
import { toast } from '../../store/useToastStore';
import { downloadSqlScript } from '../../utils/sqlCompiler';
import { downloadJsonSchema, downloadPngDiagram, downloadSvgDiagram } from '../../utils/diagramExporter';
import { copyShareableUrlToClipboard } from '../../utils/urlShare';
import { DIALECT_LABELS } from '../../data/dialectDefaults';
import { MenuItem, ToolbarMenu } from './ToolbarMenu';

export const ExportMenu: React.FC = () => {
  const tables = useSchemaStore((s) => s.tables);
  const modules = useSchemaStore((s) => s.modules);
  const theme = useSchemaStore((s) => s.theme);
  const dialect = useSchemaStore((s) => s.dialect);
  const [open, setOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  /** Runs an export, then closes the menu. */
  const run = (action: () => void | Promise<void>) => async () => {
    try {
      await action();
    } finally {
      setOpen(false);
    }
  };

  const exportPng = async () => {
    try {
      await downloadPngDiagram(tables, modules, theme, 'dabblerdb_diagram.png');
    } catch (err) {
      console.error('Failed to export PNG:', err);
      toast.error('Could not create the PNG image', { details: ['Try the SVG export instead.'] });
    }
  };

  const share = async () => {
    if (await copyShareableUrlToClipboard(tables, modules)) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2200);
      toast.success('Share link copied to clipboard');
    } else {
      toast.error('Could not copy the share link', {
        details: ['Your browser blocked clipboard access. Allow it for this site and try again.'],
      });
    }
  };

  return (
    <ToolbarMenu
      open={open}
      onOpenChange={setOpen}
      icon={<Download className="w-3.5 h-3.5 text-accent" />}
      label="Export"
      title="Export / Share Schema"
      heading="Export & Share"
    >
      <MenuItem
        tone="blue"
        icon={<FileCode className="w-3.5 h-3.5" />}
        title="Export .sql"
        subtitle={`${DIALECT_LABELS[dialect]} script (change it in the top bar)`}
        onClick={run(() => downloadSqlScript(tables, dialect, `dabblerdb_${dialect}.sql`))}
      />
      <MenuItem
        tone="emerald"
        icon={<Image className="w-3.5 h-3.5" />}
        title="Export PNG Image"
        subtitle="Crisp 2x retina diagram"
        onClick={run(exportPng)}
      />
      <MenuItem
        tone="purple"
        icon={<FileCode className="w-3.5 h-3.5" />}
        title="Export SVG Diagram"
        subtitle="Vector for READMEs"
        onClick={run(() => downloadSvgDiagram(tables, modules, theme, 'dabblerdb_diagram.svg'))}
      />
      <MenuItem
        tone="amber"
        icon={<FileJson className="w-3.5 h-3.5" />}
        title="Export JSON Workspace"
        subtitle="Full project backup"
        onClick={run(() => downloadJsonSchema(tables, modules, 'dabblerdb_workspace.json'))}
      />

      <div className="h-px bg-border/60 my-1" />

      <MenuItem
        tone="cyan"
        icon={isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
        title={isCopied ? 'Link Copied!' : 'Share via URL Link'}
        subtitle={isCopied ? 'Copied to clipboard' : 'Copy hash link to clipboard'}
        onClick={run(share)}
      />
    </ToolbarMenu>
  );
};
