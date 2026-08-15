import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateProductDto } from '../common/dto';
import { InventoryService } from '../inventory/inventory.service';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly inventoryService: InventoryService,
  ) {}

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id/availability')
  availability(@Param('id') id: string) {
    return this.inventoryService.getAvailability(id);
  }
}
