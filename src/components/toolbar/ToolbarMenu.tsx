import React, { useRef } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { ChevronDown } from 'lucide-react';

/** Button + floating panel. Children are the menu content. Closes on outside click. */
export const ToolbarMenu: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon: React.ReactNode;
  label: string;
  title: string;
  heading: string;
  widthClass?: string;
  children: React.ReactNode;
}> = ({ open, onOpenChange, icon, label, title, heading, widthClass = 'w-56', children }) => {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, open, () => onOpenChange(false));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-medium transition-colors shadow-2xs"
        title={title}
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </button>

      {open && (
        <div
          className={`absolute right-0 top-full mt-2 ${widthClass} p-1.5 rounded-xl bg-card border border-border shadow-2xl z-50 animate-in fade-in zoom-in-95`}
        >
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 mb-1">
            {heading}
          </div>
          {children}
        </div>
      )}
    </div>
  );
};

// Full class names (not built from strings) so Tailwind can find them
const TONES = {
  accent: 'bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground',
  blue: 'bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white',
  emerald: 'bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white',
  purple: 'bg-purple-500/10 text-purple-500 group-hover:bg-purple-500 group-hover:text-white',
  amber: 'bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-white',
  cyan: 'bg-cyan-500/10 text-cyan-500 group-hover:bg-cyan-500 group-hover:text-white',
};

/** One row in a toolbar menu: coloured icon, bold title, small subtitle. */
export const MenuItem: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tone: keyof typeof TONES;
  onClick: () => void;
}> = ({ icon, title, subtitle, tone, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-start gap-2.5 px-3 py-2 rounded-lg text-xs text-left hover:bg-muted text-foreground transition-colors font-medium group cursor-pointer"
  >
    <div className={`p-1 rounded-md transition-colors shrink-0 ${TONES[tone]}`}>{icon}</div>
    <div className="flex-1 min-w-0">
      <div className="font-semibold text-foreground truncate">{title}</div>
      <div className="text-[10px] text-muted-foreground truncate">{subtitle}</div>
    </div>
  </button>
);
