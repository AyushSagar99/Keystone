import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  addInventory,
  CheckoutBody,
  createTestApp,
  resetDatabase,
  seedLocation,
  seedProduct,
} from './helpers';

describe('Inventory reservation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    prisma = ctx.prisma;
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  async function startCheckout(
    body: CheckoutBody,
    idempotencyKey: string,
    expectedStatus = 201,
  ) {
    const res = await request(app.getHttpServer())
      .post('/checkouts')
      .set('Idempotency-Key', idempotencyKey)
      .send(body)
      .expect(expectedStatus);
    return res.body;
  }

  async function getAvailability(productId: string) {
    const res = await request(app.getHttpServer())
      .get(`/products/${productId}/availability`)
      .expect(200);
    return res.body;
  }

  async function getInventory(productId: string, locationId: string) {
    return prisma.inventory.findUniqueOrThrow({
      where: { productId_locationId: { productId, locationId } },
    });
  }

  it('checkout reserves stock and reduces available stock', async () => {
    const product = await seedProduct(prisma);
    const location = await seedLocation(prisma, {
      name: 'Delhi WH',
      city: 'Delhi',
      state: 'Delhi',
      priority: 1,
      serviceZones: ['110001'],
    });
    await addInventory(prisma, product.id, location.id, 10);

    await startCheckout(
      {
        productId: product.id,
        quantity: 3,
        deliveryPincode: '110001',
      },
      'key-reserve-1',
    );

    const availability = await getAvailability(product.id);
    expect(availability.totalStock).toBe(10);
    expect(availability.totalReserved).toBe(3);
    expect(availability.totalAvailable).toBe(7);

    const row = await getInventory(product.id, location.id);
    expect(row.stock).toBe(10);
    expect(row.reserved).toBe(3);
  });

  it('payment success deducts stock and clears reserved stock', async () => {
    const product = await seedProduct(prisma);
    const location = await seedLocation(prisma, {
      name: 'Delhi WH',
      city: 'Delhi',
      state: 'Delhi',
      priority: 1,
      serviceZones: ['110001'],
    });
    await addInventory(prisma, product.id, location.id, 10);

    const checkout = await startCheckout(
      {
        productId: product.id,
        quantity: 4,
        deliveryPincode: '110001',
      },
      'key-success-1',
    );

    await request(app.getHttpServer())
      .post(`/checkouts/${checkout.id}/payment/success`)
      .expect(201);

    const availability = await getAvailability(product.id);
    expect(availability.totalStock).toBe(6);
    expect(availability.totalReserved).toBe(0);
    expect(availability.totalAvailable).toBe(6);

    const row = await getInventory(product.id, location.id);
    expect(row.stock).toBe(6);
    expect(row.reserved).toBe(0);
  });

  it('payment failure releases reserved stock', async () => {
    const product = await seedProduct(prisma);
    const location = await seedLocation(prisma, {
      name: 'Delhi WH',
      city: 'Delhi',
      state: 'Delhi',
      priority: 1,
      serviceZones: ['110001'],
    });
    await addInventory(prisma, product.id, location.id, 10);

    const checkout = await startCheckout(
      {
        productId: product.id,
        quantity: 2,
        deliveryPincode: '110001',
      },
      'key-fail-1',
    );

    await request(app.getHttpServer())
      .post(`/checkouts/${checkout.id}/payment/failed`)
      .expect(201);

    const availability = await getAvailability(product.id);
    expect(availability.totalStock).toBe(10);
    expect(availability.totalReserved).toBe(0);
    expect(availability.totalAvailable).toBe(10);
  });

  it('user-dropped payment keeps stock reserved before expiry', async () => {
    const product = await seedProduct(prisma);
    const location = await seedLocation(prisma, {
      name: 'Delhi WH',
      city: 'Delhi',
      state: 'Delhi',
      priority: 1,
      serviceZones: ['110001'],
    });
    await addInventory(prisma, product.id, location.id, 10);

    const checkout = await startCheckout(
      {
        productId: product.id,
        quantity: 2,
        deliveryPincode: '110001',
      },
      'key-drop-1',
    );

    const dropped = await request(app.getHttpServer())
      .post(`/checkouts/${checkout.id}/payment/dropped`)
      .expect(201);

    expect(dropped.body.status).toBe('USER_DROPPED');
    expect(dropped.body.expiresAt).toBeTruthy();

    const availability = await getAvailability(product.id);
    expect(availability.totalReserved).toBe(2);
    expect(availability.totalAvailable).toBe(8);
  });

  it('expired user-dropped payment releases reserved stock', async () => {
    const product = await seedProduct(prisma);
    const location = await seedLocation(prisma, {
      name: 'Delhi WH',
      city: 'Delhi',
      state: 'Delhi',
      priority: 1,
      serviceZones: ['110001'],
    });
    await addInventory(prisma, product.id, location.id, 10);

    const checkout = await startCheckout(
      {
        productId: product.id,
        quantity: 2,
        deliveryPincode: '110001',
      },
      'key-expire-1',
    );

    await request(app.getHttpServer())
      .post(`/checkouts/${checkout.id}/payment/dropped`)
      .expect(201);

    await prisma.checkout.update({
      where: { id: checkout.id },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    const result = await request(app.getHttpServer())
      .post('/checkouts/expire')
      .expect(201);

    expect(result.body.expiredCount).toBe(1);

    const availability = await getAvailability(product.id);
    expect(availability.totalReserved).toBe(0);
    expect(availability.totalAvailable).toBe(10);
  });

  it('location selection prefers matching pincode / service zone', async () => {
    const product = await seedProduct(prisma);
    const delhi = await seedLocation(prisma, {
      name: 'Delhi WH',
      city: 'Delhi',
      state: 'Delhi',
      priority: 1,
      serviceZones: ['110001'],
    });
    const noida = await seedLocation(prisma, {
      name: 'Noida WH',
      city: 'Noida',
      state: 'Uttar Pradesh',
      priority: 2,
      serviceZones: ['110001'],
    });
    await addInventory(prisma, product.id, delhi.id, 10);
    await addInventory(prisma, product.id, noida.id, 10);

    const checkout = await startCheckout(
      {
        productId: product.id,
        quantity: 2,
        deliveryPincode: '110001',
      },
      'key-location-1',
    );

    expect(checkout.locationId).toBe(delhi.id);
  });

  it('fallback selection works when no service-zone location has stock', async () => {
    const product = await seedProduct(prisma);
    const delhi = await seedLocation(prisma, {
      name: 'Delhi WH',
      city: 'Delhi',
      state: 'Delhi',
      priority: 1,
      serviceZones: ['110001'],
    });
    const mumbai = await seedLocation(prisma, {
      name: 'Mumbai WH',
      city: 'Mumbai',
      state: 'Maharashtra',
      priority: 1,
      serviceZones: ['400001'],
    });
    await addInventory(prisma, product.id, delhi.id, 0);
    await addInventory(prisma, product.id, mumbai.id, 8);

    const checkout = await startCheckout(
      {
        productId: product.id,
        quantity: 2,
        deliveryPincode: '110001',
      },
      'key-fallback-1',
    );

    expect(checkout.locationId).toBe(mumbai.id);
  });

  it('idempotent checkout retry returns the existing checkout without reserving twice', async () => {
    const product = await seedProduct(prisma);
    const location = await seedLocation(prisma, {
      name: 'Delhi WH',
      city: 'Delhi',
      state: 'Delhi',
      priority: 1,
      serviceZones: ['110001'],
    });
    await addInventory(prisma, product.id, location.id, 10);

    const body = {
      productId: product.id,
      quantity: 2,
      deliveryPincode: '110001',
    };

    const first = await startCheckout(body, 'key-idem-1');
    const second = await startCheckout(body, 'key-idem-1');

    expect(second.id).toBe(first.id);

    const availability = await getAvailability(product.id);
    expect(availability.totalReserved).toBe(2);
  });

  it('same idempotency key with a changed payload is rejected', async () => {
    const product = await seedProduct(prisma);
    const location = await seedLocation(prisma, {
      name: 'Delhi WH',
      city: 'Delhi',
      state: 'Delhi',
      priority: 1,
      serviceZones: ['110001'],
    });
    await addInventory(prisma, product.id, location.id, 10);

    await startCheckout(
      {
        productId: product.id,
        quantity: 2,
        deliveryPincode: '110001',
      },
      'key-conflict-1',
    );

    await startCheckout(
      {
        productId: product.id,
        quantity: 5,
        deliveryPincode: '110001',
      },
      'key-conflict-1',
      409,
    );

    const availability = await getAvailability(product.id);
    expect(availability.totalReserved).toBe(2);
  });

  it('concurrent checkouts cannot reserve more than available stock', async () => {
    const product = await seedProduct(prisma);
    const location = await seedLocation(prisma, {
      name: 'Delhi WH',
      city: 'Delhi',
      state: 'Delhi',
      priority: 1,
      serviceZones: ['110001'],
    });
    await addInventory(prisma, product.id, location.id, 1);

    const body = {
      productId: product.id,
      quantity: 1,
      deliveryPincode: '110001',
    };

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        request(app.getHttpServer())
          .post('/checkouts')
          .set('Idempotency-Key', `key-concurrent-${i}`)
          .send(body),
      ),
    );

    const successes = results.filter((r) => r.status === 201);
    const failures = results.filter((r) => r.status === 422);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(9);

    const availability = await getAvailability(product.id);
    expect(availability.totalReserved).toBe(1);
    expect(availability.totalAvailable).toBe(0);
  });
});
