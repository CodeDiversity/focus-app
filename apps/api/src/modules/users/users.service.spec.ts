import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

/**
 * SP-106A unit spec (mocked PrismaService, no database): pins the
 * profile-preferences read side.
 *
 * - `findById` (the `GET /users/me` path) must select the new
 *   `timeZone`/`preferences` fields while the explicit select keeps
 *   `passwordHash` and the token relations out of the response. The
 *   assertions use exact call-object matches, so adding a credential
 *   field to the select fails these tests.
 * - `create` must leave both fields out of the `data` object so the
 *   database defaults (`"UTC"` / `NULL`) apply — registration never
 *   writes a time zone or preferences explicitly.
 */
describe('UsersService (unit, mocked PrismaService)', () => {
  const findUnique = jest.fn();
  const create = jest.fn();
  // Partial mock: UsersService only touches `prisma.user` in the methods
  // under test.
  const prisma = { user: { findUnique, create } } as unknown as PrismaService;

  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(prisma);
  });

  describe('findById', () => {
    it('selects timeZone + preferences and excludes passwordHash and the token relations', async () => {
      findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'ada@example.com',
        name: 'Ada',
        emailVerifiedAt: null,
        timeZone: 'UTC',
        preferences: null,
        createdAt: new Date('2026-10-17T00:00:00.000Z'),
        updatedAt: new Date('2026-10-17T00:00:00.000Z'),
      });

      const user = await service.findById('user-1');

      // Exact match: the select is the credential boundary. It must name
      // the new profile fields and must NOT name passwordHash,
      // emailVerificationTokens, passwordResetTokens, or refreshTokens —
      // adding any of those to the select breaks this assertion.
      expect(findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: {
          id: true,
          email: true,
          name: true,
          emailVerifiedAt: true,
          timeZone: true,
          preferences: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // The selected row is returned as-is — the new fields are present
      // in the shape GET /users/me serves.
      expect(user).toEqual(
        expect.objectContaining({
          id: 'user-1',
          timeZone: 'UTC',
          preferences: null,
        })
      );
    });
  });

  describe('create', () => {
    it('leaves timeZone/preferences unset in data so the database defaults apply', async () => {
      create.mockResolvedValue({
        id: 'user-2',
        email: 'grace@example.com',
        name: 'Grace',
        emailVerifiedAt: null,
        timeZone: 'UTC',
        preferences: null,
        createdAt: new Date('2026-10-17T00:00:00.000Z'),
        updatedAt: new Date('2026-10-17T00:00:00.000Z'),
      });

      await service.create({
        email: 'grace@example.com',
        passwordHash: 'argon2id-hash',
        name: 'Grace',
      });

      const args = create.mock.calls[0][0] as { data: Record<string, unknown> };
      // Registration must not write the new columns explicitly: the
      // schema defaults ("UTC" / NULL) own the initial values.
      expect(args.data).not.toHaveProperty('timeZone');
      expect(args.data).not.toHaveProperty('preferences');

      // ...but the select returns them, so callers see the defaulted
      // values in the created row.
      expect(create).toHaveBeenCalledWith({
        data: {
          email: 'grace@example.com',
          passwordHash: 'argon2id-hash',
          name: 'Grace',
        },
        select: {
          id: true,
          email: true,
          name: true,
          emailVerifiedAt: true,
          timeZone: true,
          preferences: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });
  });
});
