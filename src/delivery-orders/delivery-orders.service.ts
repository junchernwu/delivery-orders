import { DeliveryOrder } from './delivery-orders.entity';
import { Injectable } from '@nestjs/common';
import { DbService, ResultFromSaveToDb } from './Services/dbService';
import {
  DeliveryHasBeenTaken,
  DeliveryIdDoesNotExist,
  InvalidIntegerForPageOrLimit,
  InvalidLimit,
  InvalidPage,
} from './ExceptionHandler/CustomErrors';
import { CreateOrderDto } from './dto/create-order.dto';
import { DistanceService } from './Services/distanceService';

export type DeliveryOrderResponseFormat = {
  id: string;
  distance: number;
  status: string;
};
export const convertDeliveryOrderToRightFormat = (
  deliveryOrder: DeliveryOrder,
): DeliveryOrderResponseFormat => ({
  id: deliveryOrder.orderId,
  distance: deliveryOrder.distance,
  status: deliveryOrder.status.toUpperCase(),
});

@Injectable()
export class DeliveryOrdersService {
  constructor(
    private readonly dbService: DbService,
    private readonly distanceService: DistanceService,
  ) {}

  private isNotValidInteger(num: number): boolean {
    return isNaN(num) || !Number.isInteger(Number(num));
  }
  async create(
    createOrderDto: CreateOrderDto,
  ): Promise<DeliveryOrderResponseFormat> {
    const { origin, destination } = createOrderDto;
    const order = new DeliveryOrder();
    order.distance = await this.distanceService.getDistance(
      origin,
      destination,
    );
    order.dateTimeField = new Date();
    const saveResult = await this.dbService.saveOrder(order);
    return convertDeliveryOrderToRightFormat(saveResult);
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
    const orders = await this.dbService.retrieveOrdersWithPageAndLimit(
      page,
      limit,
    );
    const reformatOrders: DeliveryOrderResponseFormat[] = orders.map((order) =>
      convertDeliveryOrderToRightFormat(order),
    );
    return reformatOrders;
  }

  async updateOrderStatus(id: string): Promise<any> {
    const result = await this.dbService.takeOrderWithLock(id);
    if (result === ResultFromSaveToDb.INVALID_ID) {
      throw new DeliveryIdDoesNotExist(id.toString());
    }
    if (result === ResultFromSaveToDb.TAKEN) {
      throw new DeliveryHasBeenTaken(id.toString());
    }
    if (result === ResultFromSaveToDb.SUCCESS) {
      return { status: ResultFromSaveToDb.SUCCESS };
    }
  }
}
