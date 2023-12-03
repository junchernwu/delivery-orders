import { HttpException, HttpStatus } from '@nestjs/common';

export class DeliveryHasBeenTaken extends HttpException {
  constructor(message: string) {
    super(
      `Delivery has been taken for order ${message}`,
      HttpStatus.NOT_ACCEPTABLE,
    );
  }
}

export class FailureSavingOrderToDB extends HttpException {
  constructor(id: number) {
    super(
      `Failed to save order with id ${id}`,
      HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
    );
  }
}

export class InvalidPage extends HttpException {
  constructor() {
    super(
      'Page number must start with 1',
      HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
    );
  }
}

export class InvalidLimit extends HttpException {
  constructor() {
    super(
      'Limit must start with 1',
      HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
    );
  }
}

export class InvalidRequestBody extends HttpException {
  constructor() {
    super('Request body is of wrong status', HttpStatus.NOT_ACCEPTABLE);
  }
}

export class InvalidIntegerForPageOrLimit extends HttpException {
  constructor(isPageInvalid: boolean, isLimitInvalid: boolean) {
    let message = '';
    if (isPageInvalid) {
      message += 'Page';
    }
    if (isLimitInvalid) {
      message += message.length ? ' and limit' : 'Limit';
    }
    super(
      `Invalid integer input: ${message}`,
      HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
    );
  }
}
