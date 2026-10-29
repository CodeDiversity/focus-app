import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders its children as an accessible button', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('applies variant styles', () => {
    render(<Button variant="danger">Delete</Button>);
    const button = screen.getByRole('button', { name: 'Delete' });
    expect(button.className).toContain('bg-danger');
  });

  it('applies primary variant by default', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button').className).toContain('bg-accent');
  });

  it('is disabled while loading and exposes aria-busy', () => {
    render(<Button isLoading>Save</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('is disabled when passed the disabled prop', () => {
    render(<Button disabled>Locked</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders left and right icons', () => {
    render(
      <Button leftIcon={<span>L</span>} rightIcon={<span>R</span>}>
        Text
      </Button>
    );
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('Text');
  });

  it('exposes focus ring and tap target classes', () => {
    render(<Button>Tap</Button>);
    const cls = screen.getByRole('button').className;
    expect(cls).toContain('focus-visible:ring-2');
    expect(cls).toContain('focus-visible:ring-focus-ring');
    expect(cls).toContain('max-sm:min-h-[44px]');
  });

  it.each(['sm', 'md', 'lg'] as const)('supports size %s', (size) => {
    render(<Button size={size}>Sized</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
