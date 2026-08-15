import { Card, CardContent } from '@/components/ui/card';
import { Availability } from '@/lib/api';
import { TrendingDown, TrendingUp, Warehouse } from 'lucide-react';

type Props = {
  availability: Availability | null;
  openCheckouts: number;
};

export function StatsRow({ availability, openCheckouts }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Total stock</p>
            <Warehouse size={16} className="text-muted-foreground" />
          </div>
          <p className="text-3xl font-semibold tracking-tight">
            {availability?.totalStock ?? '—'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Units across all warehouses</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Reserved</p>
            <TrendingUp size={16} className="text-amber-600" />
          </div>
          <p className="text-3xl font-semibold tracking-tight text-amber-700 dark:text-[#e0e0e0]">
            {availability?.totalReserved ?? '—'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Held for active checkouts</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Available</p>
            <TrendingDown size={16} className="text-emerald-600" />
          </div>
          <p className="text-3xl font-semibold tracking-tight text-emerald-700 dark:text-[#e0e0e0]">
            {availability?.totalAvailable ?? '—'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Ready to sell right now</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Open checkouts</p>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">
              LIVE
            </span>
          </div>
          <p className="text-3xl font-semibold tracking-tight">{openCheckouts}</p>
          <p className="mt-1 text-xs text-muted-foreground">Reserved or user-dropped</p>
        </CardContent>
      </Card>
    </div>
  );
}
