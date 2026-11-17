import { BadRequestException } from '@nestjs/common';
import { FieldValidationPipe } from '../../../common/pipes/validation.pipe';
import { FIELD_VALIDATION_PIPE_OPTIONS } from '../../../common/pipes/validation-pipe-options';
import { ResendVerificationDto } from './resend-verification.dto';

const validate = (payload: unknown) =>
  // Production pipe + shared options (R-EP14-06).
  new FieldValidationPipe(FIELD_VALIDATION_PIPE_OPTIONS).transform(payload, {
    type: 'body',
    metatype: ResendVerificationDto,
  });

describe('ResendVerificationDto', () => {
  it('accepts and normalizes a trimmed mixed-case email', async () => {
    await expect(validate({ email: ' Ada@EXAMPLE.COM ' })).resolves.toMatchObject({
      email: 'ada@example.com',
    });
  });
  it.each([
    {},
    { email: '' },
    { email: '   ' },
    { email: 'malformed' },
    { email: null },
    { email: [] },
    { email: 123 },
  ])('rejects empty or malformed email with an actionable message (%o)', async (payload) => {
    try {
      await validate(payload);
      throw new Error('accepted invalid email');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        message: expect.arrayContaining([expect.stringContaining('valid email address')]),
      });
    }
  });
  it.each(['userId', 'emailVerifiedAt'])('rejects non-whitelisted %s', async (field) => {
    await expect(validate({ email: 'ada@example.com', [field]: 'owner' })).rejects.toThrow(
      BadRequestException
    );
  });
});
