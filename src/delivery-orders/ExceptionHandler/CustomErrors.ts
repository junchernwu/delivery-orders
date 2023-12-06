import { HttpException, HttpStatus } from '@nestjs/common';

export class DeliveryHasBeenTaken extends HttpException {
  constructor(message: string) {
    super(
      `Delivery has been taken for order ${message}`,
      HttpStatus.NOT_ACCEPTABLE,
    );
  }
}

export class DeliveryIdDoesNotExist extends HttpException {
  constructor(message: string) {
    super(
      `Delivery order Id ${message} does not exist`,
      HttpStatus.NOT_ACCEPTABLE,
    );
  }
}

export class FailureRetrievingOrdersFromDbWithPageAndLimit extends HttpException {
  constructor() {
    super(
      `Failed to retrieve orders with page and limit`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export class FailureSavingOrderToDB extends HttpException {
  constructor(id: string) {
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

export class InvalidPatchRequestBody extends HttpException {
  constructor() {
    super(
      'Request body is either missing status field/ status field is not set as TAKEN/ excess fields',
      HttpStatus.NOT_ACCEPTABLE,
    );
  }
}

export class InvalidPostRequestBody extends HttpException {
  constructor() {
    super('Request body has excess fields', HttpStatus.NOT_ACCEPTABLE);
  }
}

export class FailureGettingDistance extends HttpException {
  constructor() {
    super('Failed to retrieve distance', HttpStatus.SERVICE_UNAVAILABLE);
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
