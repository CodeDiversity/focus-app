import { describe, it, expect } from 'vitest';
import { accountMenuItems, authenticatedNavGroups, unauthenticatedNavGroups } from './navGroups';

describe('navGroups contract (EP16D-AC1, AC-E16-09)', () => {
  it('authenticatedNavGroups is exactly Today, Plan, Calendar and Work {Assignments, Courses}', () => {
    expect(
      authenticatedNavGroups.map((s) => ({
        id: s.id,
        label: s.label,
        to: s.to,
        items: s.items?.map((i) => ({ id: i.id, label: i.label, to: i.to })),
      }))
    ).toEqual([
      { id: 'today', label: 'Today', to: '/today', items: undefined },
      { id: 'plan', label: 'Plan', to: '/plan', items: undefined },
      { id: 'calendar', label: 'Calendar', to: '/calendar', items: undefined },
      {
        id: 'work',
        label: 'Work',
        to: undefined,
        items: [
          { id: 'assignments', label: 'Assignments', to: '/assignments' },
          { id: 'courses', label: 'Courses', to: '/courses' },
        ],
      },
    ]);
  });

  it('unauthenticatedNavGroups is Home only', () => {
    expect(unauthenticatedNavGroups.map((s) => ({ id: s.id, label: s.label, to: s.to }))).toEqual([
      { id: 'home', label: 'Home', to: '/' },
    ]);
  });

  it('accountMenuItems is unchanged (Profile, Verify email when unverified, Logout)', () => {
    expect(
      accountMenuItems.map((i) => ({
        id: i.id,
        label: i.label,
        to: i.to,
        action: i.action,
        requiresUnverified: i.requiresUnverified,
      }))
    ).toEqual([
      {
        id: 'profile',
        label: 'Profile',
        to: '/profile',
        action: undefined,
        requiresUnverified: undefined,
      },
      {
        id: 'verify-email',
        label: 'Verify email',
        to: '/verify-email',
        action: undefined,
        requiresUnverified: true,
      },
      {
        id: 'logout',
        label: 'Logout',
        to: undefined,
        action: 'logout',
        requiresUnverified: undefined,
      },
    ]);
  });

  it('every section is a link xor a group', () => {
    for (const section of [...authenticatedNavGroups, ...unauthenticatedNavGroups]) {
      expect(Boolean(section.to) !== Boolean(section.items)).toBe(true);
    }
  });
});
