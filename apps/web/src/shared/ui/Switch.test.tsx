import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from './Switch';

describe('Switch (EP15F, shared primitive)', () => {
  it('is a labelled role="switch" button whose aria-checked and text follow the value', () => {
    const { rerender } = render(
      <Switch label="Same every day" checked onCheckedChange={vi.fn()} />
    );
    const sw = screen.getByRole('switch', { name: 'Same every day' });
    expect(sw).toHaveAttribute('aria-checked', 'true');
    expect(sw).toHaveTextContent('On');
    rerender(<Switch label="Same every day" checked={false} onCheckedChange={vi.fn()} />);
    expect(sw).toHaveAttribute('aria-checked', 'false');
    expect(sw).toHaveTextContent('Off');
  });

  it('toggles on click, Space and Enter; not when disabled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <Switch label="Same every day" checked={false} onCheckedChange={onChange} />
    );
    const sw = screen.getByRole('switch');
    await user.click(sw);
    sw.focus();
    await user.keyboard(' ');
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledTimes(3);
    expect(onChange).toHaveBeenLastCalledWith(true);
    rerender(<Switch label="Same every day" checked={false} onCheckedChange={onChange} disabled />);
    await user.click(sw);
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it('exposes the hint as the description and is ≥ 44 px on narrow screens', () => {
    render(
      <Switch
        label="Same every day"
        hint="Turn off to set each weekday."
        checked
        onCheckedChange={vi.fn()}
      />
    );
    const sw = screen.getByRole('switch');
    expect(sw).toHaveAccessibleDescription('Turn off to set each weekday.');
    expect(sw.className).toMatch(/max-sm:min-h-\[44px\]/);
    expect(sw.className).toMatch(/motion-reduce:transition-none/);
  });
});
