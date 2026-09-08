import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

interface ErrorResponse {
  success: boolean;
  statusCode: number;
  message: string;
  error: string;
  path: string;
  method: string;
  timestamp: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'INTERNAL_SERVER_ERROR';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        exceptionResponse &&
        typeof exceptionResponse === 'object' &&
        'message' in exceptionResponse
      ) {
        const raw = (exceptionResponse as any).message;
        if (Array.isArray(raw)) {
          // Validation errors from class-validator
          message = raw.join(', ');
          error = 'VALIDATION_ERROR';
        } else {
          message = String(raw);
        }
        error =
          (exceptionResponse as any).error ??
          (message === 'Forbidden resource' || statusCode === 403 ? 'FORBIDDEN' : 'HTTP_ERROR');
      }

      // Map a few known codes to stable error tokens.
      if (statusCode === 401) error = 'UNAUTHORIZED';
      if (statusCode === 403 && !isNaN(Number(error))) error = 'FORBIDDEN';
      if (statusCode === 404) error = 'NOT_FOUND';
      if (statusCode === 429) error = 'TOO_MANY_REQUESTS';
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Never expose Prisma internals to clients.
      statusCode = HttpStatus.BAD_REQUEST;
      message = 'Database request failed';
      error = 'DATABASE_ERROR';
      this.logger.warn(`Prisma error: ${exception.message}`);
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      statusCode = HttpStatus.BAD_REQUEST;
      message = 'Invalid data provided';
      error = 'VALIDATION_ERROR';
      this.logger.warn(`Prisma validation error: ${exception.message}`);
    } else if (exception instanceof Error) {
      // Do not echo internal error messages to clients - they may contain
      // paths, SQL, or secrets. Log the detail server-side only.
      message = 'Internal server error';
      error = 'INTERNAL_SERVER_ERROR';
      if (process.env.ENVIRONMENT !== 'production') {
        message = exception.message;
      }
      this.logger.error(`Unhandled exception on ${request.method} ${request.url}`, exception.stack);
    }

    const body: ErrorResponse = {
      success: false,
      statusCode,
      message,
      error,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    };

    // Never leak stack traces or internal details.
    response.status(statusCode).json(body);
  }
}
