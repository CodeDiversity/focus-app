import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AuthService } from './modules/auth/auth.service';
import { UsersService } from './modules/users/users.service';

// Regression test for the boot failure where UsersModule did not export
// UsersService: compiling the real module graph resolves every dependency
// without a server or a database connection.
describe('AppModule wiring', () => {
  it('resolves every provider in the dependency graph', async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'wiring-test-secret';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(moduleRef.get(AuthService)).toBeDefined();
    expect(moduleRef.get(UsersService)).toBeDefined();
  });

  // Regression test for the boot failure where class-transformer was not
  // installed: the global ValidationPipe only loads it at instantiation.
  it('can instantiate the global validation pipe', () => {
    expect(
      () =>
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
    ).not.toThrow();
  });
});
