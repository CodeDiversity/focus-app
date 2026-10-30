import { compareAssignments } from './ordering';
import type { OrderableAssignment } from './ordering';
import type { AssignmentPriorityValue } from './types';

/**
 * EP06B domain unit spec (pure, no clock, no zone): the **shared
 * comparator** (D06-22) — the one ordering the remaining-work read and the
 * scheduler both use, so the list and the plan can never disagree about
 * which work is "next".
 *
 * The order: on-time first (due date ascending), then overdue, then undated;
 * inside a group by priority descending, then `createdAt` ascending, then
 * `id` ascending. The last key makes the order **total** — no two distinct
 * assignments compare equal.
 */
describe('assignment ordering (domain, EP06B)', () => {
  const TODAY = '2026-10-30';

  const assignment = (overrides: Partial<OrderableAssignment> = {}): OrderableAssignment => ({
    id: 'a-1',
    dueDate: '2026-11-05',
    priority: 'MEDIUM',
    createdAt: new Date('2026-10-20T12:00:00.000Z'),
    ...overrides,
  });

  /** Sort with the comparator — the read's and the engine's own use. */
  const sort = (items: OrderableAssignment[]): OrderableAssignment[] =>
    [...items].sort((a, b) => compareAssignments(a, b, TODAY));

  describe('the three due-date groups', () => {
    it('puts on-time assignments before overdue ones', () => {
      const onTime = assignment({ id: 'on-time', dueDate: '2026-11-05' });
      const overdue = assignment({ id: 'overdue', dueDate: '2026-10-01' });

      expect(compareAssignments(onTime, overdue, TODAY)).toBeLessThan(0);
      expect(compareAssignments(overdue, onTime, TODAY)).toBeGreaterThan(0);
    });

    it('puts overdue assignments before undated ones', () => {
      const overdue = assignment({ id: 'overdue', dueDate: '2026-10-01' });
      const undated = assignment({ id: 'undated', dueDate: null });

      expect(compareAssignments(overdue, undated, TODAY)).toBeLessThan(0);
      expect(compareAssignments(undated, overdue, TODAY)).toBeGreaterThan(0);
    });

    it('treats a due date of today as on time', () => {
      const dueToday = assignment({ id: 'due-today', dueDate: TODAY });
      const overdue = assignment({ id: 'overdue', dueDate: '2026-10-29' });

      expect(compareAssignments(dueToday, overdue, TODAY)).toBeLessThan(0);
    });

    it('orders the groups as on-time, overdue, undated', () => {
      const sorted = sort([
        assignment({ id: 'undated', dueDate: null }),
        assignment({ id: 'overdue', dueDate: '2026-10-01' }),
        assignment({ id: 'on-time', dueDate: '2026-11-05' }),
      ]);
      expect(sorted.map((item) => item.id)).toEqual(['on-time', 'overdue', 'undated']);
    });
  });

  describe('the due-date key inside a group', () => {
    it('orders on-time assignments by due date ascending', () => {
      const sorted = sort([
        assignment({ id: 'third', dueDate: '2026-11-20' }),
        assignment({ id: 'first', dueDate: '2026-11-01' }),
        assignment({ id: 'second', dueDate: '2026-11-10' }),
      ]);
      expect(sorted.map((item) => item.id)).toEqual(['first', 'second', 'third']);
    });

    it('orders overdue assignments by due date ascending too (the earliest first)', () => {
      const sorted = sort([
        assignment({ id: 'later', dueDate: '2026-10-20' }),
        assignment({ id: 'earlier', dueDate: '2026-10-05' }),
      ]);
      expect(sorted.map((item) => item.id)).toEqual(['earlier', 'later']);
    });

    it('does not compare the due dates of an undated assignment', () => {
      // Two undated assignments with the same priority and creation time are
      // separated by their id — not by a due date.
      const sorted = sort([
        assignment({ id: 'b', dueDate: null }),
        assignment({ id: 'a', dueDate: null }),
      ]);
      expect(sorted.map((item) => item.id)).toEqual(['a', 'b']);
    });
  });

  describe('the tie-breaks inside a group', () => {
    it('orders by priority descending (URGENT > HIGH > MEDIUM > LOW)', () => {
      const priorities: AssignmentPriorityValue[] = ['LOW', 'URGENT', 'MEDIUM', 'HIGH'];
      const sorted = sort(
        priorities.map((priority, index) => assignment({ id: `p${index}`, priority }))
      );
      expect(sorted.map((item) => item.priority)).toEqual(['URGENT', 'HIGH', 'MEDIUM', 'LOW']);
    });

    it('orders by createdAt ascending when the priority ties', () => {
      const sorted = sort([
        assignment({ id: 'later', createdAt: new Date('2026-10-22T12:00:00.000Z') }),
        assignment({ id: 'earlier', createdAt: new Date('2026-10-21T12:00:00.000Z') }),
      ]);
      expect(sorted.map((item) => item.id)).toEqual(['earlier', 'later']);
    });

    it('orders by id ascending when the priority and the creation time tie', () => {
      const sorted = sort([assignment({ id: 'b' }), assignment({ id: 'a' })]);
      expect(sorted.map((item) => item.id)).toEqual(['a', 'b']);
    });

    it('applies the tie-breaks only inside a group', () => {
      // A low-priority on-time assignment still comes before an urgent
      // overdue one: the group wins.
      const sorted = sort([
        assignment({ id: 'urgent-overdue', dueDate: '2026-10-01', priority: 'URGENT' }),
        assignment({ id: 'low-on-time', dueDate: '2026-11-30', priority: 'LOW' }),
      ]);
      expect(sorted.map((item) => item.id)).toEqual(['low-on-time', 'urgent-overdue']);
    });
  });

  describe('the total order', () => {
    it('compares an assignment with itself as equal', () => {
      const item = assignment();
      expect(compareAssignments(item, item, TODAY)).toBe(0);
    });

    it('is antisymmetric', () => {
      const a = assignment({ id: 'a' });
      const b = assignment({ id: 'b' });
      expect(Math.sign(compareAssignments(a, b, TODAY))).toBe(
        -Math.sign(compareAssignments(b, a, TODAY))
      );
    });

    it('never compares two distinct assignments as equal', () => {
      const items = [
        assignment({ id: 'a' }),
        assignment({ id: 'b', priority: 'HIGH' }),
        assignment({ id: 'c', dueDate: null }),
        assignment({ id: 'd', dueDate: '2026-10-01' }),
        assignment({ id: 'e', createdAt: new Date('2026-10-25T12:00:00.000Z') }),
      ];
      for (const a of items) {
        for (const b of items) {
          if (a.id === b.id) {
            expect(compareAssignments(a, b, TODAY)).toBe(0);
          } else {
            expect(compareAssignments(a, b, TODAY)).not.toBe(0);
          }
        }
      }
    });

    it('is stable across repeated sorts of the same set', () => {
      const items = [
        assignment({ id: 'c', dueDate: '2026-10-01' }),
        assignment({ id: 'a', dueDate: '2026-11-01' }),
        assignment({ id: 'b', dueDate: '2026-11-01', priority: 'URGENT' }),
      ];
      const first = sort(items).map((item) => item.id);
      const second = sort([...items].reverse()).map((item) => item.id);
      expect(second).toEqual(first);
    });
  });
});
