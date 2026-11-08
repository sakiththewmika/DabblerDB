import React, { useState, useMemo } from 'react';
import {
  Copy,
  Check,
  Download,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Database,
} from 'lucide-react';
import { useSchemaStore } from '../../store/useSchemaStore';
import {
  generateSql,
  parseSqlToTables,
  downloadSqlScript,
  type SupportedDialect,
} from '../../utils/sqlCompiler';

export const DockedSqlStudio: React.FC = () => {
  const { tables, importSchemaJson } = useSchemaStore();

  const [activeDialect, setActiveDialect] = useState<SupportedDialect>('postgres');
  const [userEditedCode, setUserEditedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [parseStatus, setParseStatus] = useState<{
    type: 'success' | 'error';
    message: string;
    details?: string[];
  } | null>(null);

  // Derived SQL code from canvas tables and active dialect
  const generatedSql = useMemo(() => {
    return generateSql(tables, activeDialect);
  }, [tables, activeDialect]);

  // Current active SQL string (user edited version takes precedence)
  const currentSql = userEditedCode ?? generatedSql;

  const handleDialectChange = (dialect: SupportedDialect) => {
    setActiveDialect(dialect);
    setUserEditedCode(null);
    setParseStatus(null);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentSql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownload = () => {
    downloadSqlScript(tables, activeDialect, `${activeDialect}_schema.sql`);
  };

  const handleApplyToCanvas = () => {
    setParseStatus(null);
    const { tables: parsedTables, errors } = parseSqlToTables(currentSql, tables);

    if (errors.length > 0 && parsedTables.length === 0) {
      setParseStatus({
        type: 'error',
        message: 'Failed to parse SQL. Please verify your CREATE TABLE syntax.',
        details: errors,
      });
      return;
    }

    importSchemaJson({ tables: parsedTables });

    setParseStatus({
      type: 'success',
      message: `Successfully synchronized ${parsedTables.length} tables to the canvas!`,
      details: errors.length > 0 ? errors : undefined,
    });
  };

  const handleResetToGenerated = () => {
    setUserEditedCode(null);
    setParseStatus(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-card">
      {/* Dialect Tabs & Toolbar */}
      <div className="p-3 border-b border-border/80 bg-muted/40 flex flex-wrap items-center justify-between gap-2 shrink-0">
        {/* Dialect Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-card border border-border/80 text-xs">
          <button
            type="button"
            onClick={() => handleDialectChange('postgres')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-colors ${
              activeDialect === 'postgres'
                ? 'bg-accent text-accent-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Database className="w-3 h-3" />
            <span>Postgres</span>
          </button>

          <button
            type="button"
            onClick={() => handleDialectChange('mysql')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-colors ${
              activeDialect === 'mysql'
                ? 'bg-accent text-accent-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Database className="w-3 h-3" />
            <span>MySQL</span>
          </button>

          <button
            type="button"
            onClick={() => handleDialectChange('sqlite')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-colors ${
              activeDialect === 'sqlite'
                ? 'bg-accent text-accent-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Database className="w-3 h-3" />
            <span>SQLite</span>
          </button>
        </div>

        {/* Copy & Download Actions */}
        <div className="flex items-center gap-1.5">
          {userEditedCode !== null && (
            <button
              type="button"
              onClick={handleResetToGenerated}
              className="flex items-center gap-1 px-2 py-1 rounded-lg border border-border bg-card hover:bg-muted text-xs text-muted-foreground hover:text-foreground transition-colors"
              title="Revert edits"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors shadow-2xs"
            title="Copy SQL to Clipboard"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            <span className={copied ? 'text-emerald-500' : ''}>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors shadow-2xs"
            title="Download SQL File"
          >
            <Download className="w-3.5 h-3.5 text-accent" />
            <span>.sql</span>
          </button>
        </div>
      </div>

      {/* Code Textarea Editor */}
      <div className="flex-1 p-3 min-h-[200px] flex flex-col bg-muted/20 overflow-hidden">
        <textarea
          value={currentSql}
          onChange={(e) => {
            setUserEditedCode(e.target.value);
            setParseStatus(null);
          }}
          spellCheck={false}
          className="flex-1 w-full p-3 rounded-xl font-mono text-xs leading-relaxed border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-800 placeholder-slate-400 dark:placeholder-slate-500 resize-none focus:outline-hidden focus:ring-1 focus:ring-accent selection:bg-accent/30 overflow-auto"
          placeholder="Edit or paste SQL statements here..."
        />
      </div>

      {/* Parse Feedback Notification */}
      {parseStatus && (
        <div
          className={`p-3 border-t text-xs flex items-start gap-2 ${
            parseStatus.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
          }`}
        >
          {parseStatus.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-semibold">{parseStatus.message}</p>
            {parseStatus.details && (
              <ul className="list-disc list-inside mt-0.5 text-[11px] opacity-90 space-y-0.5">
                {parseStatus.details.map((detail, idx) => (
                  <li key={idx}>{detail}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Apply to Canvas Footer Button */}
      <div className="p-3 border-t border-border bg-card shrink-0 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground truncate pr-2">
          Bi-directional SQL ⇄ Canvas compiler
        </span>
        <button
          type="button"
          onClick={handleApplyToCanvas}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent text-accent-foreground text-xs font-semibold hover:bg-accent-hover transition-colors shadow-xs shrink-0"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Apply to Canvas</span>
        </button>
      </div>
    </div>
  );
};
