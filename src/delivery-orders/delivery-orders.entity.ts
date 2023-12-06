import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum OrderStatus {
  TAKEN = 'TAKEN',
  UNASSIGNED = 'UNASSIGNED',
}

@Entity({ name: 'DeliveryOrders' })
export class DeliveryOrder {
  @PrimaryGeneratedColumn('uuid')
  orderId: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.UNASSIGNED,
  })
  status: OrderStatus;

  @Column()
  distance: number;

  @Index()
  @Column({ type: 'datetime' })
  dateTimeField: Date;
}
