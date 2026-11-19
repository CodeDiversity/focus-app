import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Disclosure } from './Disclosure';

describe('Disclosure (EP17F, D-F6)', () => {
  it('toggles aria-expanded and its panel on click, Enter and Space', async () => {
    const user = userEvent.setup();
    render(
      <Disclosure id="extra" label="What else changed">
        <p>Panel body</p>
      </Disclosure>
    );
    const button = screen.getByRole('button', { name: 'What else changed' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Panel body')).toBeNull();

    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Panel body')).toBeInTheDocument();

    button.focus();
    await user.keyboard('{Enter}');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Panel body')).toBeNull();

    await user.keyboard(' ');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Panel body')).toBeInTheDocument();
  });

  it('honours defaultOpen', () => {
    render(
      <Disclosure id="extra" label="What else changed" defaultOpen>
        <p>Panel body</p>
      </Disclosure>
    );
    expect(screen.getByRole('button', { name: 'What else changed' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByText('Panel body')).toBeInTheDocument();
  });

  it('points aria-controls at the panel', async () => {
    const user = userEvent.setup();
    render(
      <Disclosure id="extra" label="What else changed">
        <p>Panel body</p>
      </Disclosure>
    );
    const button = screen.getByRole('button', { name: 'What else changed' });
    await user.click(button);
    const panelId = button.getAttribute('aria-controls');
    expect(panelId).toBe('extra-panel');
    expect(document.getElementById(panelId as string)).toHaveTextContent('Panel body');
  });

  it('has a 44px target below sm and the shared focus ring (class contract)', () => {
    render(
      <Disclosure id="extra" label="What else changed">
        <p>Panel body</p>
      </Disclosure>
    );
    const button = screen.getByRole('button', { name: 'What else changed' });
    expect(button.className).toContain('max-sm:min-h-[44px]');
    expect(button.className).toContain('focus-visible:ring-focus-ring');
  });
});
