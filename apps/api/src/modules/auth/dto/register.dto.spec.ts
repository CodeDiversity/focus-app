import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { FieldValidationPipe } from '../../../common/pipes/validation.pipe';
import { FIELD_VALIDATION_PIPE_OPTIONS } from '../../../common/pipes/validation-pipe-options';
import { RegisterDto } from './register.dto';

// The production pipe and its shared options (R-EP14-06), so these tests
// exercise the exact validation the endpoint applies.
const validate = async (payload: unknown): Promise<RegisterDto> => {
  const pipe = new FieldValidationPipe(FIELD_VALIDATION_PIPE_OPTIONS);
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: RegisterDto,
    data: '',
  };
  return pipe.transform(payload, metadata);
};

// The global AllExceptionsFilter surfaces the pipe's messages, which the
// pipe attaches to the exception's response rather than its .message.
const rejectionMessages = async (payload: unknown): Promise<string> => {
  try {
    await validate(payload);
  } catch (error) {
    const response = (error as BadRequestException).getResponse();
    const message = (response as { message: unknown }).message;
    if (Array.isArray(message)) {
      return message.join(' ');
    }
    return String(message);
  }
  throw new Error('expected the payload to be rejected');
};

const validPayload = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  password: 'Password123',
};

describe('RegisterDto', () => {
  it('accepts a valid payload', async () => {
    const result = await validate(validPayload);

    expect(result).toBeInstanceOf(RegisterDto);
    expect(result.name).toBe('Ada Lovelace');
    expect(result.email).toBe('ada@example.com');
  });

  it('rejects a missing display name with an actionable message', async () => {
    const { name: _name, ...payload } = validPayload;

    await expect(rejectionMessages(payload)).resolves.toMatch(/Display name is required/);
  });

  it('rejects a whitespace-only display name with an actionable message', async () => {
    await expect(rejectionMessages({ ...validPayload, name: '   ' })).resolves.toMatch(
      /Display name is required/
    );
  });

  it('rejects a malformed email with an actionable message', async () => {
    await expect(rejectionMessages({ ...validPayload, email: 'not-an-email' })).resolves.toMatch(
      /valid email/
    );
  });

  it('rejects a password shorter than 8 characters with an actionable message', async () => {
    await expect(rejectionMessages({ ...validPayload, password: 'short' })).resolves.toMatch(
      /at least 8 characters/
    );
  });

  it('rejects non-whitelisted fields such as isAdmin', async () => {
    await expect(rejectionMessages({ ...validPayload, isAdmin: true })).resolves.toMatch(
      /property isAdmin should not exist/i
    );
  });
});
