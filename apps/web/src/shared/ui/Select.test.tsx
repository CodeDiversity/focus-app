import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Select } from './Select';

describe('Select', () => {
  it('renders label and select', () => {
    render(
      <Select label="Course">
        <option value="a">A</option>
      </Select>
    );
    expect(screen.getByLabelText('Course')).toBeInTheDocument();
  });

  it('shows error state with aria-invalid and alert', () => {
    render(
      <Select label="Course" error="Required">
        <option value="a">A</option>
      </Select>
    );
    const select = screen.getByLabelText('Course');
    expect(select).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(select.className).toContain('border-danger');
  });

  it('shows hint when no error', () => {
    render(
      <Select label="Course" hint="Pick one">
        <option value="a">A</option>
      </Select>
    );
    expect(screen.getByText('Pick one')).toBeInTheDocument();
  });

  it('is disabled', () => {
    render(
      <Select label="Course" disabled>
        <option value="a">A</option>
      </Select>
    );
    expect(screen.getByLabelText('Course')).toBeDisabled();
  });

  it('applies size classes', () => {
    render(
      <Select label="Course" size="lg">
        <option value="a">A</option>
      </Select>
    );
    expect(screen.getByLabelText('Course').className).toContain('min-h-[44px]');
  });

  it('exposes focus ring classes', () => {
    render(
      <Select label="Course">
        <option value="a">A</option>
      </Select>
    );
    expect(screen.getByLabelText('Course').className).toContain('focus:ring-accent');
  });

  it.each(['sm', 'md', 'lg'] as const)('supports size %s', (size) => {
    render(
      <Select label="Sized" size={size}>
        <option value="a">A</option>
      </Select>
    );
    expect(screen.getByLabelText('Sized')).toBeInTheDocument();
  });
});
