import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  Play,
  Code2,
  AlertCircle,
  CheckCircle2,
  Database,
  RotateCcw,
} from 'lucide-react';
import { useSchemaStore } from '../../store/useSchemaStore';
import {
  generateSql,
  parseSqlToTables,
  downloadSqlScript,
  type SupportedDialect,
} from '../../utils/sqlCompiler';

export const SqlStudioModal: React.FC = () => {
  const {
    tables,
    isSqlStudioOpen,
    setIsSqlStudioOpen,
    importSchemaJson,
  } = useSchemaStore();

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

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSqlStudioOpen) {
        setIsSqlStudioOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSqlStudioOpen, setIsSqlStudioOpen]);

  if (!isSqlStudioOpen) return null;

  const handleDialectChange = (dialect: SupportedDialect) => {
    setActiveDialect(dialect);
    setUserEditedCode(null); // Reset user edit on dialect switch to display compiled code
    setParseStatus(null);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentSql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback
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
      message: `Successfully synchronized ${parsedTables.length} tables to the visual canvas!`,
      details: errors.length > 0 ? errors : undefined,
    });
  };

  const handleResetToGenerated = () => {
    setUserEditedCode(null);
    setParseStatus(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-4xl max-h-[90vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0 bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent/10 text-accent">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>SQL Studio & DDL Compiler</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent/15 text-accent font-medium">
                  Bi-directional
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Export, edit, or reverse-engineer SQL DDL statements back onto the interactive canvas.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setUserEditedCode(null);
              setIsSqlStudioOpen(false);
            }}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Close SQL Studio (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dialect Tabs & Action Buttons Bar */}
        <div className="px-5 py-2.5 border-b border-border/80 bg-muted/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Dialect Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-card border border-border/80 text-xs">
            <button
              type="button"
              onClick={() => handleDialectChange('postgres')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeDialect === 'postgres'
                  ? 'bg-accent text-accent-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>PostgreSQL</span>
            </button>

            <button
              type="button"
              onClick={() => handleDialectChange('mysql')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeDialect === 'mysql'
                  ? 'bg-accent text-accent-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>MySQL 8.0</span>
            </button>

            <button
              type="button"
              onClick={() => handleDialectChange('sqlite')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeDialect === 'sqlite'
                  ? 'bg-accent text-accent-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>SQLite 3</span>
            </button>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            {userEditedCode !== null && (
              <button
                type="button"
                onClick={handleResetToGenerated}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                title="Discard edits and revert to compiled canvas SQL"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Revert</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors shadow-2xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy SQL</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors shadow-2xs"
              title="1-Click Download .sql"
            >
              <Download className="w-3.5 h-3.5 text-accent" />
              <span>Download .sql</span>
            </button>
          </div>
        </div>

        {/* Live Editable Code Area */}
        <div className="flex-1 min-h-[340px] p-4 bg-muted/20 relative flex flex-col overflow-hidden">
          <textarea
            value={currentSql}
            onChange={(e) => {
              setUserEditedCode(e.target.value);
              setParseStatus(null);
            }}
            spellCheck={false}
            className="flex-1 w-full p-4 rounded-xl font-mono text-xs leading-relaxed border border-border/80 bg-background text-foreground resize-none focus:outline-hidden focus:ring-1 focus:ring-accent selection:bg-accent/30 overflow-auto"
            placeholder="Write or paste CREATE TABLE statements here..."
          />
        </div>

        {/* Parse Status Notification if present */}
        {parseStatus && (
          <div
            className={`px-5 py-3 border-t text-xs flex items-start gap-2.5 ${
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
                <ul className="list-disc list-inside mt-1 text-[11px] opacity-90 space-y-0.5">
                  {parseStatus.details.map((detail, idx) => (
                    <li key={idx}>{detail}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-border flex items-center justify-between shrink-0 bg-card">
          <div className="text-[11px] text-muted-foreground hidden sm:block">
            Tip: Edit or paste foreign keys and constraints above, then click Apply.
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={() => {
                setUserEditedCode(null);
                setIsSqlStudioOpen(false);
              }}
              className="px-3.5 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleApplyToCanvas}
              className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-accent text-accent-foreground text-xs font-semibold hover:bg-accent-hover transition-colors shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Apply SQL Changes to Canvas</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
