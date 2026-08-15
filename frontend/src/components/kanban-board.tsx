'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkout } from '@/lib/api';
import { MapPin, Package } from 'lucide-react';

const columns = [
  { key: 'RESERVED', title: 'Reserved', subtitle: 'Awaiting payment' },
  { key: 'USER_DROPPED', title: 'User dropped', subtitle: 'Retry window open' },
  { key: 'PAID', title: 'Paid', subtitle: 'Stock sold' },
  { key: 'DONE', title: 'Closed', subtitle: 'Failed or expired' },
] as const;

function bucket(status: string) {
  if (status === 'FAILED' || status === 'EXPIRED') return 'DONE';
  return status;
}

type Props = {
  checkouts: Checkout[];
  loading: boolean;
  onPayment: (id: string, type: 'success' | 'failed' | 'dropped') => void;
};

export function KanbanBoard({ checkouts, loading, onPayment }: Props) {
  return (
    <div className="grid min-h-[520px] grid-cols-1 gap-4 xl:grid-cols-4">
      {columns.map((column) => {
        const items = checkouts.filter((c) => bucket(c.status) === column.key);

        return (
          <div key={column.key} className="flex min-h-0 flex-col">
            <div className="mb-3 flex items-center justify-between px-1">
              <div>
                <h3 className="text-sm font-semibold">{column.title}</h3>
                <p className="text-xs text-muted-foreground">{column.subtitle}</p>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                {items.length}
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-2xl bg-muted/50 p-3 dark:bg-[#161616]">
              {items.length === 0 ? (
                <div className="flex flex-1 items-center justify-center rounded-xl p-6 text-center text-xs text-muted-foreground dark:bg-[#1a1a1a]/50">
                  No checkouts here
                </div>
              ) : (
                items.map((checkout) => (
                  <Card key={checkout.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="border-b border-border bg-muted/40 px-4 py-3 dark:border-white/[0.05] dark:bg-[#222222]">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-mono text-[11px] text-muted-foreground">
                              #{checkout.id.slice(0, 8).toUpperCase()}
                            </p>
                            <p className="mt-1 text-sm font-semibold">
                              {checkout.location?.name ?? 'Warehouse'}
                            </p>
                          </div>
                          <Badge status={checkout.status}>{checkout.status.replace('_', ' ')}</Badge>
                        </div>
                      </div>

                      <div className="space-y-3 px-4 py-4">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-lg bg-muted/60 p-2.5">
                            <p className="text-muted-foreground">Quantity</p>
                            <p className="mt-0.5 font-semibold">{checkout.quantity}</p>
                          </div>
                          <div className="rounded-lg bg-muted/60 p-2.5">
                            <p className="text-muted-foreground">Pincode</p>
                            <p className="mt-0.5 font-semibold">{checkout.deliveryPincode}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Package size={12} />
                            {checkout.product?.name ?? 'Product'}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={12} />
                            {checkout.location?.city}
                          </span>
                        </div>

                        {checkout.expiresAt && (
                          <p className="text-[11px] text-amber-700 dark:text-amber-400">
                            Expires {new Date(checkout.expiresAt).toLocaleString()}
                          </p>
                        )}

                        {checkout.status === 'RESERVED' && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Button
                              variant="success"
                              className="h-8 px-2.5 text-xs"
                              disabled={loading}
                              onClick={() => onPayment(checkout.id, 'success')}
                            >
                              Success
                            </Button>
                            <Button
                              variant="danger"
                              className="h-8 px-2.5 text-xs"
                              disabled={loading}
                              onClick={() => onPayment(checkout.id, 'failed')}
                            >
                              Failed
                            </Button>
                            <Button
                              variant="warning"
                              className="h-8 px-2.5 text-xs"
                              disabled={loading}
                              onClick={() => onPayment(checkout.id, 'dropped')}
                            >
                              Dropped
                            </Button>
                          </div>
                        )}

                        {checkout.status === 'USER_DROPPED' && (
                          <Button
                            variant="success"
                            className="h-8 w-full text-xs"
                            disabled={loading}
                            onClick={() => onPayment(checkout.id, 'success')}
                          >
                            Mark paid (retry)
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
