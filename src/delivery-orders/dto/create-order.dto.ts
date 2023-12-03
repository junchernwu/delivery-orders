import { IsArray, IsString, ArrayMaxSize, ArrayMinSize } from 'class-validator';

export class CreateOrderDto {
  @IsArray({ message: 'Origin must be an array' })
  @ArrayMinSize(2, { message: 'Origin must have 2 coordinates' })
  @ArrayMaxSize(2, { message: 'Origin must have 2 coordinates' })
  @IsString({
    each: true,
    message: 'Origin coordinates must contain only strings',
  })
  origin: string[];

  @IsArray({ message: 'Destination must be an array' })
  @ArrayMinSize(2, { message: 'Destination must have 2 coordinates' })
  @ArrayMaxSize(2, { message: 'Destination must have 2 coordinates' })
  @IsString({
    each: true,
    message: 'Destination coordinates must contain only strings',
  })
  destination: string[];
}
