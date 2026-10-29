import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Hello</Card>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it.each(['default', 'elevated', 'outlined', 'muted'] as const)(
    'applies %s variant',
    (variant) => {
      render(<Card variant={variant}>x</Card>);
      // class on the card element itself
      expect(screen.getByText('x').closest('div')?.className).toContain(
        variant === 'default'
          ? 'shadow-md'
          : variant === 'elevated'
            ? 'shadow-lg'
            : variant === 'outlined'
              ? 'border'
              : 'bg-surface-muted'
      );
    }
  );

  it.each(['sm', 'md', 'lg'] as const)('applies %s padding', (padding) => {
    const map = { sm: 'p-4', md: 'p-6', lg: 'p-8' } as const;
    render(<Card padding={padding}>x</Card>);
    expect(screen.getByText('x').closest('div')?.className).toContain(map[padding]);
  });
});
