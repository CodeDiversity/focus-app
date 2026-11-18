import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TabBar } from './TabBar';
import { authenticatedNavGroups, mobileTabItems } from '@/widgets/header/ui/navGroups';
import { expectNoForbiddenWords } from '@/test/forbiddenWords';

function renderBar(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TabBar />
    </MemoryRouter>
  );
}

const TAB_LABELS = ['Today', 'Plan', 'Calendar', 'Assignments', 'Courses'];

describe('TabBar (EP16E-AC1, AC-E16-11)', () => {
  it('renders five tabs Today, Plan, Calendar, Assignments, Courses in contract order with an icon and a visible text label', () => {
    renderBar('/today');
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual(TAB_LABELS);
    for (const link of links) {
      const icon = link.querySelector('svg') as SVGSVGElement;
      expect(icon).toHaveClass('h-5', 'w-5');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    }
    expect(within(nav).getByRole('link', { name: 'Today' })).toHaveAttribute('href', '/today');
    expect(within(nav).getByRole('link', { name: 'Courses' })).toHaveAttribute('href', '/courses');
  });

  it('derives its tabs from mobileTabItems (no drift from authenticatedNavGroups)', () => {
    renderBar('/today');
    const links = screen.getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toEqual(mobileTabItems.map((i) => i.to));
    // The flattened list covers every destination of the grouped contract.
    const groupedTargets = authenticatedNavGroups.flatMap((s) =>
      s.items ? s.items.map((i) => i.to) : [s.to]
    );
    expect(mobileTabItems.map((i) => i.to)).toEqual(groupedTargets);
  });

  it('marks the active tab with aria-current="page" on /today, /plan, /calendar, /assignments, /courses', () => {
    for (const item of mobileTabItems) {
      const { unmount } = renderBar(item.to);
      const active = screen.getByRole('link', { name: item.label });
      expect(active).toHaveAttribute('aria-current', 'page');
      for (const other of TAB_LABELS.filter((l) => l !== item.label)) {
        expect(screen.getByRole('link', { name: other })).not.toHaveAttribute('aria-current');
      }
      unmount();
    }
  });

  it('keeps the parent tab current on nested routes (/courses/abc, /plan/proposal)', () => {
    const { unmount } = renderBar('/courses/abc');
    expect(screen.getByRole('link', { name: 'Courses' })).toHaveAttribute('aria-current', 'page');
    unmount();

    renderBar('/plan/proposal');
    expect(screen.getByRole('link', { name: 'Plan' })).toHaveAttribute('aria-current', 'page');
  });

  it('marks no tab current on /profile, /semesters, /focus/history', () => {
    for (const path of ['/profile', '/semesters', '/focus/history']) {
      const { unmount } = renderBar(path);
      expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(0);
      unmount();
    }
  });

  it('each tab has a 44px minimum target and focus-visible ring classes', () => {
    renderBar('/today');
    for (const link of screen.getAllByRole('link')) {
      expect(link).toHaveClass('min-h-14');
      expect(link.className).toContain('focus-visible:ring-2');
      expect(link.className).toContain('focus-visible:ring-inset');
    }
  });

  it('active state is not colour-only (weight and top indicator classes present)', () => {
    renderBar('/plan');
    const active = screen.getByRole('link', { name: 'Plan' });
    expect(active).toHaveClass('font-semibold');
    expect(active).toHaveClass('border-t-2', 'border-accent');
    const inactive = screen.getByRole('link', { name: 'Today' });
    expect(inactive).not.toHaveClass('font-semibold');
    expect(inactive).toHaveClass('border-transparent');
  });

  it('lists tabs as a list of five links inside the Primary navigation', () => {
    renderBar('/today');
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    const list = within(nav).getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);
  });

  it('has no entrance or exit animation and no transition-transform without a motion-reduce companion', () => {
    const { container } = renderBar('/today');
    for (const el of container.querySelectorAll(
      '[class*="animate-"], [class*="transition-transform"]'
    )) {
      expect(el.className).toContain('motion-reduce:');
    }
    // The only transition anywhere in the bar is transition-colors (not motion).
    for (const el of container.querySelectorAll('[class*="transition"]')) {
      expect(el.className).toContain('transition-colors');
    }
  });

  it('passes the copy audit', () => {
    const { container } = renderBar('/today');
    expectNoForbiddenWords(container);
  });
});
