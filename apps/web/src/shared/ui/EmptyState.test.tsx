import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No items" />);
    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  it('renders description and action', () => {
    render(<EmptyState title="No items" description="Add one" action={<button>Add</button>} />);
    expect(screen.getByText('Add one')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('renders icon', () => {
    render(<EmptyState title="No items" icon={<span>Ico</span>} />);
    expect(screen.getByText('Ico')).toBeInTheDocument();
  });
});
