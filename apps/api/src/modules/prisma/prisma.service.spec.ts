import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('fails fast with an actionable message when DATABASE_URL is missing', async () => {
    const previous = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    const service = new PrismaService();

    await expect(service.onModuleInit()).rejects.toThrow(
      /DATABASE_URL is not configured/,
    );

    if (previous !== undefined) {
      process.env.DATABASE_URL = previous;
    }
  });
});
