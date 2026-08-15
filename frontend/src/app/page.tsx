'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { CheckoutForm } from '@/components/checkout-form';
import { InventoryTables } from '@/components/inventory-tables';
import { KanbanBoard } from '@/components/kanban-board';
import { Sidebar } from '@/components/sidebar';
import { StatsRow } from '@/components/stats-row';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  api,
  Availability,
  Checkout,
  InventoryRow,
  Product,
} from '@/lib/api';
import {
  clearSessionCheckouts,
  loadSessionCheckouts,
  saveSessionCheckouts,
} from '@/lib/checkout-session';
import { seedDemoData } from '@/lib/seed';
import { Bell, Search } from 'lucide-react';

type View = 'pipeline' | 'inventory';

export default function Home() {
  const [view, setView] = useState<View>('pipeline');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(2);
  const [pincode, setPincode] = useState('110001');
  const [sessionCheckouts, setSessionCheckouts] = useState<Checkout[]>([]);
  const [sessionReady, setSessionReady] = useState(false);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const openCheckouts = useMemo(
    () =>
      sessionCheckouts.filter(
        (c) => c.status === 'RESERVED' || c.status === 'USER_DROPPED',
      ),
    [sessionCheckouts],
  );

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const refreshData = useCallback(async (productId?: string) => {
    const id = productId ?? selectedProductId;
    if (!id) return;
    const [avail, inv] = await Promise.all([
      api.getAvailability(id),
      api.getInventory(id),
    ]);
    setAvailability(avail);
    setInventory(inv);
  }, [selectedProductId]);

  const loadProducts = useCallback(async () => {
    const list = await api.listProducts();
    setProducts(list);
    if (list.length > 0 && !selectedProductId) {
      setSelectedProductId(list[0].id);
      await refreshData(list[0].id);
    }
  }, [refreshData, selectedProductId]);

  useEffect(() => {
    loadProducts().catch((err: Error) => setError(err.message));
  }, [loadProducts]);

  useEffect(() => {
    async function restoreSession() {
      const stored = loadSessionCheckouts();
      if (stored.length === 0) {
        setSessionReady(true);
        return;
      }

      const refreshed = await Promise.all(
        stored.map(async (checkout) => {
          try {
            return await api.getCheckout(checkout.id);
          } catch {
            return checkout;
          }
        }),
      );

      setSessionCheckouts(refreshed);
      setSessionReady(true);
    }

    restoreSession().catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!sessionReady) return;
    saveSessionCheckouts(sessionCheckouts);
  }, [sessionCheckouts, sessionReady]);

  useEffect(() => {
    if (selectedProductId) {
      refreshData(selectedProductId).catch((err: Error) =>
        setError(err.message),
      );
    }
  }, [selectedProductId, refreshData]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  function updateCheckout(updated: Checkout) {
    setSessionCheckouts((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c)),
    );
  }

  async function runAction(action: () => Promise<void>) {
    setLoading(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleSeed() {
    await runAction(async () => {
      const result = await seedDemoData();
      const [firstProduct] = result.products;
      setSelectedProductId(firstProduct.id);
      setSessionCheckouts([]);
      clearSessionCheckouts();
      setToast(
        `Seeded ${result.products.map((p) => p.name).join(' & ')} across 3 warehouses`,
      );
      await refreshData(firstProduct.id);
      setProducts(await api.listProducts());
    });
  }

  async function handleCheckout(event: FormEvent) {
    event.preventDefault();
    if (!selectedProductId) return;

    await runAction(async () => {
      const created = await api.startCheckout(
        {
          productId: selectedProductId,
          quantity,
          deliveryPincode: pincode,
        },
        `ui-${crypto.randomUUID()}`,
      );
      setSessionCheckouts((prev) => [created, ...prev]);
      setToast(`Reserved ${created.quantity} at ${created.location?.name}`);
      await refreshData(selectedProductId);
    });
  }

  async function handlePayment(
    checkoutId: string,
    type: 'success' | 'failed' | 'dropped',
  ) {
    await runAction(async () => {
      let updated: Checkout;
      if (type === 'success') updated = await api.paymentSuccess(checkoutId);
      else if (type === 'failed') updated = await api.paymentFailed(checkoutId);
      else updated = await api.paymentDropped(checkoutId);

      updateCheckout(updated);
      setToast(`Checkout ${updated.status.replace('_', ' ').toLowerCase()}`);
      await refreshData(selectedProductId);
    });
  }

  async function handleExpire() {
    await runAction(async () => {
      const result = await api.expireAbandoned();
      if (result.checkouts.length > 0) {
        setSessionCheckouts((prev) =>
          prev.map((c) => result.checkouts.find((x) => x.id === c.id) ?? c),
        );
      }
      setToast(`Expired ${result.expiredCount} checkout(s)`);
      if (selectedProductId) await refreshData(selectedProductId);
    });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        view={view}
        onViewChange={setView}
        onSeed={handleSeed}
        onExpire={handleExpire}
        onRefresh={() => refreshData()}
        loading={loading}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-border bg-card/80 px-6 py-4 backdrop-blur-md dark:border-white/[0.06] dark:bg-[#121212]/90">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Inventory reservation
              </p>
              <h1 className="text-2xl font-semibold tracking-tight">
                {view === 'pipeline' ? 'Checkout pipeline' : 'Warehouse inventory'}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="hidden items-center gap-2 rounded-xl border border-border bg-input px-3 py-2 text-sm text-muted-foreground md:flex dark:border-transparent dark:bg-[#1a1a1a]">
                <Search size={15} />
                <span className="font-mono text-xs">
                  {process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5566'}
                </span>
              </div>
              <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-input text-muted-foreground shadow-sm hover:bg-muted dark:border-transparent dark:bg-[#1a1a1a] dark:hover:bg-[#222222]">
                <Bell size={16} />
              </button>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 space-y-5 p-6">
          {(error || toast) && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                error
                  ? 'border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200'
                  : 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
              }`}
            >
              {error ?? toast}
            </div>
          )}

          <StatsRow availability={availability} openCheckouts={openCheckouts.length} />

          {view === 'pipeline' ? (
            <>
              <CheckoutForm
                products={products}
                selectedProductId={selectedProductId}
                quantity={quantity}
                pincode={pincode}
                loading={loading}
                onProductChange={setSelectedProductId}
                onQuantityChange={setQuantity}
                onPincodeChange={setPincode}
                onSubmit={handleCheckout}
              />
              <KanbanBoard
                checkouts={sessionCheckouts}
                loading={loading}
                onPayment={handlePayment}
              />
            </>
          ) : (
            <InventoryTables
              availability={availability}
              inventory={inventory}
              productName={selectedProduct?.name}
            />
          )}
        </main>
      </div>
    </div>
  );
}
