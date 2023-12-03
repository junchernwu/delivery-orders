import { Test, TestingModule } from '@nestjs/testing';
import { DbService } from './dbService';
import { DataSource, getRepository, QueryRunner, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order, OrderStatus } from '../delivery-orders.entity';
import { FailureSavingOrderToDB } from '../ExceptionHandler/CustomErrors';

const order = new Order();
order.id = 123;
describe('DbService', () => {
  let service: DbService;
  let orderRepository: Repository<Order>;
  let dataSource: DataSource;
  const qr = {
    manager: {
      getRepository,
    },
  } as QueryRunner;
  class ConnectionMock {
    createQueryRunner(mode?: 'master' | 'slave'): QueryRunner {
      return qr;
    }
  }
  beforeEach(async () => {
    Object.assign(qr.manager, {
      save: jest.fn(),
    });
    qr.connect = jest.fn();
    qr.release = jest.fn();
    qr.startTransaction = jest.fn();
    qr.commitTransaction = jest.fn();
    qr.rollbackTransaction = jest.fn();
    qr.release = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DbService,
        {
          provide: getRepositoryToken(Order),
          useClass: Repository,
        },
        {
          provide: DataSource,
          useClass: ConnectionMock,
        },
      ],
    }).compile();

    service = module.get<DbService>(DbService);
    orderRepository = module.get(getRepositoryToken(Order));
    dataSource = module.get<DataSource>(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(orderRepository).toBeDefined();
    expect(dataSource).toBeDefined();
  });

  it('should throw FailureSavingOrderToDB', async () => {
    const order = new Order();
    order.status = OrderStatus.UNASSIGNED;
    order.distance = 10;
    order.dateTimeField = new Date();
    order.id = 123;

    const error = new Error('Test error');
    jest.spyOn(service['orderRepository'], 'save').mockRejectedValue(error);
    await expect(service.saveOrder(order)).rejects.toStrictEqual(
      new FailureSavingOrderToDB(order.id),
    );
  });

  it('takeOrderWithLock should return true when order is not taken', async () => {
    // Create a sample order
    const order = new Order();
    order.id = 1;
    order.status = OrderStatus.UNASSIGNED;
    const queryRunner = dataSource.createQueryRunner();
    jest.spyOn(queryRunner.manager, 'getRepository').mockImplementation(() => {
      const original = jest.requireActual('typeorm');
      return {
        ...original,
        createQueryBuilder: jest.fn().mockImplementation(() => {
          return {
            subQuery: jest.fn().mockReturnThis() as unknown,
            from: jest.fn().mockReturnThis() as unknown,
            where: jest.fn().mockReturnThis() as unknown,
            setLock: jest.fn().mockReturnThis() as unknown,
            getQuery: jest.fn().mockReturnThis() as unknown,
            setParameter: jest.fn().mockReturnThis() as unknown,
            getOne: jest.fn().mockResolvedValue(order) as unknown,
          };
        }),
      };
    });

    const result = await service.takeOrderWithLock(order.id);
    expect(result).toBeTruthy();
    expect(queryRunner.manager.save).toHaveBeenCalledWith(order);
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
  });

  it('takeOrderWithLock should return false when order is taken', async () => {
    const order = new Order();
    order.id = 1;
    order.status = OrderStatus.TAKEN;
    const queryRunner = dataSource.createQueryRunner();

    jest.spyOn(queryRunner.manager, 'getRepository').mockImplementation(() => {
      const original = jest.requireActual('typeorm');
      return {
        ...original,
        createQueryBuilder: jest.fn().mockImplementation(() => {
          return {
            subQuery: jest.fn().mockReturnThis() as unknown,
            from: jest.fn().mockReturnThis() as unknown,
            where: jest.fn().mockReturnThis() as unknown,
            setLock: jest.fn().mockReturnThis() as unknown,
            getQuery: jest.fn().mockReturnThis() as unknown,
            setParameter: jest.fn().mockReturnThis() as unknown,
            getOne: jest.fn().mockResolvedValue(order) as unknown,
          };
        }),
      };
    });

    const result = await service.takeOrderWithLock(order.id);
    expect(result).toBe(false);
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
  });

  it('should retrieve orders with page and limit', async () => {
    const order1 = new Order();
    order1.id = 1;
    order1.status = OrderStatus.TAKEN;
    const orders = [order1];
    const queryRunner = dataSource.createQueryRunner();
    jest.spyOn(queryRunner.manager, 'getRepository').mockImplementation(() => {
      const original = jest.requireActual('typeorm');
      return {
        ...original,
        createQueryBuilder: jest.fn().mockImplementation(() => {
          return {
            select: jest.fn().mockReturnThis() as unknown,
            orderBy: jest.fn().mockReturnThis() as unknown,
            skip: jest.fn().mockReturnThis() as unknown,
            take: jest.fn().mockReturnThis() as unknown,
            getMany: jest.fn().mockResolvedValue(orders) as unknown,
          };
        }),
      };
    });

    const page = 1;
    const limit = 10;
    const result = await service.retrieveOrdersWithPageAndLimit(page, limit);
    expect(result).toEqual(orders);
    expect(queryRunner.release).toHaveBeenCalled();
  });
});
