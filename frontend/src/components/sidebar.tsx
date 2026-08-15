'use client';

import {
  LayoutDashboard,
  Package,
  RefreshCw,
  Sparkles,
  Timer,
  Warehouse,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type View = 'pipeline' | 'inventory';

type Props = {
  view: View;
  onViewChange: (view: View) => void;
  onSeed: () => void;
  onExpire: () => void;
  onRefresh: () => void;
  loading: boolean;
};

const nav = [
  { id: 'pipeline' as const, label: 'Pipeline', icon: LayoutDashboard },
  { id: 'inventory' as const, label: 'Inventory', icon: Warehouse },
];

export function Sidebar({
  view,
  onViewChange,
  onSeed,
  onExpire,
  onRefresh,
  loading,
}: Props) {
  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col border-r border-border bg-sidebar dark:border-white/[0.06]">
      <div className="px-3 py-4">
        <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Workspace
        </p>
        <nav className="space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition',
                  view === item.id
                    ? 'bg-card font-medium shadow-sm dark:bg-[#1e1e1e] dark:shadow-none dark:ring-1 dark:ring-white/[0.06]'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-[#1a1a1a]',
                )}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto space-y-2 border-t border-border px-3 py-4 dark:border-white/[0.06]">
        <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Actions
        </p>
        <Button
          variant="default"
          className="w-full justify-start"
          onClick={onSeed}
          disabled={loading}
        >
          <Sparkles size={16} />
          Seed scenario
        </Button>
        <Button
          variant="secondary"
          className="w-full justify-start"
          onClick={onExpire}
          disabled={loading}
        >
          <Timer size={16} />
          Expire abandoned
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh data
        </Button>
      </div>

      <div className="border-t border-border px-5 py-4 dark:border-white/[0.06]">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Package size={14} />
          Web track demo
        </div>
      </div>
    </aside>
  );
}
