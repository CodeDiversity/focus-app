import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';

describe('JwtStrategy', () => {
  const makeDeps = (secret: string | undefined) => ({
    configService: { get: jest.fn().mockReturnValue(secret) } as unknown as ConfigService,
    prisma: {
      user: { findUnique: jest.fn() },
    } as unknown as PrismaService,
  });

  it('constructs when JWT_SECRET is configured', () => {
    const { configService, prisma } = makeDeps('test-secret');
    expect(new JwtStrategy(configService, prisma)).toBeDefined();
  });

  it('fails fast with an actionable message when JWT_SECRET is missing', () => {
    const { configService, prisma } = makeDeps(undefined);
    expect(() => new JwtStrategy(configService, prisma)).toThrow(
      /JWT_SECRET is not configured/,
    );
  });

  it('returns the user for a valid payload', async () => {
    const { configService, prisma } = makeDeps('test-secret');
    const user = { id: 'u1', email: 'student@example.com' };
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);

    const strategy = new JwtStrategy(configService, prisma);
    const result = await strategy.validate({ sub: 'u1', email: 'student@example.com' });

    expect(result).toEqual(user);
  });

  it('rejects when the user no longer exists', async () => {
    const { configService, prisma } = makeDeps('test-secret');
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const strategy = new JwtStrategy(configService, prisma);
    await expect(
      strategy.validate({ sub: 'deleted', email: 'student@example.com' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
