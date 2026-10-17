import { cn } from '@/lib/utils';

/**
 * Corner summary panels (Medical Clearance pattern), shared by Walk-out Songs
 * and the Pre Event Task pages (UAE-98).
 *
 * Extracted from /music unchanged: same markup, same classes. Each screen
 * passes its own buckets (what is counted, in which colour); the panels only
 * lay them out. An athlete without a corner counts in Total only.
 */

export interface SummaryBucket<K extends string> {
  key: K;
  label: string;
  tone: string;
}

export type PanelTotals<K extends string> = Record<K, number>;

export interface CornerSummaryTotals<K extends string> {
  red: PanelTotals<K>;
  blue: PanelTotals<K>;
  total: PanelTotals<K>;
}

const sumOf = <K extends string>(totals: PanelTotals<K>, buckets: SummaryBucket<K>[]) =>
  buckets.reduce((n, b) => n + totals[b.key], 0);

/**
 * Phone version of the three corner panels (UAE-20).
 *
 * Three stacked panels pushed the actual table below the fold on a phone, so
 * on mobile the numbers collapse into one strip: the totals that matter, with
 * the red/blue split kept as a footnote rather than dropped.
 */
export function MobileSummary<K extends string>({
  summary,
  buckets,
}: {
  summary: CornerSummaryTotals<K>;
  buckets: SummaryBucket<K>[];
}) {
  const total = sumOf(summary.total, buckets);

  return (
    <div className="rounded-lg border bg-card p-3 md:hidden">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-wider">All Corners</span>
        <span className="text-xs text-muted-foreground">{total} total</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {buckets.map((b) => (
          <div
            key={b.key}
            className="flex flex-col items-center justify-center rounded-md bg-background/60 dark:bg-background/30 px-2 py-1.5 border border-border/50"
          >
            <span className={cn('text-xl font-bold leading-none tabular-nums', b.tone)}>
              {summary.total[b.key]}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground mt-1 font-medium">
              {b.label}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-600" />
          Red {sumOf(summary.red, buckets)}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-600" />
          Blue {sumOf(summary.blue, buckets)}
        </span>
      </div>
    </div>
  );
}

export function CornerPanel<K extends string>({
  title,
  totals,
  variant,
  buckets,
}: {
  title: string;
  totals: PanelTotals<K>;
  variant: 'red' | 'blue' | 'total';
  buckets: SummaryBucket<K>[];
}) {
  const styles = {
    red: {
      container: 'bg-red-50/70 border-red-200 dark:bg-red-950/20 dark:border-red-900/40',
      title: 'text-red-700 dark:text-red-400',
    },
    blue: {
      container: 'bg-blue-50/70 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/40',
      title: 'text-blue-700 dark:text-blue-400',
    },
    total: {
      container: 'bg-card border-border',
      title: 'text-foreground',
    },
  }[variant];

  const total = sumOf(totals, buckets);

  return (
    <div className={cn('rounded-lg border p-4 flex flex-col gap-3 transition-colors', styles.container)}>
      <div className="flex items-center justify-between gap-2">
        <span className={cn('text-xs font-bold uppercase tracking-wider', styles.title)}>{title}</span>
        <span className="text-xs font-medium text-muted-foreground">{total} total</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {buckets.map((b) => (
          <div
            key={b.key}
            className="flex flex-col items-center justify-center rounded-md bg-background/60 dark:bg-background/30 px-2 py-2 border border-border/50"
          >
            <span className={cn('text-2xl font-bold leading-none tabular-nums', b.tone)}>{totals[b.key]}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1.5 font-medium">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Mobile strip on phones, Red / Blue / Total panels from md up. */
export function CornerSummary<K extends string>({
  summary,
  buckets,
}: {
  summary: CornerSummaryTotals<K>;
  buckets: SummaryBucket<K>[];
}) {
  return (
    <>
      <MobileSummary summary={summary} buckets={buckets} />
      <div className="hidden md:grid md:grid-cols-3 gap-3">
        <CornerPanel title="Red Corner" totals={summary.red} variant="red" buckets={buckets} />
        <CornerPanel title="Blue Corner" totals={summary.blue} variant="blue" buckets={buckets} />
        <CornerPanel title="Total" totals={summary.total} variant="total" buckets={buckets} />
      </div>
    </>
  );
}
