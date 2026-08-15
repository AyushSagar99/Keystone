import { cn } from '@/lib/utils';
import { HTMLAttributes } from 'react';

const styles: Record<string, string> = {
  RESERVED: 'bg-sky-100 text-sky-800 dark:bg-[#2a2a2a] dark:text-[#bdbdbd]',
  PAID: 'bg-emerald-100 text-emerald-800 dark:bg-[#2a2a2a] dark:text-[#ededed]',
  FAILED: 'bg-red-100 text-red-800 dark:bg-[#2a2a2a] dark:text-[#9a9a9a]',
  EXPIRED: 'bg-zinc-200 text-zinc-700 dark:bg-[#222222] dark:text-[#9a9a9a]',
  USER_DROPPED: 'bg-amber-100 text-amber-900 dark:bg-[#2a2a2a] dark:text-[#bdbdbd]',
};

export function Badge({
  className,
  status,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { status?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        status ? styles[status] : 'bg-muted text-muted-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
