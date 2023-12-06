import { Injectable } from '@nestjs/common';
import { DeliveryOrder, OrderStatus } from '../delivery-orders.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  FailureRetrievingOrdersFromDbWithPageAndLimit,
  FailureSavingOrderToDB,
} from '../ExceptionHandler/CustomErrors';

export enum ResultFromSaveToDb {
  INVALID_ID = 'INVALID_ID',
  TAKEN = 'TAKEN',
  SUCCESS = 'SUCCESS',
}
@Injectable()
export class DbService {
  constructor(
    @InjectRepository(DeliveryOrder)
    private orderRepository: Repository<DeliveryOrder>,
    private dataSource: DataSource,
  ) {}

  async saveOrder(order: DeliveryOrder): Promise<DeliveryOrder> {
    try {
      const saveResponse = await this.orderRepository.save(order);
      return saveResponse;
    } catch (error) {
      // Handle the exception
      throw new FailureSavingOrderToDB(order.orderId);
    }
  }

  async findAll(): Promise<DeliveryOrder[]> {
    return this.orderRepository.find();
  }
  async takeOrderWithLock(orderId: string): Promise<ResultFromSaveToDb> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager
        .getRepository(DeliveryOrder)
        .createQueryBuilder('order')
        .setLock('pessimistic_write')
        .where('order.orderId = :id', { id: orderId })
        .getOne();
      // Check if order is present
      if (order == null) {
        await queryRunner.rollbackTransaction();
        return ResultFromSaveToDb.INVALID_ID;
      } else if (order.status.toUpperCase() === OrderStatus.UNASSIGNED) {
        order.status = OrderStatus.TAKEN;
        await queryRunner.manager.save(order);
        await queryRunner.commitTransaction();
        return ResultFromSaveToDb.SUCCESS;
      } else {
        await queryRunner.rollbackTransaction();
        return ResultFromSaveToDb.TAKEN;
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }
  async retrieveOrdersWithPageAndLimit(page: number, limit: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      return await queryRunner.manager
        .getRepository(DeliveryOrder)
        .createQueryBuilder('order')
        .select()
        .orderBy('order.dateTimeField', 'ASC')
        .skip((page - 1) * limit)
        .take(limit)
        .getMany();
    } catch (error) {
      throw new FailureRetrievingOrdersFromDbWithPageAndLimit();
    } finally {
      await queryRunner.release();
    }
  }
}
