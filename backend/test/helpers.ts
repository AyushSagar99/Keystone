import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/prisma/prisma.service';
import { AppModule } from '../src/app.module';

export async function createTestApp(): Promise<{
  app: INestApplication;
  prisma: PrismaService;
}> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.init();

  const prisma = app.get(PrismaService);
  return { app, prisma };
}

export async function resetDatabase(prisma: PrismaService) {
  await prisma.checkout.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.location.deleteMany();
}

export async function seedProduct(prisma: PrismaService, sku = 'TEST-SKU') {
  return prisma.product.create({
    data: { name: 'Test Widget', sku },
  });
}

export async function seedLocation(
  prisma: PrismaService,
  data: {
    name: string;
    city: string;
    state: string;
    priority: number;
    serviceZones: string[];
  },
) {
  return prisma.location.create({ data });
}

export async function addInventory(
  prisma: PrismaService,
  productId: string,
  locationId: string,
  quantity: number,
) {
  return prisma.inventory.create({
    data: { productId, locationId, stock: quantity, reserved: 0 },
  });
}

export type CheckoutBody = {
  productId: string;
  quantity: number;
  deliveryPincode: string;
};
