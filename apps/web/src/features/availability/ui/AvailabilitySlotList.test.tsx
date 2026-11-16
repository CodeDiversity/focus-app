import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { AvailabilitySlotList } from './AvailabilitySlotList';
import type { AvailabilitySlot } from '@/entities/availability/model/types';

const slot = (overrides: Partial<AvailabilitySlot>): AvailabilitySlot => ({
  id: 's',
  dayOfWeek: 1,
  startTime: '09:00',
  endTime: '10:00',
  isAvailable: true,
  energy: 'NORMAL',
  createdAt: '2026-10-20T12:00:00.000Z',
  updatedAt: '2026-10-20T12:00:00.000Z',
  ...overrides,
});

describe('AvailabilitySlotList energy tag (EP13J-AC4, D-J6)', () => {
  it('shows the level as text beside the kind badge; Normal and blocked rows carry no tag', () => {
    render(
      <AvailabilitySlotList
        slots={[
          slot({ id: 'a', energy: 'HIGH' }),
          slot({ id: 'b', startTime: '11:00', endTime: '12:00', energy: 'LOW' }),
          slot({ id: 'c', startTime: '13:00', endTime: '14:00' }),
          slot({
            id: 'd',
            startTime: '15:00',
            endTime: '16:00',
            isAvailable: false,
            energy: 'HIGH',
          }),
        ]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    const rows = within(screen.getByRole('region', { name: 'Monday' })).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('High energy');
    expect(rows[1]).toHaveTextContent('Low energy');
    expect(rows[2]).not.toHaveTextContent(/energy/i);
    expect(rows[3]).not.toHaveTextContent(/energy/i);
  });
});
