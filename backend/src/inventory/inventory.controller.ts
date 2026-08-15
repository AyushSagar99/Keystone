import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AddInventoryDto } from '../common/dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  add(@Body() dto: AddInventoryDto) {
    return this.inventoryService.addStock(
      dto.productId,
      dto.locationId,
      dto.quantity,
    );
  }

  @Get('product/:productId')
  getByProduct(@Param('productId') productId: string) {
    return this.inventoryService.getByProduct(productId);
  }
}
