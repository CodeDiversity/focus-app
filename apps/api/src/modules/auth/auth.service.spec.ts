import { Test } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('argon2-hash'),
  verify: jest.fn(),
  argon2id: 2,
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: { findByEmail: jest.Mock; create: jest.Mock };
  let jwtService: { sign: jest.Mock };

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
    usersService = { findByEmail: jest.fn(), create: jest.fn() };
    jwtService = { sign: jest.fn().mockReturnValue('signed-token') };

    const prismaService = {
      session: {
        deleteMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
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

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('rejects with an actionable message on a duplicate email', async () => {
      usersService.findByEmail.mockResolvedValue(userRecord);

      await expect(service.register(registerDto)).rejects.toThrow(
        /already exists/i,
      );
    });

    it('normalizes the email to lowercase before the duplicate check and insert', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(createdUser);

      await service.register({
        ...registerDto,
        email: '  Ada@Example.com  ',
      });

      expect(usersService.findByEmail).toHaveBeenCalledWith(
        'ada@example.com',
      );
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'ada@example.com' }),
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

  describe('validateUser', () => {
    it('returns null for an unknown email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      expect(await service.validateUser('unknown@example.com', 'pw')).toBeNull();
    });

    it('verifies credentials with argon2 and returns null for a wrong password', async () => {
      usersService.findByEmail.mockResolvedValue(userRecord);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      expect(
        await service.validateUser('student@example.com', 'wrong-password'),
      ).toBeNull();
      expect(argon2.verify).toHaveBeenCalledWith(
        'argon2-hash',
        'wrong-password',
      );
    });

    it('returns the user without the password hash on success', async () => {
      usersService.findByEmail.mockResolvedValue(userRecord);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const user = await service.validateUser(
        'student@example.com',
        'Password123',
      );

      expect(user).toMatchObject({ id: 'user-1', name: 'Ada Lovelace' });
      expect(user).not.toHaveProperty('passwordHash');
    });
  });

  describe('login', () => {
    it('rejects with UnauthorizedException for invalid credentials', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'unknown@example.com', password: 'nope' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns a token and the user on success', async () => {
      usersService.findByEmail.mockResolvedValue(userRecord);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'student@example.com',
        password: 'Password123',
      });

      expect(result.accessToken).toBe('signed-token');
      expect(result.user).toEqual({
        id: 'user-1',
        name: 'Ada Lovelace',
        email: 'student@example.com',
      });
    });
  });

  describe('refresh', () => {
    it('issues a new access token for the authenticated user', async () => {
      const result = await service.refresh({
        id: 'user-1',
        email: 'student@example.com',
      });

      expect(result.accessToken).toBe('signed-token');
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-1',
        email: 'student@example.com',
      });
    });
  });
});
