import { Database, Sparkles } from 'lucide-react'

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 select-none">
      <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 shadow-sm text-center">
        <div className="inline-flex p-3 rounded-full bg-accent/10 text-accent mb-4">
          <Database className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">DabblerDB</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Lightweight, local-first visual database schema designer & SQL/DBML studio.
        </p>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground border-t border-border pt-4">
          <Sparkles className="w-4 h-4 text-accent" />
          <span>Local-first • Zero-latency • Client-side only</span>
        </div>
      </div>
    </div>
  )
}
