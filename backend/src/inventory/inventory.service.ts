import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async addStock(productId: string, locationId: string, quantity: number) {
    return this.prisma.inventory.upsert({
      where: {
        productId_locationId: { productId, locationId },
      },
      create: { productId, locationId, stock: quantity, reserved: 0 },
      update: { stock: { increment: quantity } },
      include: { product: true, location: true },
    });
  }

  async reserve(
    inventoryId: string,
    quantity: number,
    tx: Prisma.TransactionClient,
  ) {
    const rows = await tx.$queryRaw<
      Array<{ id: string; stock: number; reserved: number }>
    >`
      SELECT id, stock, reserved
      FROM "Inventory"
      WHERE id = ${inventoryId}
      FOR UPDATE
    `;

    const row = rows[0];
    if (!row || row.stock - row.reserved < quantity) {
      throw new Error('INSUFFICIENT_STOCK');
    }

    return tx.inventory.update({
      where: { id: inventoryId },
      data: { reserved: { increment: quantity } },
      include: { product: true, location: true },
    });
  }

  async release(
    inventoryId: string,
    quantity: number,
    tx: Prisma.TransactionClient,
  ) {
    await this.lockRow(inventoryId, tx);
    return tx.inventory.update({
      where: { id: inventoryId },
      data: { reserved: { decrement: quantity } },
      include: { product: true, location: true },
    });
  }

  async confirmSale(
    inventoryId: string,
    quantity: number,
    tx: Prisma.TransactionClient,
  ) {
    const row = await this.lockRow(inventoryId, tx);
    if (row.reserved < quantity) {
      throw new Error('INSUFFICIENT_RESERVED');
    }

    return tx.inventory.update({
      where: { id: inventoryId },
      data: {
        stock: { decrement: quantity },
        reserved: { decrement: quantity },
      },
      include: { product: true, location: true },
    });
  }

  findForCheckout(
    productId: string,
    locationId: string,
    tx: Prisma.TransactionClient,
  ) {
    return tx.inventory.findUniqueOrThrow({
      where: { productId_locationId: { productId, locationId } },
    });
  }

  private async lockRow(inventoryId: string, tx: Prisma.TransactionClient) {
    const rows = await tx.$queryRaw<
      Array<{ id: string; stock: number; reserved: number }>
    >`
      SELECT id, stock, reserved
      FROM "Inventory"
      WHERE id = ${inventoryId}
      FOR UPDATE
    `;

    const row = rows[0];
    if (!row) {
      throw new Error('INVENTORY_NOT_FOUND');
    }
    return row;
  }

  async getByProduct(productId: string) {
    return this.prisma.inventory.findMany({
      where: { productId },
      include: { location: true, product: true },
    });
  }

  async getAvailability(productId: string) {
    const rows = await this.getByProduct(productId);
    const totalStock = rows.reduce((sum, row) => sum + row.stock, 0);
    const totalReserved = rows.reduce((sum, row) => sum + row.reserved, 0);

    return {
      productId,
      totalStock,
      totalReserved,
      totalAvailable: totalStock - totalReserved,
      locations: rows.map((row) => ({
        locationId: row.locationId,
        locationName: row.location.name,
        stock: row.stock,
        reserved: row.reserved,
        available: row.stock - row.reserved,
      })),
    };
  }
}
