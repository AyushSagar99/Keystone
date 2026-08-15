const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5566';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    let message = body;
    try {
      const parsed = JSON.parse(body) as { message?: string | string[] };
      message = Array.isArray(parsed.message)
        ? parsed.message.join(', ')
        : (parsed.message ?? body);
    } catch {
      // keep raw body
    }
    throw new Error(message || `Request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export type Product = {
  id: string;
  name: string;
  sku: string;
};

export type Location = {
  id: string;
  name: string;
  city: string;
  state: string;
  priority: number;
  serviceZones: string[];
};

export type Checkout = {
  id: string;
  status: string;
  quantity: number;
  deliveryPincode: string;
  productId: string;
  locationId: string;
  expiresAt?: string | null;
  product?: Product;
  location?: Location;
};

export type Availability = {
  productId: string;
  totalStock: number;
  totalReserved: number;
  totalAvailable: number;
  locations: Array<{
    locationId: string;
    locationName: string;
    stock: number;
    reserved: number;
    available: number;
  }>;
};

export type InventoryRow = {
  id: string;
  productId: string;
  locationId: string;
  stock: number;
  reserved: number;
  location: Location;
  product: Product;
};

export type ExpireResult = {
  expiredCount: number;
  checkouts: Checkout[];
};

export const api = {
  createProduct: (name: string, sku: string) =>
    request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify({ name, sku }),
    }),

  createLocation: (data: {
    name: string;
    city: string;
    state: string;
    priority: number;
    serviceZones: string[];
  }) =>
    request<Location>('/locations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  addInventory: (productId: string, locationId: string, quantity: number) =>
    request<InventoryRow>('/inventory', {
      method: 'POST',
      body: JSON.stringify({ productId, locationId, quantity }),
    }),

  listProducts: () => request<Product[]>('/products'),

  listLocations: () => request<Location[]>('/locations'),

  getAvailability: (productId: string) =>
    request<Availability>(`/products/${productId}/availability`),

  getInventory: (productId: string) =>
    request<InventoryRow[]>(`/inventory/product/${productId}`),

  startCheckout: (
    data: { productId: string; quantity: number; deliveryPincode: string },
    idempotencyKey: string,
  ) =>
    request<Checkout>('/checkouts', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(data),
    }),

  paymentSuccess: (checkoutId: string) =>
    request<Checkout>(`/checkouts/${checkoutId}/payment/success`, {
      method: 'POST',
    }),

  paymentFailed: (checkoutId: string) =>
    request<Checkout>(`/checkouts/${checkoutId}/payment/failed`, {
      method: 'POST',
    }),

  paymentDropped: (checkoutId: string) =>
    request<Checkout>(`/checkouts/${checkoutId}/payment/dropped`, {
      method: 'POST',
    }),

  expireAbandoned: () =>
    request<ExpireResult>('/checkouts/expire', { method: 'POST' }),

  getCheckout: (checkoutId: string) =>
    request<Checkout>(`/checkouts/${checkoutId}`),

  seedScenario: () =>
    request<{
      products: Product[];
      locations: Location[];
    }>('/demo/seed', { method: 'POST' }),
};
