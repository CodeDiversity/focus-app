import { Test } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('bcrypt', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: { findByEmail: jest.Mock; create: jest.Mock };
  let jwtService: { sign: jest.Mock };

  const userRecord = {
    id: 'user-1',
    email: 'student@example.com',
    passwordHash: 'hashed-password',
    firstName: 'Ada',
    lastName: 'Lovelace',
    isVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createdUser = {
    id: 'user-1',
    email: 'student@example.com',
    firstName: 'Ada',
    lastName: 'Lovelace',
    isVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
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

      await expect(
        service.register({ email: 'student@example.com', password: 'Password123' }),
      ).rejects.toThrow(ConflictException);
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('creates the user with a hashed password and returns a token', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(createdUser);

      const result = await service.register({
        email: 'student@example.com',
        password: 'Password123',
        firstName: 'Ada',
        lastName: 'Lovelace',
      });

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ passwordHash: 'hashed-password' }),
      );
      expect(result.accessToken).toBe('signed-token');
      expect(result.user.email).toBe('student@example.com');
    });
  });

  describe('validateUser', () => {
    it('returns null for an unknown email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      expect(await service.validateUser('unknown@example.com', 'pw')).toBeNull();
    });

    it('returns null for a wrong password', async () => {
      usersService.findByEmail.mockResolvedValue(userRecord);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      expect(
        await service.validateUser('student@example.com', 'wrong-password'),
      ).toBeNull();
    });

    it('returns the user without the password hash on success', async () => {
      usersService.findByEmail.mockResolvedValue(userRecord);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const user = await service.validateUser('student@example.com', 'Password123');

      expect(user).toMatchObject({ id: 'user-1' });
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
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'student@example.com',
        password: 'Password123',
      });

      expect(result.accessToken).toBe('signed-token');
      expect(result.user.id).toBe('user-1');
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
