import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'success'
  | 'danger'
  | 'warning';

const variants: Record<Variant, string> = {
  default:
    'bg-accent text-accent-foreground shadow-sm hover:brightness-105 active:scale-[0.98] dark:bg-[#2a2a2a] dark:text-[#ededed] dark:hover:bg-[#333333]',
  secondary:
    'bg-secondary text-secondary-foreground shadow-sm hover:brightness-95 active:scale-[0.98] dark:bg-[#1e1e1e] dark:hover:bg-[#262626]',
  outline:
    'border border-border bg-card text-foreground shadow-sm hover:bg-muted active:scale-[0.98] dark:border-transparent dark:bg-[#1e1e1e] dark:hover:bg-[#262626]',
  ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
  success:
    'bg-emerald-600 text-white shadow-sm hover:bg-emerald-500 active:scale-[0.98]',
  danger:
    'bg-rose-600 text-white shadow-sm hover:bg-rose-500 active:scale-[0.98]',
  warning:
    'bg-amber-500 text-amber-950 shadow-sm hover:bg-amber-400 active:scale-[0.98]',
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(({ className, variant = 'default', ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50',
      variants[variant],
      className,
    )}
    {...props}
  />
));
Button.displayName = 'Button';
