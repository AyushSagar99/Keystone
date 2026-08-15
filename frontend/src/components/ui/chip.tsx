import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes } from 'react';

export function Chip({
  active,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        'rounded-xl px-3.5 py-2 text-xs font-medium transition-all duration-150',
        active
          ? 'bg-accent-muted text-foreground shadow-sm ring-1 ring-white/10 dark:bg-[#2a2a2a] dark:ring-white/8'
          : 'bg-input text-muted-foreground hover:bg-muted hover:text-foreground dark:bg-[#1e1e1e] dark:hover:bg-[#262626]',
        className,
      )}
      {...props}
    />
  );
}
