import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type InventoryWithLocation = Prisma.InventoryGetPayload<{
  include: { location: true };
}>;

@Injectable()
export class LocationPickerService {
  constructor(private readonly prisma: PrismaService) {}

  async pickLocation(
    productId: string,
    quantity: number,
    deliveryPincode: string,
    tx?: Prisma.TransactionClient,
  ): Promise<InventoryWithLocation> {
    const client = tx ?? this.prisma;

    const candidates = await client.inventory.findMany({
      where: {
        productId,
        location: { active: true },
      },
      include: { location: true },
    });

    const fulfillable = candidates.filter(
      (row) => row.stock - row.reserved >= quantity,
    );

    if (fulfillable.length === 0) {
      throw new Error('INSUFFICIENT_STOCK');
    }

    const serviceZoneMatches = fulfillable
      .filter((row) => row.location.serviceZones.includes(deliveryPincode))
      .sort((a, b) => a.location.priority - b.location.priority);

    if (serviceZoneMatches.length > 0) {
      return serviceZoneMatches[0];
    }

    const sameCity = fulfillable
      .filter((row) => row.location.city === this.pincodeCity(deliveryPincode))
      .sort((a, b) => a.location.priority - b.location.priority);
    if (sameCity.length > 0) {
      return sameCity[0];
    }

    const sameState = fulfillable
      .filter((row) => row.location.state === this.pincodeState(deliveryPincode))
      .sort((a, b) => a.location.priority - b.location.priority);
    if (sameState.length > 0) {
      return sameState[0];
    }

    return fulfillable.sort(
      (a, b) => a.location.priority - b.location.priority,
    )[0];
  }

  // Demo mapping: pincode prefix maps to city/state for assignment scenarios.
  private pincodeCity(pincode: string): string {
    const prefix = pincode.slice(0, 2);
    const map: Record<string, string> = {
      '11': 'Delhi',
      '40': 'Mumbai',
      '56': 'Bengaluru',
      '60': 'Chennai',
    };
    return map[prefix] ?? 'Unknown';
  }

  private pincodeState(pincode: string): string {
    const prefix = pincode.slice(0, 2);
    const map: Record<string, string> = {
      '11': 'Delhi',
      '40': 'Maharashtra',
      '56': 'Karnataka',
      '60': 'Tamil Nadu',
    };
    return map[prefix] ?? 'Unknown';
  }
}
