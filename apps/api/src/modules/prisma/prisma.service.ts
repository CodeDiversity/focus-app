import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      // Prisma 7 connects through a driver adapter; the connection string
      // stays in the environment and is never hard-coded. An empty string
      // only defers failure to onModuleInit, which reports it properly.
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL ?? '',
      }),
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        'DATABASE_URL is not configured. Set it in apps/api/.env.local (see apps/api/.env.example) or as an environment variable.'
      );
    }
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
