import { api } from './api';

export async function seedDemoData() {
  const sku = `WID-${Date.now().toString().slice(-6)}`;
  const product = await api.createProduct('Widget', sku);

  const delhi = await api.createLocation({
    name: 'Delhi WH',
    city: 'Delhi',
    state: 'Delhi',
    priority: 1,
    serviceZones: ['110001'],
  });

  const noida = await api.createLocation({
    name: 'Noida WH',
    city: 'Noida',
    state: 'Uttar Pradesh',
    priority: 2,
    serviceZones: ['110001'],
  });

  const mumbai = await api.createLocation({
    name: 'Mumbai WH',
    city: 'Mumbai',
    state: 'Maharashtra',
    priority: 1,
    serviceZones: ['400001'],
  });

  await api.addInventory(product.id, delhi.id, 10);
  await api.addInventory(product.id, noida.id, 8);
  await api.addInventory(product.id, mumbai.id, 5);

  return { product, locations: [delhi, noida, mumbai] };
}
