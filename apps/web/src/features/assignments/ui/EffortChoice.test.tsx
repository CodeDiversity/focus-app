import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { setupUser } from '@/test/user';
import { EFFORT_OPTIONS, EffortChoice, effortOf, hardOf, type EffortValue } from './EffortChoice';

/** EP14E-AC4 — the compact "How hard is this?" control (D-E5/D-E6). */

function Host({
  initial = 'auto',
  disabled = false,
  error,
  onChange,
}: {
  initial?: EffortValue;
  disabled?: boolean;
  error?: string;
  onChange?: (value: EffortValue) => void;
}) {
  const [value, setValue] = useState<EffortValue>(initial);
  return (
    <form>
      <input aria-label="Before" />
      <EffortChoice
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange?.(next);
        }}
        disabled={disabled}
        error={error}
        idBase="effort"
      />
      <input aria-label="After" />
    </form>
  );
}

const radio = (name: 'Auto' | 'Hard' | 'Not hard') => screen.getByRole('radio', { name });
const group = () => screen.getByRole('group', { name: 'How hard is this?' });
const helper = () => document.getElementById('effort-helper') as HTMLElement;
const FORBIDDEN = /%|\bfail|\bfault|\bshould have/i;

describe('EffortChoice', () => {
  it('renders How hard is this? as a radio group of exactly Auto / Hard / Not hard, Auto checked on create', () => {
    render(<Host />);
    const radios = within(group()).getAllByRole('radio');
    expect(radios.map((r) => r.getAttribute('value'))).toEqual(['auto', 'hard', 'not-hard']);
    expect(within(group()).getByText('Auto')).toBeInTheDocument();
    expect(within(group()).getByText('Hard')).toBeInTheDocument();
    expect(within(group()).getByText('Not hard')).toBeInTheDocument();
    expect(radio('Auto')).toBeChecked();
    expect(radio('Hard')).not.toBeChecked();
    expect(radio('Not hard')).not.toBeChecked();
    // One named group, one helper line tied to it.
    expect(group().getAttribute('aria-describedby')).toBe('effort-helper');
  });

  it('the helper line follows the selection and carries no percentages or blame terms', async () => {
    const user = setupUser();
    render(<Host />);
    expect(helper()).toHaveTextContent('Auto — based on the type and size.');
    await user.click(radio('Hard'));
    expect(helper()).toHaveTextContent('Planned for your high-energy times when you have them.');
    await user.click(radio('Not hard'));
    expect(helper()).toHaveTextContent('Easy to fit in — planned for lower-energy times.');
    for (const option of EFFORT_OPTIONS) {
      expect(option.helper).not.toMatch(FORBIDDEN);
      expect(option.label).not.toMatch(FORBIDDEN);
    }
  });

  it('selected segment shows the check icon and a bold label, not colour alone', async () => {
    const user = setupUser();
    render(<Host />);
    const segment = (name: 'Auto' | 'Hard' | 'Not hard') =>
      radio(name).closest('label') as HTMLElement;
    expect(segment('Auto').querySelector('[data-icon="selected"]')).not.toBeNull();
    expect(segment('Auto')).toHaveClass('font-semibold', 'border-accent');
    expect(segment('Hard').querySelector('[data-icon="selected"]')).toBeNull();
    expect(segment('Hard')).not.toHaveClass('font-semibold');
    await user.click(radio('Hard'));
    expect(segment('Hard').querySelector('[data-icon="selected"]')).not.toBeNull();
    expect(segment('Hard')).toHaveClass('font-semibold');
    expect(segment('Auto').querySelector('[data-icon="selected"]')).toBeNull();
    // The icon is decorative; the radio's name is the label text alone.
    expect(segment('Hard').querySelector('[data-icon="selected"]')).toHaveAttribute('aria-hidden');
  });

  it('Tab reaches the checked radio once; ArrowRight/ArrowLeft move and select, wrapping', async () => {
    const user = setupUser();
    const onChange = vi.fn();
    render(<Host initial="hard" onChange={onChange} />);
    screen.getByLabelText('Before').focus();
    await user.tab();
    expect(radio('Hard')).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText('After')).toHaveFocus();
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(radio('Hard')).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(radio('Not hard')).toHaveFocus();
    expect(radio('Not hard')).toBeChecked();
    await user.keyboard('{ArrowRight}');
    expect(radio('Auto')).toHaveFocus();
    expect(radio('Auto')).toBeChecked();
    await user.keyboard('{ArrowLeft}');
    expect(radio('Not hard')).toBeChecked();
    expect(onChange.mock.calls.map(([value]) => value)).toEqual(['not-hard', 'auto', 'not-hard']);
  });

  it('disabled while submitting', async () => {
    const user = setupUser();
    const onChange = vi.fn();
    render(<Host disabled onChange={onChange} />);
    for (const name of ['Auto', 'Hard', 'Not hard'] as const) expect(radio(name)).toBeDisabled();
    expect(radio('Hard').closest('label')).toHaveClass('cursor-not-allowed', 'opacity-50');
    await user.click(radio('Hard'));
    expect(onChange).not.toHaveBeenCalled();
    expect(radio('Auto')).toBeChecked();
  });

  it('the three segments stay one row (grid-cols-3) with max-sm:min-h-[44px] targets', () => {
    render(<Host />);
    const row = radio('Auto').closest('.grid') as HTMLElement;
    expect(row).toHaveClass('grid-cols-3');
    expect(row).not.toHaveClass('grid-cols-1');
    for (const name of ['Auto', 'Hard', 'Not hard'] as const) {
      const label = radio(name).closest('label') as HTMLElement;
      expect(label).toHaveClass('max-sm:min-h-[44px]');
      expect(label).toHaveClass('focus-within:ring-2', 'focus-within:ring-focus-ring');
    }
  });

  it('renders a server error under the group, keeps the selection and describes the group with it', () => {
    render(<Host initial="not-hard" error="hard must be true, false or null" />);
    const message = screen.getByText('hard must be true, false or null');
    expect(group()).toContainElement(message);
    expect(message).toHaveClass('text-danger');
    expect(group().getAttribute('aria-describedby')?.split(' ')).toEqual([
      'effort-helper',
      'effort-error',
    ]);
    expect(group()).toHaveAttribute('aria-invalid', 'true');
    expect(radio('Not hard')).toBeChecked();
  });

  it('maps the wire value both ways: null/undefined ↔ auto, true ↔ hard, false ↔ not-hard', () => {
    expect(effortOf(null)).toBe('auto');
    expect(effortOf(undefined)).toBe('auto');
    expect(effortOf(true)).toBe('hard');
    expect(effortOf(false)).toBe('not-hard');
    expect(hardOf('auto')).toBeNull();
    expect(hardOf('hard')).toBe(true);
    expect(hardOf('not-hard')).toBe(false);
  });
});
