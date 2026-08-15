import { Module } from '@nestjs/common';
import { CheckoutsModule } from './checkouts/checkouts.module';
import { DemoModule } from './demo/demo.module';
import { InventoryModule } from './inventory/inventory.module';
import { LocationsModule } from './locations/locations.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    PrismaModule,
    ProductsModule,
    LocationsModule,
    InventoryModule,
    CheckoutsModule,
    DemoModule,
  ],
})
export class AppModule {}
