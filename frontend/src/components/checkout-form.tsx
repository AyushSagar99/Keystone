'use client';

import { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Product } from '@/lib/api';

const PINCODES = [
  { label: 'Delhi 110001', value: '110001' },
  { label: 'Mumbai 400001', value: '400001' },
  { label: 'Fallback 410066', value: '410066' },
];

type Props = {
  products: Product[];
  selectedProductId: string;
  quantity: number;
  pincode: string;
  loading: boolean;
  onProductChange: (id: string) => void;
  onQuantityChange: (qty: number) => void;
  onPincodeChange: (pincode: string) => void;
  onSubmit: (event: FormEvent) => void;
};

export function CheckoutForm({
  products,
  selectedProductId,
  quantity,
  pincode,
  loading,
  onProductChange,
  onQuantityChange,
  onPincodeChange,
  onSubmit,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>New checkout</CardTitle>
        <CardDescription>
          Reserve stock from the best matching warehouse for the delivery pincode.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-4">
          <label className="grid gap-1.5 text-sm md:col-span-2">
            <span className="text-muted-foreground">Product</span>
            <select
              value={selectedProductId}
              onChange={(e) => onProductChange(e.target.value)}
              className="h-10 rounded-xl border border-border bg-input px-3 shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-transparent dark:focus:ring-white/10"
            >
              <option value="">Select product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-sm">
            <span className="text-muted-foreground">Quantity</span>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => onQuantityChange(Number(e.target.value))}
              className="h-10 rounded-xl border border-border bg-input px-3 shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-transparent dark:focus:ring-white/10"
            />
          </label>

          <label className="grid gap-1.5 text-sm">
            <span className="text-muted-foreground">Pincode</span>
            <input
              value={pincode}
              onChange={(e) => onPincodeChange(e.target.value)}
              className="h-10 rounded-xl border border-border bg-input px-3 shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-transparent dark:focus:ring-white/10"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2 md:col-span-4">
            {PINCODES.map((item) => (
              <Chip
                key={item.value}
                active={pincode === item.value}
                onClick={() => onPincodeChange(item.value)}
              >
                {item.label}
              </Chip>
            ))}
          </div>

          <div className="md:col-span-4">
            <Button type="submit" className="min-w-[160px]" disabled={loading || !selectedProductId}>
              Reserve stock
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
