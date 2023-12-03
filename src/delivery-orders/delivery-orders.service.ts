import { Order } from './delivery-orders.entity';
import { Injectable } from '@nestjs/common';
import { DbService } from './Services/dbService';
import {
  DeliveryHasBeenTaken,
  InvalidIntegerForPageOrLimit,
  InvalidLimit,
  InvalidPage,
} from './ExceptionHandler/CustomErrors';
import { CreateOrderDto } from './dto/create-order.dto';
import { DistanceService } from './Services/distanceService';

@Injectable()
export class DeliveryOrdersService {
  constructor(
    private readonly dbService: DbService,
    private readonly distanceService: DistanceService,
  ) {}

  private isNotValidInteger(num: number): boolean {
    return isNaN(num) || !Number.isInteger(Number(num));
  }
  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const { origin, destination } = createOrderDto;
    const order = new Order();
    order.distance = await this.distanceService.getDistance(
      origin,
      destination,
    );
    order.dateTimeField = new Date();
    return this.dbService.saveOrder(order);
  }

  async getOrdersWithPageAndLimit(page: number, limit: number) {
    const isPageInvalid = this.isNotValidInteger(page);
    const isLimitInvalid = this.isNotValidInteger(limit);
    if (isPageInvalid || isLimitInvalid) {
      throw new InvalidIntegerForPageOrLimit(isPageInvalid, isLimitInvalid);
    }
    // check if page number is at least 1
    if (page < 1) {
      throw new InvalidPage();
    }
    if (limit < 1) {
      throw new InvalidLimit();
    }
    return await this.dbService.retrieveOrdersWithPageAndLimit(page, limit);
  }

  async updateOrderStatus(id: number): Promise<string> {
    const result = await this.dbService.takeOrderWithLock(id);
    if (result === false) {
      throw new DeliveryHasBeenTaken(id.toString());
    } else {
      return 'success';
    }
  }
}
