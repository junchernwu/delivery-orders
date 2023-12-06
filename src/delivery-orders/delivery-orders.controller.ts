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
import {
  InvalidPatchRequestBody,
  InvalidPostRequestBody,
} from './ExceptionHandler/CustomErrors';
import { IsString } from 'class-validator';

class TakeOrderDto {
  @IsString({ message: 'Status must be a string' })
  status: string;
}

@Controller('/orders')
export class DeliveryOrdersController {
  constructor(private readonly deliveryOrderService: DeliveryOrdersService) {}

  @Post('/')
  @UsePipes(new ValidationPipe())
  async create(
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<DeliveryOrderResponseFormat> {
    if (Object.keys(createOrderDto).length > 2) {
      throw new InvalidPostRequestBody();
    }

    const deliveryOrder =
      await this.deliveryOrderService.create(createOrderDto);
    return deliveryOrder;
  }

  @Get()
  async getOrders(@Query('page') page: number, @Query('limit') limit: number) {
    return this.deliveryOrderService.getOrdersWithPageAndLimit(page, limit);
  }

  @Patch('/:id')
  takeOrder(@Param('id') id: string, @Body() body: TakeOrderDto): Promise<any> {
    // Check if the status is correct
    if (
      !body.status ||
      body.status != 'TAKEN' ||
      Object.keys(body).length > 1
    ) {
      throw new InvalidPatchRequestBody();
    }
    return this.deliveryOrderService.updateOrderStatus(id);
  }
}
