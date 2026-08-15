import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Availability, InventoryRow } from '@/lib/api';

type Props = {
  availability: Availability | null;
  inventory: InventoryRow[];
  productName?: string;
};

export function InventoryTables({ availability, inventory, productName }: Props) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Product availability</CardTitle>
          <CardDescription>
            {productName ? `${productName} — live stock summary` : 'Select a product'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availability ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-3 font-medium">Location</th>
                    <th className="pb-3 font-medium">Stock</th>
                    <th className="pb-3 font-medium">Reserved</th>
                    <th className="pb-3 font-medium">Available</th>
                  </tr>
                </thead>
                <tbody>
                  {availability.locations.map((row) => (
                    <tr key={row.locationId} className="border-b border-border/70">
                      <td className="py-3 font-medium">{row.locationName}</td>
                      <td className="py-3">{row.stock}</td>
                      <td className="py-3 text-amber-700 dark:text-amber-400">{row.reserved}</td>
                      <td className="py-3 text-emerald-700 dark:text-emerald-400">{row.available}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No availability data yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Location inventory</CardTitle>
          <CardDescription>Warehouse metadata and raw stock rows</CardDescription>
        </CardHeader>
        <CardContent>
          {inventory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-3 font-medium">Location</th>
                    <th className="pb-3 font-medium">City</th>
                    <th className="pb-3 font-medium">Priority</th>
                    <th className="pb-3 font-medium">Zones</th>
                    <th className="pb-3 font-medium">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((row) => (
                    <tr key={row.id} className="border-b border-border/70">
                      <td className="py-3 font-medium">{row.location.name}</td>
                      <td className="py-3">{row.location.city}</td>
                      <td className="py-3">P{row.location.priority}</td>
                      <td className="py-3 text-xs text-muted-foreground">
                        {row.location.serviceZones.join(', ') || '—'}
                      </td>
                      <td className="py-3">{row.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No inventory rows yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
