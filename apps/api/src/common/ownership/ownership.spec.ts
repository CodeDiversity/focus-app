import { HttpStatus, NotFoundException } from '@nestjs/common';
import { assertAffected, assertOwned, ownedWhere, RESOURCE_NOT_FOUND } from './ownership';

const OWNER = 'user-a';
const STRANGER = 'user-b';

function expectUniform404(thrown: unknown): void {
  expect(thrown).toBeInstanceOf(NotFoundException);
  const exception = thrown as NotFoundException;
  expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
  expect(exception.message).toBe(RESOURCE_NOT_FOUND);
}

describe('ownership helpers', () => {
  describe('ownedWhere', () => {
    it('embeds both id and userId', () => {
      expect(ownedWhere(OWNER, 'record-1')).toEqual({ id: 'record-1', userId: OWNER });
    });
  });

  describe('assertOwned', () => {
    it('passes for the owning user', () => {
      expect(() => assertOwned(OWNER, { userId: OWNER })).not.toThrow();
    });

    it('throws 404 for another user\'s record', () => {
      expectUniform404(caught(() => assertOwned(OWNER, { userId: STRANGER })));
    });

    it('throws the identical 404 status and message for a missing record (no existence oracle)', () => {
      const missing = caught(() => assertOwned(OWNER, null)) as NotFoundException;
      const notOwned = caught(() => assertOwned(OWNER, { userId: STRANGER })) as NotFoundException;

      expectUniform404(missing);
      expectUniform404(notOwned);
      // Deep equality over status + message: a caller cannot tell the cases apart.
      expect(missing).toEqual(notOwned);
    });
  });

  describe('assertAffected', () => {
    it('throws 404 on a 0-row scoped mutation', () => {
      expectUniform404(caught(() => assertAffected(OWNER, 0)));
    });

    it('passes on a 1-row scoped mutation', () => {
      expect(() => assertAffected(OWNER, 1)).not.toThrow();
    });
  });
});

function caught(fn: () => void): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error('expected the function to throw');
}
