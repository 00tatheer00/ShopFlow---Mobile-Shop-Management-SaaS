import Link from 'next/link';
import type { ReactNode, ElementType } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Ur } from '@/components/ui/urdu';

// ============================================
// ShopFlow UI kit — calm, consistent building blocks for every screen.
// Colour = meaning. Each module has ONE tone, used as a soft tinted chip.
// ============================================

export type Tone = 'violet' | 'emerald' | 'amber' | 'sky' | 'rose' | 'pink' | 'cyan' | 'slate' | 'teal' | 'blue';

/** Soft chip colours (tinted background + strong icon colour). */
export const TONE_CHIP: Record<Tone, string> = {
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300',
  sky: 'bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300',
  rose: 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300',
  pink: 'bg-pink-100 text-pink-700 dark:bg-pink-950/70 dark:text-pink-300',
  cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/70 dark:text-cyan-300',
  teal: 'bg-teal-100 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300',
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

/** Solid colours (only for small accents such as dots). */
export const TONE_SOLID: Record<Tone, string> = {
  violet: 'bg-violet-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  sky: 'bg-sky-500',
  rose: 'bg-rose-500',
  pink: 'bg-pink-500',
  cyan: 'bg-cyan-500',
  teal: 'bg-teal-500',
  blue: 'bg-blue-500',
  slate: 'bg-slate-400',
};

export function IconChip({ icon: Icon, tone, size = 'md' }: { icon: ElementType; tone: Tone; size?: 'sm' | 'md' | 'lg' }) {
  const box = size === 'sm' ? 'h-8 w-8 rounded-lg' : size === 'lg' ? 'h-12 w-12 rounded-2xl' : 'h-10 w-10 rounded-xl';
  const ic = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
  return (
    <span className={`flex shrink-0 items-center justify-center ${box} ${TONE_CHIP[tone]}`}>
      <Icon className={ic} />
    </span>
  );
}

/** Page title block: icon + English title + Urdu title, optional back link and actions. */
export function PageHeader({
  title,
  ur,
  description,
  icon,
  tone = 'violet',
  actions,
  backHref,
  backLabel = 'Back',
}: {
  title: string;
  ur?: string;
  description?: ReactNode;
  icon?: ElementType;
  tone?: Tone;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="space-y-3">
      {backHref && (
        <Link href={backHref} className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {icon && <IconChip icon={icon} tone={tone} size="lg" />}
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-baseline gap-x-2.5 text-2xl font-bold tracking-tight text-foreground">
              <span>{title}</span>
              {ur && <Ur className="text-lg font-normal text-muted-foreground">{ur}</Ur>}
            </h1>
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/** Calm status badge. */
export function Badge({ tone = 'slate', children, dot = false }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE_CHIP[tone]}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${TONE_SOLID[tone]}`} aria-hidden="true" />}
      {children}
    </span>
  );
}

/** Friendly empty state. */
export function EmptyBlock({
  icon: Icon,
  title,
  ur,
  text,
  action,
  tone = 'slate',
}: {
  icon: ElementType;
  title: string;
  ur?: string;
  text?: ReactNode;
  action?: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="panel flex flex-col items-center justify-center px-6 py-14 text-center">
      <IconChip icon={Icon} tone={tone} size="lg" />
      <p className="mt-4 text-base font-bold text-foreground">{title}</p>
      {ur && <Ur className="text-muted-foreground">{ur}</Ur>}
      {text && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Previous / next pager. */
export function Pager({
  page,
  totalPages,
  onChange,
  totalLabel,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  totalLabel?: string;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground">
      <span>
        Page <strong className="text-foreground">{page}</strong> of {totalPages}
        {totalLabel ? ` · ${totalLabel}` : ''}
      </span>
      <div className="flex items-center gap-2">
        <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} className="btn btn-sm btn-outline">
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        <button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)} className="btn btn-sm btn-outline">
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** Segmented filter (e.g. All / Completed / Cancelled). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-border bg-card p-1" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-9 rounded-lg px-3.5 text-sm font-semibold transition ${
            value === o.value ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
