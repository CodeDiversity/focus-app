import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PresetRadioGroup, isPreset, withCustom, CUSTOM_DESCRIPTION } from './PresetRadioGroup';
import type { Preset } from './PresetRadioGroup';

const PRESETS: ReadonlyArray<Preset> = [
  { value: 0, label: 'As early as possible', description: 'First days that have room.' },
  { value: 70, label: 'A little each day', description: 'Share it out. The default.' },
  { value: 100, label: 'Evenly spread', description: 'About the same each day.' },
];

function Harness({
  initial = 70,
  disabled = false,
  onSelect,
  description,
}: {
  initial?: number;
  disabled?: boolean;
  onSelect?: (v: number) => void;
  description?: string;
}) {
  const [value, setValue] = useState(initial);
  return (
    <PresetRadioGroup
      name="spread"
      legend="How your week is paced"
      description={description}
      options={PRESETS}
      value={value}
      onSelect={(v) => {
        setValue(v);
        onSelect?.(v);
      }}
      disabled={disabled}
      idBase="t"
    />
  );
}

const group = () => screen.getByRole('group', { name: 'How your week is paced' });

describe('PresetRadioGroup (EP17G-AC5, D-G7)', () => {
  it('the group has an accessible name from its legend and one radio per option', () => {
    render(<Harness />);
    expect(within(group()).getAllByRole('radio')).toHaveLength(3);
  });

  it('arrow keys move the selection', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSelect={onSelect} />);

    const checked = screen.getByRole('radio', { name: 'A little each day' });
    await user.tab();
    expect(checked).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(onSelect).toHaveBeenLastCalledWith(100);
    expect(screen.getByRole('radio', { name: 'Evenly spread' })).toBeChecked();

    await user.keyboard('{ArrowUp}');
    expect(onSelect).toHaveBeenLastCalledWith(70);
  });

  it('the selected card carries a text cue as well as a colour', async () => {
    render(<Harness />);
    const card = screen.getByRole('radio', { name: 'A little each day' }).closest('label')!;
    expect(card).toHaveTextContent('Selected');
    expect(card.querySelector('[data-icon="selected"]')).not.toBeNull();
    expect(card.className).toContain('border-accent');
    // Never colour alone: the unselected cards carry no cue and no accent.
    const other = screen.getByRole('radio', { name: 'Evenly spread' }).closest('label')!;
    expect(other).not.toHaveTextContent('Selected');
  });

  it('renders a 44 px target below sm and the shared focus ring', () => {
    render(<Harness />);
    for (const radio of within(group()).getAllByRole('radio')) {
      const card = radio.closest('label')!;
      expect(card.className).toContain('max-sm:min-h-[44px]');
      expect(card.className).toContain('focus-within:ring-focus-ring');
    }
  });

  it('is disabled as a whole when disabled', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<Harness disabled onSelect={onSelect} />);
    for (const radio of within(group()).getAllByRole('radio')) expect(radio).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: 'Evenly spread' }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('an optional description is rendered and described by the group', () => {
    render(<Harness description="Your plan uses at most this many days." />);
    expect(group()).toHaveAttribute('aria-describedby', 't-spread-description');
    expect(document.getElementById('t-spread-description')).toHaveTextContent(
      'Your plan uses at most this many days.'
    );
  });

  it('accepts a plain string name (D-G7: the proposal groups are not form fields)', () => {
    render(<Harness />);
    expect(screen.getByRole('radio', { name: 'Evenly spread' })).toHaveAttribute('name', 'spread');
  });
});

describe('withCustom / isPreset (EP13N D-N2)', () => {
  it('appends the honest Custom option only for an off-preset value', () => {
    expect(isPreset(PRESETS, 70)).toBe(true);
    expect(isPreset(PRESETS, 42)).toBe(false);
    expect(withCustom(PRESETS, null, () => 'Custom')).toHaveLength(3);
    const withIt = withCustom(PRESETS, 42, (n) => `Custom (${n})`);
    expect(withIt).toHaveLength(4);
    expect(withIt[3]).toEqual({ value: 42, label: 'Custom (42)', description: CUSTOM_DESCRIPTION });
  });
});
