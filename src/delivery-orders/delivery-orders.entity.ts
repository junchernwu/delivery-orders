import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum OrderStatus {
  TAKEN = 'taken',
  UNASSIGNED = 'unassigned',
}

@Entity()
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: number;

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
