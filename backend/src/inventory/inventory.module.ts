import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { LocationPickerService } from './location-picker.service';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, LocationPickerService],
  exports: [InventoryService, LocationPickerService],
})
export class InventoryModule {}
