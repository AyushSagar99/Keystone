import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CheckoutStatus, Prisma } from '@prisma/client';
import { hashPayload } from '../common/hash';
import { StartCheckoutDto } from '../common/dto';
import { InventoryService } from '../inventory/inventory.service';
import { LocationPickerService } from '../inventory/location-picker.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CheckoutsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly locationPicker: LocationPickerService,
  ) {}

  async startCheckout(dto: StartCheckoutDto, idempotencyKey: string) {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    const payload = {
      productId: dto.productId,
      quantity: dto.quantity,
      deliveryPincode: dto.deliveryPincode,
    };
    const payloadHash = hashPayload(payload);

    const existing = await this.prisma.checkout.findUnique({
      where: { idempotencyKey },
      include: { product: true, location: true },
    });

    if (existing) {
      if (existing.payloadHash !== payloadHash) {
        throw new ConflictException(
          'Idempotency key reused with different payload',
        );
      }
      return existing;
    }

    try {
      await this.prisma.product.findUniqueOrThrow({
        where: { id: dto.productId },
      });
    } catch {
      throw new NotFoundException('Product not found');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const inventory = await this.locationPicker.pickLocation(
          dto.productId,
          dto.quantity,
          dto.deliveryPincode,
          tx,
        );

        await this.inventoryService.reserve(inventory.id, dto.quantity, tx);

        return tx.checkout.create({
          data: {
            productId: dto.productId,
            locationId: inventory.locationId,
            quantity: dto.quantity,
            deliveryPincode: dto.deliveryPincode,
            status: CheckoutStatus.RESERVED,
            idempotencyKey,
            payloadHash,
          },
          include: { product: true, location: true },
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'INSUFFICIENT_STOCK') {
        throw new UnprocessableEntityException('Insufficient stock');
      }
      throw error;
    }
  }

  async markPaymentSuccess(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const checkout = await this.lockCheckout(id, tx);

      if (
        checkout.status !== CheckoutStatus.RESERVED &&
        checkout.status !== CheckoutStatus.USER_DROPPED
      ) {
        throw new ConflictException(
          `Cannot mark success from status ${checkout.status}`,
        );
      }

      if (
        checkout.status === CheckoutStatus.USER_DROPPED &&
        checkout.expiresAt &&
        checkout.expiresAt <= new Date()
      ) {
        throw new ConflictException('Checkout retry window has expired');
      }

      const inventory = await this.inventoryService.findForCheckout(
        checkout.productId,
        checkout.locationId,
        tx,
      );

      await this.inventoryService.confirmSale(
        inventory.id,
        checkout.quantity,
        tx,
      );

      return tx.checkout.update({
        where: { id },
        data: { status: CheckoutStatus.PAID },
        include: { product: true, location: true },
      });
    });
  }

  async markPaymentFailed(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const checkout = await this.lockCheckout(id, tx);

      if (checkout.status !== CheckoutStatus.RESERVED) {
        throw new ConflictException(
          `Cannot mark failed from status ${checkout.status}`,
        );
      }

      const inventory = await this.inventoryService.findForCheckout(
        checkout.productId,
        checkout.locationId,
        tx,
      );

      await this.inventoryService.release(
        inventory.id,
        checkout.quantity,
        tx,
      );

      return tx.checkout.update({
        where: { id },
        data: { status: CheckoutStatus.FAILED },
        include: { product: true, location: true },
      });
    });
  }

  async markPaymentDropped(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const checkout = await this.lockCheckout(id, tx);

      if (checkout.status !== CheckoutStatus.RESERVED) {
        throw new ConflictException(
          `Cannot mark dropped from status ${checkout.status}`,
        );
      }

      const expiresAt = new Date();
      expiresAt.setMinutes(
        expiresAt.getMinutes() + this.getRetryWindowMinutes(),
      );

      return tx.checkout.update({
        where: { id },
        data: {
          status: CheckoutStatus.USER_DROPPED,
          expiresAt,
        },
        include: { product: true, location: true },
      });
    });
  }

  async expireAbandonedCheckouts() {
    const now = new Date();
    const expired = await this.prisma.checkout.findMany({
      where: {
        status: CheckoutStatus.USER_DROPPED,
        expiresAt: { lte: now },
      },
    });

    const results = [];
    for (const checkout of expired) {
      const updated = await this.prisma.$transaction(async (tx) => {
        const locked = await this.lockCheckout(checkout.id, tx);

        if (
          locked.status !== CheckoutStatus.USER_DROPPED ||
          !locked.expiresAt ||
          locked.expiresAt > now
        ) {
          return null;
        }

        const inventory = await this.inventoryService.findForCheckout(
          locked.productId,
          locked.locationId,
          tx,
        );

        await this.inventoryService.release(
          inventory.id,
          locked.quantity,
          tx,
        );

        return tx.checkout.update({
          where: { id: locked.id },
          data: { status: CheckoutStatus.EXPIRED },
          include: { product: true, location: true },
        });
      });

      if (updated) {
        results.push(updated);
      }
    }

    return { expiredCount: results.length, checkouts: results };
  }

  findOne(id: string) {
    return this.prisma.checkout.findUniqueOrThrow({
      where: { id },
      include: { product: true, location: true },
    });
  }

  private getRetryWindowMinutes(): number {
    return Number(process.env.CHECKOUT_RETRY_WINDOW_MINUTES) || 15;
  }

  private async lockCheckout(id: string, tx: Prisma.TransactionClient) {
    const rows = await tx.$queryRaw<
      Array<{
        id: string;
        productId: string;
        locationId: string;
        quantity: number;
        status: CheckoutStatus;
        expiresAt: Date | null;
      }>
    >`
      SELECT id, "productId", "locationId", quantity, status, "expiresAt"
      FROM "Checkout"
      WHERE id = ${id}
      FOR UPDATE
    `;

    const checkout = rows[0];
    if (!checkout) {
      throw new NotFoundException('Checkout not found');
    }
    return checkout;
  }
}
