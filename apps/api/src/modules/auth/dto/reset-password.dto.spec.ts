import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ResetPasswordDto } from './reset-password.dto';
import { INVALID_RESET_MESSAGE } from '../password-reset.service';

const validate = (payload: unknown) =>
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }).transform(payload, { type: 'body', metatype: ResetPasswordDto });

const rawToken = 'a'.repeat(43);
const goodPassword = 'Password123';

describe('ResetPasswordDto', () => {
  it('accepts a 43-character base64url token with a matching confirmation', async () => {
    const dto = await validate({
      token: `  ${rawToken}  `,
      password: goodPassword,
      confirmPassword: goodPassword,
    });
    expect(dto).toMatchObject({ token: rawToken, password: goodPassword, confirmPassword: goodPassword });
  });

  it('accepts a minimum-length (8 character) password', async () => {
    const dto = await validate({ token: rawToken, password: '12345678', confirmPassword: '12345678' });
    expect(dto).toMatchObject({ password: '12345678' });
  });

  it.each([
    ['missing token', { password: goodPassword, confirmPassword: goodPassword }],
    ['empty token', { token: '', password: goodPassword, confirmPassword: goodPassword }],
    ['blank token', { token: '   ', password: goodPassword, confirmPassword: goodPassword }],
    ['42-character token', { token: 'a'.repeat(42), password: goodPassword, confirmPassword: goodPassword }],
    ['44-character token', { token: 'a'.repeat(44), password: goodPassword, confirmPassword: goodPassword }],
    [
      'standard-base64 alphabet token',
      { token: 'a'.repeat(21) + '+' + 'a'.repeat(21), password: goodPassword, confirmPassword: goodPassword },
    ],
    ['null token', { token: null, password: goodPassword, confirmPassword: goodPassword }],
    ['non-string token', { token: 123456789012345, password: goodPassword, confirmPassword: goodPassword }],
  ])('rejects a %s and carries INVALID_RESET_MESSAGE — never a distinct wording', async (_label, payload) => {
    try {
      await validate(payload);
      throw new Error('accepted an invalid token');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as { message: unknown };
      expect(Array.isArray(response.message)).toBe(true);
      // Uniformity (SP-105 AC5): every token failure state carries only the
      // approved INVALID_RESET_MESSAGE wording (several decorators may fire
      // for one field) — nothing that could distinguish malformed from
      // unknown, used, or expired.
      expect((response.message as string[]).length).toBeGreaterThan(0);
      for (const message of response.message as string[]) {
        expect(message).toBe(INVALID_RESET_MESSAGE);
      }
    }
  });

  it.each([
    ['missing password', { token: rawToken, confirmPassword: goodPassword }],
    ['seven-character password', { token: rawToken, password: '1234567', confirmPassword: '1234567' }],
    ['null password', { token: rawToken, password: null, confirmPassword: goodPassword }],
  ])('rejects a %s with a field error, not an invalid-token error', async (_label, payload) => {
    try {
      await validate(payload);
      throw new Error('accepted an invalid password');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as { message: unknown };
      const messages = JSON.stringify(response.message);
      expect(messages).not.toContain(INVALID_RESET_MESSAGE);
      expect(messages).not.toContain('reset link');
    }
  });

  it.each([
    ['missing confirmation', { token: rawToken, password: goodPassword }],
    ['mismatched confirmation', { token: rawToken, password: goodPassword, confirmPassword: 'Different123' }],
    ['null confirmation', { token: rawToken, password: goodPassword, confirmPassword: null }],
  ])('rejects a %s with an actionable field error', async (_label, payload) => {
    try {
      await validate(payload);
      throw new Error('accepted a mismatched confirmation');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as { message: unknown };
      const messages = JSON.stringify(response.message);
      expect(messages).not.toContain(INVALID_RESET_MESSAGE);
      expect(messages).toMatch(/password/i);
    }
  });

  it.each(['userId', 'familyId', 'tokenHash', 'email'])(
    'rejects a non-whitelisted %s before the service runs',
    async (field) => {
      await expect(
        validate({ token: rawToken, password: goodPassword, confirmPassword: goodPassword, [field]: 'intruder' })
      ).rejects.toBeInstanceOf(BadRequestException);
    }
  );
});
