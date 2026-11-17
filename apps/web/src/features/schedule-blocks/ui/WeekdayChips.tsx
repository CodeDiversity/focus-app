import { useId } from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';

/** Grid order Monday first (D15-14), Sunday last; values are the API's 0…6. */
const ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface WeekdayChipsProps {
  value: number[];
  onChange: (next: number[]) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
}

/**
 * "On these days" (EP15G-AC1/AC4, D-G11): one `fieldset` with seven native
 * checkboxes styled as pills — Space toggles, Tab enters the group once per
 * checkbox (native semantics, no roving tabindex). The visible text is the
 * short name, the accessible name the full weekday ("Mon" is a prefix of
 * "Monday", so label-in-name holds). A checked pill is filled **and** carries
 * a check icon — never colour alone. Errors and hints describe the group.
 */
export function WeekdayChips({ value, onChange, error, hint, disabled }: WeekdayChipsProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const toggle = (day: number) => {
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day]);
  };
  return (
    <fieldset
      aria-describedby={error ? errorId : hint ? hintId : undefined}
      aria-invalid={error ? true : undefined}
      className="min-w-0"
    >
      <legend className="mb-2 block text-body-sm font-medium text-text">On these days</legend>
      <div className="flex flex-wrap gap-2">
        {ORDER.map((day) => {
          const checked = value.includes(day);
          return (
            <label
              key={day}
              className={clsx(
                'inline-flex min-w-[3.25rem] cursor-pointer select-none items-center justify-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-150 motion-reduce:transition-none',
                'focus-within:outline-none focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2',
                'max-sm:min-h-[44px]',
                checked
                  ? 'border-accent bg-accent text-white'
                  : 'border-border-strong bg-surface text-text hover:border-accent',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                aria-label={LONG[day]}
                value={day}
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(day)}
              />
              {checked && <Check aria-hidden size={14} className="shrink-0" />}
              {SHORT[day]}
            </label>
          );
        })}
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-body-sm text-danger">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="mt-1 text-body-sm text-text-muted">
          {hint}
        </p>
      )}
    </fieldset>
  );
}
