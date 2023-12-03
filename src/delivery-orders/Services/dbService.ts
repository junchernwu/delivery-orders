import { Injectable } from '@nestjs/common';
import { Order, OrderStatus } from '../delivery-orders.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { FailureSavingOrderToDB } from '../ExceptionHandler/CustomErrors';

@Injectable()
export class DbService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private dataSource: DataSource,
  ) {}

  async saveOrder(order: Order): Promise<Order> {
    try {
      return (await this.orderRepository.save(order)) as Order;
    } catch (error) {
      // Handle the exception
      throw new FailureSavingOrderToDB(order.id);
    }
  }

  async findAll(): Promise<Order[]> {
    return this.orderRepository.find();
  }
  async takeOrderWithLock(orderId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager
        .getRepository(Order)
        .createQueryBuilder('order')
        .setLock('pessimistic_write')
        .where('order.id = :id', { id: orderId })
        .getOne();

      if (order && order.status === OrderStatus.UNASSIGNED) {
        order.status = OrderStatus.TAKEN;
        await queryRunner.manager.save(order);
        await queryRunner.commitTransaction();
        return true;
      } else {
        await queryRunner.rollbackTransaction();
        return false;
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
        .getRepository(Order)
        .createQueryBuilder('order')
        .select()
        .orderBy('order.dateTimeField', 'ASC')
        .skip((page - 1) * limit)
        .take(limit)
        .getMany();
    } catch (error) {
      console.log(error);
    } finally {
      await queryRunner.release();
    }
  }
}
