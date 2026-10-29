import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('applies variant classes', () => {
    render(<Badge variant="danger">Err</Badge>);
    expect(screen.getByText('Err').closest('span')?.className).toContain('bg-danger/10');
  });

  it('renders icon before children', () => {
    render(<Badge icon={<span>I</span>}>Text</Badge>);
    expect(screen.getByText('I')).toBeInTheDocument();
    expect(screen.getByText('Text')).toBeInTheDocument();
  });

  it('applies size classes', () => {
    render(<Badge size="md">M</Badge>);
    expect(screen.getByText('M').closest('span')?.className).toContain('text-body-sm');
  });
});
