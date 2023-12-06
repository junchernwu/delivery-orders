import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  DeliveryOrderResponseFormat,
  DeliveryOrdersService,
} from './delivery-orders.service';
import { InvalidRequestBody } from './ExceptionHandler/CustomErrors';

@Controller('/orders')
export class DeliveryOrdersController {
  constructor(private readonly deliveryOrderService: DeliveryOrdersService) {}

  @Post('/')
  @UsePipes(new ValidationPipe())
  async create(
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<DeliveryOrderResponseFormat> {
    const deliveryOrder =
      await this.deliveryOrderService.create(createOrderDto);
    return deliveryOrder;
  }

  @Get()
  async getOrders(@Query('page') page: number, @Query('limit') limit: number) {
    return this.deliveryOrderService.getOrdersWithPageAndLimit(page, limit);
  }

  @Patch('/:id')
  takeOrder(
    @Param('id') id: string,
    @Body() body: { status: string },
  ): Promise<any> {
    // Check if the status is correct
    if (body.status != 'TAKEN') {
      throw new InvalidRequestBody();
    }
    return this.deliveryOrderService.updateOrderStatus(id);
  }
}
