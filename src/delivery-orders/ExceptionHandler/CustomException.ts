import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class CustomExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const errorResponse = exception.getResponse() as { message: string[] };
    // Customize the error response
    let errorMessages: string;
    if (errorResponse.message) {
      console.log(errorResponse.message);
      if (Array.isArray(errorResponse.message)) {
        errorMessages = errorResponse.message.join(', ');
      }
    }

    const customErrorResponse = {
      error: errorMessages ?? errorResponse,
    };
    response.status(status).json(customErrorResponse);
  }
}
