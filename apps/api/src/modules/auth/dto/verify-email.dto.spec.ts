import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { VerifyEmailDto } from './verify-email.dto';

const validate = (payload: unknown) =>
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }).transform(payload, { type: 'body', metatype: VerifyEmailDto });

describe('VerifyEmailDto', () => {
  it('accepts a forty-three-character opaque base64url token', async () => {
    await expect(validate({ token: 'a'.repeat(43) })).resolves.toMatchObject({
      token: 'a'.repeat(43),
    });
  });
  it.each([
    {},
    { token: '' },
    { token: 'a'.repeat(42) },
    { token: 'a'.repeat(44) },
    { token: '#'.repeat(43) },
    { token: null },
    { token: [] },
  ])('rejects missing or malformed tokens with resend guidance (%o)', async (payload) => {
    try {
      await validate(payload);
      throw new Error('accepted invalid token');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        message: expect.arrayContaining([expect.stringContaining('Request a new email')]),
      });
    }
  });
  it.each(['userId', 'emailVerifiedAt'])('rejects non-whitelisted %s', async (field) => {
    await expect(validate({ token: 'a'.repeat(43), [field]: 'owner' })).rejects.toThrow(
      BadRequestException
    );
  });
});
