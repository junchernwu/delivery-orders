import { Module } from '@nestjs/common';
import { DeliveryOrdersService } from './delivery-orders.service';
import { DeliveryOrdersController } from './delivery-orders.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryOrder } from './delivery-orders.entity';
import { DistanceService } from './Services/distanceService';
import { DbService } from './Services/dbService';

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryOrder])],
  providers: [DeliveryOrdersService, DistanceService, DbService],
  controllers: [DeliveryOrdersController],
  exports: [DeliveryOrdersService],
})
export class DeliveryOrdersModule {}
