import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
} from '@nestjs/common';
import { StartCheckoutDto } from '../common/dto';
import { CheckoutsService } from './checkouts.service';

@Controller('checkouts')
export class CheckoutsController {
  constructor(private readonly checkoutsService: CheckoutsService) {}

  @Post()
  start(
    @Body() dto: StartCheckoutDto,
    @Headers('idempotency-key') idempotencyKey: string,
  ) {
    return this.checkoutsService.startCheckout(dto, idempotencyKey);
  }

  @Post('expire')
  expireAbandoned() {
    return this.checkoutsService.expireAbandonedCheckouts();
  }

  @Post(':id/payment/success')
  paymentSuccess(@Param('id') id: string) {
    return this.checkoutsService.markPaymentSuccess(id);
  }

  @Post(':id/payment/failed')
  paymentFailed(@Param('id') id: string) {
    return this.checkoutsService.markPaymentFailed(id);
  }

  @Post(':id/payment/dropped')
  paymentDropped(@Param('id') id: string) {
    return this.checkoutsService.markPaymentDropped(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.checkoutsService.findOne(id);
  }
}
