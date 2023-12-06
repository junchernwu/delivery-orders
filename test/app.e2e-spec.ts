import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryOrdersModule } from '../src/delivery-orders/delivery-orders.module';
import { CreateOrderDto } from '../src/delivery-orders/dto/create-order.dto';
import { Connection, createConnection, QueryRunner } from 'typeorm';
import { DataSourceOptions } from 'typeorm/data-source/DataSourceOptions';
import { TypeOrmModuleOptions } from '@nestjs/typeorm/dist/interfaces/typeorm-options.interface';
import { DeliveryOrder } from '../src/delivery-orders/delivery-orders.entity';
import {
  convertDeliveryOrderToRightFormat,
  DeliveryOrderResponseFormat,
  DeliveryOrdersService,
} from '../src/delivery-orders/delivery-orders.service';
import { DistanceService } from '../src/delivery-orders/Services/distanceService';
import { DbService } from '../src/delivery-orders/Services/dbService';
import * as dotenv from 'dotenv';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let queryRunner: QueryRunner;
  let connection: Connection;
  dotenv.config();

  const connectionOptions = {
    type: 'mysql',
    host: 'localhost',
    port: process.env.DB_TEST_PORT,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [DeliveryOrder],
    synchronize: true,
  };
  const createOrderDto: CreateOrderDto = {
    origin: ['1.34306', '103.71903'],
    destination: ['1.2830', '103.8513'],
  };
  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        DeliveryOrdersModule,
        TypeOrmModule.forRoot(connectionOptions as TypeOrmModuleOptions),
        TypeOrmModule.forFeature([DeliveryOrder]),
      ],
      providers: [DeliveryOrdersService, DistanceService, DbService],
    }).compile();
    if (!connection) {
      connection = await createConnection(
        connectionOptions as DataSourceOptions,
      );
    }

    queryRunner = connection.createQueryRunner();

    app = moduleFixture.createNestApplication();

    await app.init();
  });

  afterEach(async () => {
    // Roll back the database transaction after each test
    if (queryRunner) {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.clearDatabase(process.env.DB_NAME);
      await queryRunner.commitTransaction();
      await queryRunner.release();
    }
  });

  it('/ (POST and expect response to have field distance that is an integer)', async () => {
    const response = await request(app.getHttpServer())
      .post('/orders')
      .send(createOrderDto);
    expect(response.statusCode).toBe(201);
    expect(Number.isInteger(response.body.distance)).toBeTruthy();
  });

  it('/ (POST and expect unique ids)', async () => {
    const response1 = await request(app.getHttpServer())
      .post('/orders')
      .send(createOrderDto);
    const response2 = await request(app.getHttpServer())
      .post('/orders')
      .send(createOrderDto);
    expect(response1.body.id).not.toEqual(response2.body.id);
  });

  it('/ (POST with excess field in body returns error)', async () => {
    const createOrderDtoWithExcessFields = {
      origin: ['1.34306', '103.71903'],
      destination: ['1.2830', '103.8513'],
      test: '123',
    };
    const result = await request(app.getHttpServer())
      .post('/orders')
      .send(createOrderDtoWithExcessFields);

    expect(result.statusCode).toEqual(406);
    expect(result.body.message).toEqual('Request body has excess fields');
  });

  it('/ (POST returns error when array more than two strings)', async () => {
    // Case 1: Origin and destination more than 2 string
    const createOrderDtoDestOriginMoreThan2String = {
      origin: ['1.34306', '103.71903', '123'],
      destination: ['1.2830', '103.8513', '123'],
    };
    let result = await request(app.getHttpServer())
      .post('/orders')
      .send(createOrderDtoDestOriginMoreThan2String);
    expect(result.statusCode).toEqual(400);
    expect(result.body.message).toEqual([
      'Origin must have 2 coordinates',
      'Destination must have 2 coordinates',
    ]);

    // Case 2: Origin and destination less than 2 string
    const createOrderDtoDestOriginLessThan2String = {
      origin: ['1.34306'],
      destination: ['1.2830'],
    };
    result = await request(app.getHttpServer())
      .post('/orders')
      .send(createOrderDtoDestOriginLessThan2String);
    expect(result.statusCode).toEqual(400);
    expect(result.body.message).toEqual([
      'Origin must have 2 coordinates',
      'Destination must have 2 coordinates',
    ]);

    // Case 3: Origin and destination can only contain strings
    const createOrderDtoDestOriginNotString = {
      origin: [1.34306, 2],
      destination: [1.283, 2],
    };
    result = await request(app.getHttpServer())
      .post('/orders')
      .send(createOrderDtoDestOriginNotString);
    expect(result.statusCode).toEqual(400);
    expect(result.body.message).toEqual([
      'Origin coordinates must contain only strings',
      'Destination coordinates must contain only strings',
    ]);
  });

  it('/ (PATCH when order is unassigned)', async () => {
    await request(app.getHttpServer())
      .post('/orders')
      .send(createOrderDto)
      .expect(201);
    await queryRunner.connect();
    const orders = await queryRunner.manager
      .getRepository(DeliveryOrder)
      .createQueryBuilder('order')
      .getMany();

    expect(orders).toHaveLength(1);
    const orderId = orders[0].orderId;
    return request(app.getHttpServer())
      .patch(`/orders/${orderId}`)
      .send({ status: 'TAKEN' })
      .expect(200);
  });

  it('/ (PATCH when order id is not in database)', async () => {
    // Setup, add Order to table and update status to TAKEN
    await queryRunner.connect();
    const result = await request(app.getHttpServer())
      .patch(`/orders/123456`)
      .send({ status: 'TAKEN' });
    expect(result.statusCode).toEqual(406);
    expect(result.body.message).toEqual(
      'Delivery order Id 123456 does not exist',
    );
  });

  it('/ (PATCH when order is TAKEN)', async () => {
    // Setup, add Order to table and update status to TAKEN
    await request(app.getHttpServer())
      .post('/orders')
      .send(createOrderDto)
      .expect(201);
    await queryRunner.connect();
    const orders = await queryRunner.manager
      .getRepository(DeliveryOrder)
      .createQueryBuilder('order')
      .getMany();

    expect(orders).toHaveLength(1);
    const orderId = orders[0].orderId;
    await request(app.getHttpServer())
      .patch(`/orders/${orderId}`)
      .send({ status: 'TAKEN' })
      .expect(200);
    // Expect that request fails
    const result = await request(app.getHttpServer())
      .patch(`/orders/${orderId}`)
      .send({ status: 'TAKEN' });
    expect(result.statusCode).toEqual(406);
    expect(result.body.message).toEqual(
      `Delivery has been taken for order ${orderId}`,
    );
  });

  it('/ (PATCH when request body status is not TAKEN)', async () => {
    await request(app.getHttpServer())
      .post('/orders')
      .send(createOrderDto)
      .expect(201);
    await queryRunner.connect();
    const orders = await queryRunner.manager
      .getRepository(DeliveryOrder)
      .createQueryBuilder('order')
      .getMany();

    expect(orders).toHaveLength(1);
    const orderId = orders[0].orderId;
    const result = await request(app.getHttpServer())
      .patch(`/orders/${orderId}`)
      .send({ status: 'TEST' });
    expect(result.status).toEqual(406);
    expect(result.body.message).toEqual(
      'Request body is either missing status field/ status field is not set as TAKEN/ excess fields',
    );
  });

  it('/ (PATCH when request body has excess fields)', async () => {
    await request(app.getHttpServer())
      .post('/orders')
      .send(createOrderDto)
      .expect(201);
    await queryRunner.connect();
    const orders = await queryRunner.manager
      .getRepository(DeliveryOrder)
      .createQueryBuilder('order')
      .getMany();

    expect(orders).toHaveLength(1);
    const orderId = orders[0].orderId;
    const result = await request(app.getHttpServer())
      .patch(`/orders/${orderId}`)
      .send({ status: 'TAKE', test: 'Test' });
    expect(result.status).toEqual(406);
    expect(result.body.message).toEqual(
      'Request body is either missing status field/ status field is not set as TAKEN/ excess fields',
    );
  });

  it('/ (PATCH when concurrent patch requests are made)', async () => {
    // Setup, add Order to table and update status to TAKEN
    await request(app.getHttpServer())
      .post('/orders')
      .send(createOrderDto)
      .expect(201);
    await queryRunner.connect();
    const orders = await queryRunner.manager
      .getRepository(DeliveryOrder)
      .createQueryBuilder('order')
      .getMany();

    expect(orders).toHaveLength(1);
    const orderId = orders[0].orderId;
    // Make concurrent requests using dbService
    const numConcurrentRequests = 10;
    const requests = Array.from({ length: numConcurrentRequests }, () =>
      request(app.getHttpServer())
        .patch(`/orders/${orderId}`)
        .send({ status: 'TAKEN' }),
    );

    const responses = await Promise.all(requests);
    const statusCodes = responses.map((res) => res.status);

    const num200 = statusCodes.filter((code) => code === 200).length;
    const num406 = statusCodes.filter((code) => code === 406).length;

    expect(num200).toBe(1);
    expect(num406).toBe(numConcurrentRequests - 1);
  });

  it('/ (GET by page and limit return records when records in db exists)', async () => {
    // Setup, add Orders to table with timeout
    const numOrdersToCreate = 5;
    async function createOrdersWithDelay(
      numOrdersToCreate,
      createOrderDto,
      delay,
    ) {
      for (let i = 0; i < numOrdersToCreate; i++) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        await request(app.getHttpServer()).post('/orders').send(createOrderDto);
      }
    }
    await createOrdersWithDelay(numOrdersToCreate, createOrderDto, 1000);

    // Test get records by page and limit
    await queryRunner.connect();
    const ordersInDb = await queryRunner.manager
      .getRepository(DeliveryOrder)
      .createQueryBuilder('order')
      .orderBy('order.dateTimeField', 'ASC')
      .getMany();
    const expectedPageResult = ordersInDb.slice(2, 4);
    const expectedPageResultFormatted: DeliveryOrderResponseFormat[] =
      expectedPageResult.map((order) =>
        convertDeliveryOrderToRightFormat(order),
      );
    const pageNum = 2;
    const limit = 2;
    const retrievedPageResult = await request(app.getHttpServer())
      .get('/orders')
      .query({ page: pageNum, limit: limit });

    // Compare the results and ensure fields are matching
    expect(expectedPageResult.length).toEqual(retrievedPageResult.body.length);
    for (let i = 0; i < expectedPageResult.length; i++) {
      const expectedOrder = expectedPageResultFormatted[
        i
      ] as DeliveryOrderResponseFormat;
      const retrievedOrder = retrievedPageResult.body[
        i
      ] as DeliveryOrderResponseFormat;
      expect(expectedOrder.id).toEqual(retrievedOrder.id);
      expect(expectedOrder.status).toEqual(retrievedOrder.status);
    }
  }, 10000);

  it('/ (GET by page and limit return empty array when records in db do not exist)', async () => {
    // No records in DB
    const expectedPageResult = 0;
    // Test get records by page and limit
    await queryRunner.connect();
    const pageNum = 2;
    const limit = 2;
    const retrievedPageResult = await request(app.getHttpServer())
      .get('/orders')
      .query({ page: pageNum, limit: limit });

    // Compare the results
    expect(retrievedPageResult.body.length).toEqual(expectedPageResult);
  }, 10000);

  it('/ (GET by page and limit returns error when page < 1)', async () => {
    // No records in DB
    // Test get records by page and limit
    await queryRunner.connect();
    const pageNum = 0;
    const limit = 2;
    const retrievedPageResult = await request(app.getHttpServer())
      .get('/orders')
      .query({ page: pageNum, limit: limit });

    // Compare the results
    expect(retrievedPageResult.statusCode).toEqual(416);
    expect(retrievedPageResult.body.message).toEqual(
      'Page number must start with 1',
    );
  });

  it('/ (GET by page and limit returns error when page or limit is invalid integer)', async () => {
    // No records in DB
    // Test get records by page and limit
    await queryRunner.connect();
    // Test the different error message
    // Case 1: Invalid page integer
    const invalidPageInteger = 1.2;
    const limit = 2;
    const retrievedPageResultWhenPageNumInvalid = await request(
      app.getHttpServer(),
    )
      .get('/orders')
      .query({ page: invalidPageInteger, limit: limit });
    expect(retrievedPageResultWhenPageNumInvalid.statusCode).toEqual(416);
    expect(retrievedPageResultWhenPageNumInvalid.body.message).toEqual(
      'Invalid integer input: Page',
    );

    // Case 2: Invalid limit integer
    const validPageNumber = 1;
    const invalidLimit = 1.2;
    const retrievedPageResultWhenLimitNumInvalid = await request(
      app.getHttpServer(),
    )
      .get('/orders')
      .query({ page: validPageNumber, limit: invalidLimit });
    expect(retrievedPageResultWhenLimitNumInvalid.statusCode).toEqual(416);
    expect(retrievedPageResultWhenLimitNumInvalid.body.message).toEqual(
      'Invalid integer input: Limit',
    );

    // Case 3: Invalid limit and page integer
    const retrievedPageResultWhenLimitAndPageNumInvalid = await request(
      app.getHttpServer(),
    )
      .get('/orders')
      .query({ page: invalidPageInteger, limit: invalidLimit });
    expect(retrievedPageResultWhenLimitAndPageNumInvalid.statusCode).toEqual(
      416,
    );
    expect(retrievedPageResultWhenLimitAndPageNumInvalid.body.message).toEqual(
      'Invalid integer input: Page and limit',
    );
  });

  it('/ (GET by page and limit returns error when limit is less than 1)', async () => {
    // No records in DB
    // Test get records by page and limit
    await queryRunner.connect();
    const invalidPageInteger = 1;
    const limit = 0;
    const retrievedPageResult = await request(app.getHttpServer())
      .get('/orders')
      .query({ page: invalidPageInteger, limit: limit });

    // Compare the results
    expect(retrievedPageResult.statusCode).toEqual(416);
    expect(retrievedPageResult.body.message).toEqual('Limit must start with 1');
  });
});
