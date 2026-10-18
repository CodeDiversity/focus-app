import { BadRequestException } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { FieldValidationPipe } from './validation.pipe';

/**
 * FieldValidationPipe spec (D106-6 + IR-106-03): the 400 body keeps both
 * shapes — the stock `message` array (backward compatible, now produced by
 * Nest's own nested-aware flattener) and the additive field-level `errors`
 * map. No database required.
 */
describe('FieldValidationPipe', () => {
  class NestedPreferencesDto {
    @IsNotEmpty()
    mode!: string;
  }

  class TestProfileDto {
    @IsNotEmpty()
    name!: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => NestedPreferencesDto)
    preferences?: NestedPreferencesDto;
  }

  const pipe = new FieldValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  const run = async (value: unknown): Promise<Record<string, unknown>> => {
    try {
      await pipe.transform(value, { type: 'body', metatype: TestProfileDto });
    } catch (err) {
      if (err instanceof BadRequestException) {
        return err.getResponse() as Record<string, unknown>;
      }
      throw err;
    }
    throw new Error('expected the pipe to reject with a BadRequestException');
  };

  it('populates both the message array and the field-level errors map for flat constraints', async () => {
    const body = await run({ name: '' });

    expect(body.statusCode).toBe(400);
    expect(body.error).toBe('Bad Request');
    expect(body.message).toEqual(['name should not be empty']);
    expect(body.errors).toEqual({ name: ['name should not be empty'] });
  });

  it('includes nested-DTO constraints in the message array (IR-106-03)', async () => {
    const body = await run({ name: 'Ada', preferences: { mode: '' } });

    const message = body.message as string[];
    // Nest's flattener prefixes nested messages with the parent path.
    expect(message).toEqual(['preferences.mode should not be empty']);
    // The additive map stays keyed by the top-level property (nested detail
    // lives in `message`); the field-level UI reads top-level keys.
    expect(body.errors).toEqual({});
  });
});
