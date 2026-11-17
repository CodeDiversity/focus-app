import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WeeklyChoicePrompt } from './WeeklyChoicePrompt';

describe('WeeklyChoicePrompt (EP15G)', () => {
  it("EP15G-AC2: renders the context sentence, 'Just this day', 'This and following' and 'Back'; focus lands on 'Just this day'; Escape calls onBack", async () => {
    const user = userEvent.setup();
    const onThisDay = vi.fn();
    const onFollowing = vi.fn();
    const onBack = vi.fn();
    render(
      <WeeklyChoicePrompt
        question="This repeats weekly. Remove it for:"
        onThisDay={onThisDay}
        onFollowing={onFollowing}
        onBack={onBack}
      />
    );
    expect(screen.getByText('This repeats weekly. Remove it for:')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button').map((b) => b.textContent);
    expect(buttons).toEqual(['Just this day', 'This and following', 'Back']);
    expect(screen.getByRole('button', { name: 'Just this day' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(onBack).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'This and following' }));
    expect(onFollowing).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Just this day' }));
    expect(onThisDay).toHaveBeenCalledTimes(1);
  });
});
