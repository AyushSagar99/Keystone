import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DemoService {
  constructor(private readonly prisma: PrismaService) {}

  async seedScenario() {
    await this.prisma.checkout.deleteMany();
    await this.prisma.inventory.deleteMany();
    await this.prisma.product.deleteMany();
    await this.prisma.location.deleteMany();

    const product = await this.prisma.product.create({
      data: { name: 'Widget', sku: 'WID-DEMO' },
    });

    const delhi = await this.prisma.location.create({
      data: {
        name: 'Delhi WH',
        city: 'Delhi',
        state: 'Delhi',
        priority: 1,
        serviceZones: ['110001'],
      },
    });

    const noida = await this.prisma.location.create({
      data: {
        name: 'Noida WH',
        city: 'Noida',
        state: 'Uttar Pradesh',
        priority: 2,
        serviceZones: ['110001'],
      },
    });

    const mumbai = await this.prisma.location.create({
      data: {
        name: 'Mumbai WH',
        city: 'Mumbai',
        state: 'Maharashtra',
        priority: 1,
        serviceZones: ['400001'],
      },
    });

    await this.prisma.inventory.createMany({
      data: [
        { productId: product.id, locationId: delhi.id, stock: 10, reserved: 0 },
        { productId: product.id, locationId: noida.id, stock: 8, reserved: 0 },
        { productId: product.id, locationId: mumbai.id, stock: 5, reserved: 0 },
      ],
    });

    return {
      product,
      locations: [delhi, noida, mumbai],
    };
  }
}
