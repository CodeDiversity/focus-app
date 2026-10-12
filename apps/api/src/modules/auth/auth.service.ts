import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthenticatedUser } from '../../common/types';

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface RegisteredUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

// OWASP-recommended argon2id parameters
// (https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<AuthenticatedUser | null> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return null;
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, password);

    if (!isPasswordValid) {
      return null;
    }

    // Return user object without the password hash
    const { passwordHash: _passwordHash, ...result } = user;
    return result;
  }

  async register(registerDto: RegisterDto): Promise<RegisteredUser> {
    // Normalize so Ada@example.com and ada@example.com are the same account
    const email = registerDto.email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException(
        'An account with this email already exists. Please sign in or register with a different email.',
      );
    }

    // Hash password
    const passwordHash = await argon2.hash(
      registerDto.password,
      ARGON2_OPTIONS,
    );

    // Create user
    const user = await this.usersService.create({
      email,
      passwordHash,
      name: registerDto.name,
    });

    // Registration issues no token — the student signs in via SP-102's flow
    return { id: user.id, name: user.name, email: user.email };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }

  async refresh(user: { id: string; email: string }): Promise<{ accessToken: string }> {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return { accessToken: this.jwtService.sign(payload) };
  }

  async logout(userId: string): Promise<void> {
    // Invalidate all sessions for this user
    await this.prisma.session.deleteMany({
      where: { userId },
    });
  }

  async createSession(
    userId: string,
    request: {
      ip?: string;
      headers?: Record<string, string | undefined>;
      connection?: { remoteAddress?: string };
    },
  ): Promise<string> {
    const token = uuidv4();
    const ipAddress = request.ip || request.connection?.remoteAddress;
    const userAgent = request.headers?.['user-agent'];

    await this.prisma.session.create({
      data: {
        userId,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        ipAddress,
        userAgent,
      },
    });

    return token;
  }

  async validateSession(token: string): Promise<AuthenticatedUser | null> {
    const session = await this.prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    // Extend session
    await this.prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });

    const { passwordHash: _passwordHash, ...user } = session.user;
    return user;
  }
}
