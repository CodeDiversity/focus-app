import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

describe('Input', () => {
  it('renders label and input', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('shows error state with aria-invalid and alert', () => {
    render(<Input label="Email" error="Required" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(input.className).toContain('border-danger');
  });

  it('shows hint when no error', () => {
    render(<Input label="Email" hint="We will not share it" />);
    expect(screen.getByText('We will not share it')).toBeInTheDocument();
  });

  it('is disabled', () => {
    render(<Input label="Email" disabled />);
    expect(screen.getByLabelText('Email')).toBeDisabled();
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(<Input label="Password" type="password" />);
    const input = screen.getByLabelText('Password') as HTMLInputElement;
    expect(input.type).toBe('password');
    await user.click(screen.getByRole('button', { name: /show password/i }));
    expect(input.type).toBe('text');
    await user.click(screen.getByRole('button', { name: /hide password/i }));
    expect(input.type).toBe('password');
  });

  it('applies size classes', () => {
    render(<Input label="X" size="lg" />);
    expect(screen.getByLabelText('X').className).toContain('min-h-[44px]');
  });

  it('exposes focus ring classes', () => {
    render(<Input label="X" />);
    expect(screen.getByLabelText('X').className).toContain('focus:ring-accent');
  });

  it('renders left and right icons', () => {
    render(<Input label="X" leftIcon={<span>L</span>} rightIcon={<span>R</span>} />);
    expect(screen.getByText('L')).toBeInTheDocument();
    expect(screen.getByText('R')).toBeInTheDocument();
  });

  it.each(['sm', 'md', 'lg'] as const)('supports size %s', (size) => {
    render(<Input label="Sized" size={size} />);
    expect(screen.getByLabelText('Sized')).toBeInTheDocument();
  });
});
