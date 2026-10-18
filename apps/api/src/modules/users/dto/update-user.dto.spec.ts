import { validate } from 'class-validator';
import { UpdateUserDto } from './update-user.dto';

/**
 * SP-106B DTO unit spec (schema-free, no database): validates the DTO
 * constraints for the PATCH /users/me endpoint (timeZone + preferences
 * bounds + partial-update + unknown-field rejection).
 */
describe('UpdateUserDto (DTO-level validation, no database)', () => {
  async function validateDto(dto: UpdateUserDto): Promise<string[]> {
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    return errors.flatMap((e) => Object.values(e.constraints || {}));
  }

  describe('timeZone', () => {
    it('valid IANA time zones pass', async () => {
      const dto = new UpdateUserDto();
      dto.timeZone = 'America/New_York';
      const errors = await validateDto(dto);
      const tzErrors = errors.filter((e) => e.includes('IANA'));
      expect(tzErrors).toHaveLength(0);
    });

    it('UTC passes', async () => {
      const dto = new UpdateUserDto();
      dto.timeZone = 'UTC';
      const errors = await validateDto(dto);
      const tzErrors = errors.filter((e) => e.includes('IANA'));
      expect(tzErrors).toHaveLength(0);
    });

    it('Mars/Olympus fails with an actionable message', async () => {
      const dto = new UpdateUserDto();
      dto.timeZone = 'Mars/Olympus';
      const errors = await validateDto(dto);
      const tzErrors = errors.filter((e) => e.includes('IANA'));
      expect(tzErrors).toHaveLength(1);
    });

    it('UTC+5 (non-IANA offset) fails', async () => {
      const dto = new UpdateUserDto();
      dto.timeZone = 'UTC+5';
      const errors = await validateDto(dto);
      const tzErrors = errors.filter((e) => e.includes('IANA'));
      expect(tzErrors).toHaveLength(1);
    });

    it('empty string fails', async () => {
      const dto = new UpdateUserDto();
      dto.timeZone = '';
      const errors = await validateDto(dto);
      const tzErrors = errors.filter((e) => e.includes('IANA'));
      expect(tzErrors).toHaveLength(1);
    });

    it('a non-string type fails', async () => {
      const dto = new UpdateUserDto();
      // @ts-expect-error: intentionally invalid type for validation test.
      dto.timeZone = 123;
      const errors = await validateDto(dto);
      const stringErrors = errors.filter((e) => e.includes('must be a string'));
      expect(stringErrors).toHaveLength(1);
    });
  });

  describe('preferences', () => {
    it('a plain object passes', async () => {
      const dto = new UpdateUserDto();
      dto.preferences = { studyDefaults: { mode: 'focus' } };
      const errors = await validateDto(dto);
      const prefsErrors = errors.filter((e) => e.includes('preferences'));
      expect(prefsErrors).toHaveLength(0);
    });

    it('a top-level array fails', async () => {
      const dto = new UpdateUserDto();
      // @ts-expect-error: intentionally invalid type for validation test.
      dto.preferences = ['a', 'b'];
      const errors = await validateDto(dto);
      const prefsErrors = errors.filter((e) => e.includes('must be a plain object'));
      expect(prefsErrors).toHaveLength(1);
    });

    it('a top-level string fails', async () => {
      const dto = new UpdateUserDto();
      // @ts-expect-error: intentionally invalid type for validation test.
      dto.preferences = 'not an object';
      const errors = await validateDto(dto);
      const prefsErrors = errors.filter((e) => e.includes('must be a plain object'));
      expect(prefsErrors).toHaveLength(1);
    });

    it('a top-level number fails', async () => {
      const dto = new UpdateUserDto();
      // @ts-expect-error: intentionally invalid type for validation test.
      dto.preferences = 42;
      const errors = await validateDto(dto);
      const prefsErrors = errors.filter((e) => e.includes('must be a plain object'));
      expect(prefsErrors).toHaveLength(1);
    });

    it('a > 4096-byte serialized object fails', async () => {
      const dto = new UpdateUserDto();
      // Build a large object that serializes > 4096 bytes.
      const large: Record<string, string> = {};
      for (let i = 0; i < 200; i++) {
        large[`key${i}`] = 'x'.repeat(30);
      }
      dto.preferences = large;
      const errors = await validateDto(dto);
      const prefsErrors = errors.filter((e) => e.includes('serialized size'));
      expect(prefsErrors).toHaveLength(1);
    });

    it('a 4096-byte object passes (boundary)', async () => {
      // Build an object that serializes to exactly 4096 bytes using a
      // single key with a long value — avoids JSON overhead of multiple
      // key-value pairs.
      const valueLength = 4096 - 11; // '{"data":"<value>"}' = 11 bytes
      const large: Record<string, string> = { data: 'x'.repeat(valueLength) };
      expect(JSON.stringify(large).length).toBe(4096);
      const dto = new UpdateUserDto();
      dto.preferences = large;
      const errors = await validateDto(dto);
      const prefsErrors = errors.filter((e) => e.includes('serialized size'));
      expect(prefsErrors).toHaveLength(0);
    });

    it('measures the cap in UTF-8 bytes, not UTF-16 units (IR-106-02)', async () => {
      // 2050 multi-byte characters: ~2061 UTF-16 units inside the JSON
      // string, but ~4111 UTF-8 bytes — under the cap in units, over it in
      // bytes. The old `String.length` check accepted this payload.
      const dto = new UpdateUserDto();
      dto.preferences = { data: 'é'.repeat(2050) };
      const serialized = JSON.stringify(dto.preferences);
      expect(serialized.length).toBeLessThan(4096); // units: would pass the old check
      expect(Buffer.byteLength(serialized, 'utf8')).toBeGreaterThan(4096); // bytes: the real cap

      const errors = await validateDto(dto);
      const prefsErrors = errors.filter((e) => e.includes('serialized size'));
      expect(prefsErrors).toHaveLength(1);
    });
  });

  describe('name', () => {
    it('an empty display name fails (IR-106-06 — matches the form and registration)', async () => {
      const dto = new UpdateUserDto();
      dto.name = '';
      const errors = await validateDto(dto);
      const nameErrors = errors.filter((e) => e.includes('should not be empty'));
      expect(nameErrors).toHaveLength(1);
    });
  });

  describe('partial update', () => {
    it('a name-only body validates', async () => {
      const dto = new UpdateUserDto();
      dto.name = 'Ada Lovelace';
      const errors = await validateDto(dto);
      expect(errors).toHaveLength(0);
    });

    it('an empty body validates (no-op update)', async () => {
      const dto = new UpdateUserDto();
      const errors = await validateDto(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
