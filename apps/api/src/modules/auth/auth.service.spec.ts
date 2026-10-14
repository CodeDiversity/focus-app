import { Test } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { EmailVerificationService } from './email-verification.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('argon2-hash'),
  verify: jest.fn(),
  argon2id: 2,
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    findByEmail: jest.Mock;
    create: jest.Mock;
    findById: jest.Mock;
  };
  let verification: { prepareToken: jest.Mock; sendVerification: jest.Mock };
  let jwtService: { sign: jest.Mock };
  let prismaService: {
    refreshToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    user: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };

  const userRecord = {
    id: 'user-1',
    email: 'student@example.com',
    passwordHash: 'argon2-hash',
    name: 'Ada Lovelace',
    emailVerifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createdUser = {
    id: 'user-1',
    email: 'student@example.com',
    name: 'Ada Lovelace',
    emailVerifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const registerDto = {
    name: 'Ada Lovelace',
    email: 'student@example.com',
    password: 'Password123',
  };

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
    };
    verification = {
      prepareToken: jest
        .fn()
        .mockReturnValue({
          rawToken: 'raw-verification',
          tokenHash: 'hashed-verification',
          expiresAt: new Date('2026-10-14T12:00:00Z'),
          requestedAt: new Date('2026-10-13T12:00:00Z'),
        }),
      sendVerification: jest.fn(),
    };
    jwtService = { sign: jest.fn().mockReturnValue('signed-token') };

    prismaService = {
      refreshToken: {
        create: jest.fn().mockImplementation(async (args: { data: { id?: string } }) => ({
          id: args.data.id ?? 'rt-new',
        })),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      user: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };
    prismaService.$transaction.mockImplementation(
      async (fn: (tx: typeof prismaService) => unknown) => fn(prismaService)
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: EmailVerificationService, useValue: verification },
        { provide: UsersService, useValue: usersService },
        { provide: PrismaService, useValue: prismaService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    it('rejects when the email is already registered', async () => {
      usersService.findByEmail.mockResolvedValue(userRecord);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('rejects with an actionable message on a duplicate email', async () => {
      usersService.findByEmail.mockResolvedValue(userRecord);

      await expect(service.register(registerDto)).rejects.toThrow(/already exists/i);
    });

    it('normalizes the email to lowercase before the duplicate check and insert', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(createdUser);

      await service.register({
        ...registerDto,
        email: '  Ada@Example.com  ',
      });

      expect(usersService.findByEmail).toHaveBeenCalledWith('ada@example.com');
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'ada@example.com' }),
        expect.objectContaining({ tokenHash: 'hashed-verification' })
      );
    });

    it('hashes the password with argon2id and stores only the hash', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(createdUser);

      await service.register(registerDto);

      expect(argon2.hash).toHaveBeenCalledWith('Password123', {
        type: argon2.argon2id,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      });
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ passwordHash: 'argon2-hash' }),
        expect.objectContaining({ tokenHash: 'hashed-verification' })
      );
      const createArg = usersService.create.mock.calls[0][0];
      expect(JSON.stringify(createArg)).not.toContain('Password123');
    });

    it('returns the created user without a token or password hash', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(createdUser);

      const result = await service.register(registerDto);

      expect(result).toEqual({
        id: 'user-1',
        name: 'Ada Lovelace',
        email: 'student@example.com',
      });
      expect(result).not.toHaveProperty('accessToken');
      expect(result).not.toHaveProperty('passwordHash');
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });

  describe('verification registration', () => {
    it('does not send an email when account/token persistence fails', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockRejectedValue(new Error('persistence failed'));
      await expect(service.register(registerDto)).rejects.toThrow('persistence failed');
      expect(verification.sendVerification).not.toHaveBeenCalled();
    });
    it('passes the initial hashed token and cooldown to atomic account creation before delivery', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(createdUser);
      await service.register(registerDto);
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: registerDto.email }),
        verification.prepareToken.mock.results[0].value
      );
      expect(verification.sendVerification).toHaveBeenCalledWith(
        registerDto.email,
        'raw-verification'
      );
    });
  });

  describe('validateUser', () => {
    it('returns null for an unknown email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      expect(await service.validateUser('unknown@example.com', 'pw')).toBeNull();
    });

    it('verifies credentials with argon2 and returns null for a wrong password', async () => {
      usersService.findByEmail.mockResolvedValue(userRecord);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      expect(await service.validateUser('student@example.com', 'wrong-password')).toBeNull();
      expect(argon2.verify).toHaveBeenCalledWith('argon2-hash', 'wrong-password');
    });

    it('returns the user without the password hash on success', async () => {
      usersService.findByEmail.mockResolvedValue(userRecord);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const user = await service.validateUser('student@example.com', 'Password123');

      expect(user).toMatchObject({ id: 'user-1', name: 'Ada Lovelace' });
      expect(user).not.toHaveProperty('passwordHash');
    });
  });

  describe('login', () => {
    it('rejects invalid credentials with a generic 401', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      await expect(
        service.login({ email: 'unknown@example.com', password: 'nope' })
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.login({ email: 'unknown@example.com', password: 'nope' })
      ).rejects.toThrow('Invalid email or password');
    });

    it('rejects a wrong password with the same generic message', async () => {
      usersService.findByEmail.mockResolvedValue(userRecord);
      (argon2.verify as jest.Mock).mockResolvedValue(false);
      await expect(
        service.login({ email: 'student@example.com', password: 'wrong' })
      ).rejects.toThrow('Invalid email or password');
    });

    it('issues a 15-minute access token and creates a new refresh family', async () => {
      usersService.findByEmail.mockResolvedValue(userRecord);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: '  Student@Example.COM ',
        password: 'Password123',
      });

      expect(usersService.findByEmail).toHaveBeenCalledWith('student@example.com');
      expect(result.accessToken).toBe('signed-token');
      expect(result.user).toEqual({
        id: 'user-1',
        name: 'Ada Lovelace',
        email: 'student@example.com',
        emailVerifiedAt: null,
      });
      expect(result).not.toHaveProperty('passwordHash');
      expect(prismaService.refreshToken.create).toHaveBeenCalledTimes(1);
      const createArg = prismaService.refreshToken.create.mock.calls[0][0];
      expect(createArg.data.userId).toBe('user-1');
      expect(createArg.data.familyId).toBeTruthy();
      expect(createArg.data.tokenHash).toBeTruthy();
      expect(createArg.data.tokenHash).not.toBe(result.refreshToken);
      expect(JSON.stringify(createArg)).not.toContain(result.refreshToken);
      expect(createArg.data.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('refresh', () => {
    const activeRecord = () => ({
      id: 'rt-1',
      userId: 'user-1',
      familyId: 'family-1',
      tokenHash: 'stored-hash',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      replacedByTokenId: null,
      createdAt: new Date(),
      user: {
        id: 'user-1',
        name: 'Ada Lovelace',
        email: 'student@example.com',
        emailVerifiedAt: null,
      },
    });

    it('rotates the token and invalidates the old one', async () => {
      prismaService.refreshToken.findUnique.mockResolvedValue(activeRecord());

      const result = await service.refresh('raw-old-token');

      expect(result.accessToken).toBe('signed-token');
      expect(result.user).toEqual({
        id: 'user-1',
        name: 'Ada Lovelace',
        email: 'student@example.com',
        emailVerifiedAt: null,
      });
      expect(result.refreshToken).toBeTruthy();
      expect(result.refreshToken).not.toBe('raw-old-token');
      expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
      const createArg = prismaService.refreshToken.create.mock.calls[0][0];
      expect(createArg.data.familyId).toBe('family-1');
      expect(createArg.data.tokenHash).not.toBe(result.refreshToken);
      // The old row is claimed atomically and points at the successor.
      expect(prismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { id: 'rt-1', revokedAt: null, replacedByTokenId: null },
        data: {
          replacedByTokenId: createArg.data.id,
          revokedAt: expect.any(Date),
        },
      });
      expect(createArg.data.id).toBeTruthy();
    });

    it('lets only one of two concurrent refreshes of the same token succeed', async () => {
      // Stateful in-memory rows so both calls race over the same record.
      const rows = [activeRecord()];
      prismaService.refreshToken.findUnique.mockImplementation(
        async ({ where }: { where: { tokenHash: string } }) => {
          await new Promise((r) => setTimeout(r, 5));
          const row = rows.find((r) => r.tokenHash === where.tokenHash || r.id === 'rt-1');
          return row ? { ...row } : null;
        }
      );
      prismaService.refreshToken.updateMany.mockImplementation(
        async (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
          let count = 0;
          for (const row of rows) {
            const matches = Object.entries(args.where).every(([k, v]) => {
              if (k === 'familyId') return row.familyId === v;
              if (k === 'id') return row.id === v;
              if (k === 'revokedAt') return row.revokedAt === v;
              if (k === 'replacedByTokenId') return row.replacedByTokenId === v;
              return true;
            });
            if (matches) {
              Object.assign(row, args.data);
              count += 1;
            }
          }
          return { count };
        }
      );
      prismaService.refreshToken.create.mockImplementation(
        async (args: { data: Record<string, unknown> }) => {
          const row = {
            id: args.data.id as string,
            userId: args.data.userId as string,
            familyId: args.data.familyId as string,
            tokenHash: args.data.tokenHash as string,
            expiresAt: args.data.expiresAt as Date,
            revokedAt: null,
            replacedByTokenId: null,
            createdAt: new Date(),
            user: { id: 'user-1', name: 'Ada Lovelace', email: 'student@example.com' },
          };
          rows.push(row as never);
          return row;
        }
      );
      // The presented token's hash must match the stored row.
      const { createHash } = await import('crypto');
      rows[0].tokenHash = createHash('sha256').update('raw-old-token').digest('hex');

      const results = await Promise.allSettled([
        service.refresh('raw-old-token'),
        service.refresh('raw-old-token'),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(UnauthorizedException);
    });

    it('rejects reuse of a rotated token and revokes the whole family', async () => {
      prismaService.refreshToken.findUnique.mockResolvedValue({
        ...activeRecord(),
        revokedAt: new Date(),
        replacedByTokenId: 'rt-2',
      });

      await expect(service.refresh('raw-old-token')).rejects.toThrow(UnauthorizedException);
      expect(prismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { familyId: 'family-1' },
        data: { revokedAt: expect.any(Date) },
      });
      expect(prismaService.refreshToken.create).not.toHaveBeenCalled();
    });

    it('rejects an expired refresh token', async () => {
      prismaService.refreshToken.findUnique.mockResolvedValue({
        ...activeRecord(),
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.refresh('raw-old-token')).rejects.toThrow(UnauthorizedException);
      expect(prismaService.refreshToken.create).not.toHaveBeenCalled();
    });

    it('rejects an unknown refresh token', async () => {
      prismaService.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refresh('nope')).rejects.toThrow(UnauthorizedException);
      await expect(service.refresh(undefined)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('revokes only the current family and no other family of the same user', async () => {
      const { createHash } = await import('crypto');
      const hashOf = (raw: string) => createHash('sha256').update(raw).digest('hex');
      const rows = [
        {
          id: 'rt-1',
          userId: 'user-1',
          familyId: 'family-1',
          tokenHash: hashOf('raw-token'),
          expiresAt: new Date(Date.now() + 60_000),
          revokedAt: null as Date | null,
          replacedByTokenId: null,
          createdAt: new Date(),
        },
        {
          id: 'rt-9',
          userId: 'user-1',
          familyId: 'family-2',
          tokenHash: hashOf('other-device-token'),
          expiresAt: new Date(Date.now() + 60_000),
          revokedAt: null as Date | null,
          replacedByTokenId: null,
          createdAt: new Date(),
        },
      ];
      prismaService.refreshToken.findUnique.mockImplementation(
        async ({ where }: { where: { tokenHash: string } }) =>
          rows.find((r) => r.tokenHash === where.tokenHash) ?? null
      );
      prismaService.refreshToken.updateMany.mockImplementation(
        async (args: { where: { familyId: string }; data: { revokedAt: Date } }) => {
          let count = 0;
          for (const row of rows) {
            if (row.familyId === args.where.familyId) {
              row.revokedAt = args.data.revokedAt;
              count += 1;
            }
          }
          return { count };
        }
      );

      await service.logout('raw-token');

      expect(rows[0].revokedAt).toBeInstanceOf(Date);
      expect(rows[1].revokedAt).toBeNull();
    });

    it('succeeds idempotently with a missing or unknown token', async () => {
      prismaService.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.logout(undefined)).resolves.toBeUndefined();
      await expect(service.logout('unknown')).resolves.toBeUndefined();
      expect(prismaService.refreshToken.updateMany).not.toHaveBeenCalled();
    });
  });
});
