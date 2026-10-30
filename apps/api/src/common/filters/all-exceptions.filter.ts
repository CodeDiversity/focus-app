import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { Request, Response } from 'express';
import { RESOURCE_NOT_FOUND } from '../ownership/ownership';

interface NormalizedError {
  statusCode: number;
  message: string | string[];
  error: string;
  errors?: Record<string, string[]>;
  conflicts?: unknown;
}

interface ErrorResponseBody extends NormalizedError {
  path: string;
  timestamp: string;
}

/**
 * Uniform error shape for every API response:
 * { statusCode, message, error, path, timestamp }
 *
 * Validation exceptions (400) additionally include an additive `errors`
 * field map: { <field>: string[] } — per-field actionable messages.
 * Unknown errors are logged server-side but never leak internals.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const normalized = this.normalize(exception);

    if (normalized.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception)
      );
    }

    const body: ErrorResponseBody = {
      ...normalized,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(normalized.statusCode).json(body);
  }

  private normalize(exception: unknown): NormalizedError {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === 'string') {
        return { statusCode, message: payload, error: exception.name };
      }

      const record = payload as Record<string, unknown>;
      const message = Array.isArray(record.message)
        ? (record.message as string[])
        : typeof record.message === 'string'
          ? record.message
          : exception.message;

      return {
        statusCode,
        message,
        error: typeof record.error === 'string' ? record.error : exception.name,
        // Preserve the additive `errors` field map when present.
        errors:
          record.errors && typeof record.errors === 'object'
            ? (record.errors as Record<string, string[]>)
            : undefined,
        conflicts: record.conflicts,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          return {
            statusCode: HttpStatus.CONFLICT,
            message: 'A record with this value already exists.',
            error: 'Conflict',
          };
        case 'P2025':
          return {
            statusCode: HttpStatus.NOT_FOUND,
            message: RESOURCE_NOT_FOUND,
            error: 'Not Found',
          };
        default:
          return {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'A database error occurred. Please try again.',
            error: 'Internal Server Error',
          };
      }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred. Please try again.',
      error: 'Internal Server Error',
    };
  }
}
