import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let status: jest.Mock;
  let json: jest.Mock;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    json = jest.fn();
    status = jest.fn(() => ({ json }));
  });

  const run = (exception: unknown): Record<string, unknown> => {
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ method: 'POST', url: '/auth/login' }),
      }),
    } as unknown as ArgumentsHost;
    filter.catch(exception, host);
    return json.mock.calls[0][0] as Record<string, unknown>;
  };

  it('passes HttpException payloads through with path and timestamp', () => {
    const body = run(new BadRequestException(['email must be an email']));

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(body.statusCode).toBe(400);
    expect(body.message).toEqual(['email must be an email']);
    expect(body.path).toBe('/auth/login');
    expect(typeof body.timestamp).toBe('string');
  });

  it('keeps string-only HttpException messages', () => {
    const body = run(new HttpException('nope', HttpStatus.FORBIDDEN));

    expect(body.statusCode).toBe(403);
    expect(body.message).toBe('nope');
  });

  it('maps Prisma unique-constraint violations to 409 with an actionable message', () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the fields: (`email`)',
      { code: 'P2002', clientVersion: '5.22.0' },
    );

    const body = run(prismaError);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(body.statusCode).toBe(409);
    expect(body.message).toBe('A record with this value already exists.');
  });

  it('maps Prisma not-found errors to 404', () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      'An operation failed because it depends on a record that was not found',
      { code: 'P2025', clientVersion: '5.22.0' },
    );

    const body = run(prismaError);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(body.statusCode).toBe(404);
  });

  it('hides internal details for unknown errors', () => {
    const body = run(new Error('internal detail: connection string hunter2'));

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(body.statusCode).toBe(500);
    expect(body.message).toBe('An unexpected error occurred. Please try again.');
    expect(JSON.stringify(body)).not.toContain('hunter2');
  });
});
