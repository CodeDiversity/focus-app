import { clsx } from 'clsx';
import { CheckCircle2 } from 'lucide-react';

/** The three form states of the EP14E flag: Auto (`null`), Hard (`true`), Not hard (`false`). */
export type EffortValue = 'auto' | 'hard' | 'not-hard';

/** `Assignment.hard` → the form value (null/undefined = Auto). */
export function effortOf(hard: boolean | null | undefined): EffortValue {
  if (hard === true) return 'hard';
  if (hard === false) return 'not-hard';
  return 'auto';
}

/** The form value → `Assignment.hard` (Auto = `null`, D-E4). */
export function hardOf(effort: EffortValue): boolean | null {
  if (effort === 'hard') return true;
  if (effort === 'not-hard') return false;
  return null;
}

/** Copy is exact (EP14E UI/UX, D-E6): no percentages, no blame, one helper line per choice. */
export const EFFORT_OPTIONS: ReadonlyArray<{ value: EffortValue; label: string; helper: string }> =
  [
    { value: 'auto', label: 'Auto', helper: 'Auto — based on the type and size.' },
    {
      value: 'hard',
      label: 'Hard',
      helper: 'Planned for your high-energy times when you have them.',
    },
    {
      value: 'not-hard',
      label: 'Not hard',
      helper: 'Easy to fit in — planned for lower-energy times.',
    },
  ];

export interface EffortChoiceProps {
  value: EffortValue;
  onChange: (value: EffortValue) => void;
  disabled?: boolean;
  /** A server field error (`errors.hard`) rendered under the group; the selection is kept. */
  error?: string;
  /** Prefix for the option and helper ids (one group per form). */
  idBase: string;
  name?: string;
}

/**
 * EP14E-AC4 (D-E5/D-E6): the compact three-segment "How hard is this?" control —
 * the EP13N native `fieldset`/`legend` + radio pattern in one row. Native
 * radios (visually hidden, still focusable) give the group semantics for
 * free: Tab enters once on the checked segment, arrows move and select with
 * wrap-around. The selected segment is marked by border, fill, a check icon
 * and a bold label — never colour alone.
 */
export function EffortChoice({
  value,
  onChange,
  disabled = false,
  error,
  idBase,
  name = 'effort',
}: EffortChoiceProps) {
  const helperId = `${idBase}-helper`;
  const errorId = `${idBase}-error`;
  const helper = EFFORT_OPTIONS.find((option) => option.value === value)?.helper ?? '';
  return (
    <fieldset
      className="space-y-2"
      aria-describedby={error ? `${helperId} ${errorId}` : helperId}
      aria-invalid={error ? true : undefined}
    >
      <legend className="mb-2 block text-sm font-medium text-text">How hard is this?</legend>
      <div className="grid grid-cols-3 gap-2">
        {EFFORT_OPTIONS.map((option) => {
          const checked = value === option.value;
          const optionId = `${idBase}-${option.value}`;
          return (
            <label
              key={option.value}
              htmlFor={optionId}
              data-checked={checked ? 'true' : undefined}
              className={clsx(
                'flex min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-sm transition-colors duration-base max-sm:min-h-[44px]',
                'focus-within:outline-none focus-within:ring-2 focus-within:ring-focus-ring focus-within:ring-offset-2',
                checked
                  ? 'border-accent bg-accent/10 font-semibold text-text'
                  : 'border-border bg-surface font-normal text-text hover:border-border-strong',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              <input
                id={optionId}
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                disabled={disabled}
                // Visually hidden, still focusable: the label is the visible target.
                className="sr-only"
              />
              {checked && (
                <CheckCircle2
                  aria-hidden
                  size={16}
                  data-icon="selected"
                  className="shrink-0 text-accent"
                />
              )}
              <span className="truncate">{option.label}</span>
            </label>
          );
        })}
      </div>
      <p id={helperId} className="text-sm text-text-muted">
        {helper}
      </p>
      {error && (
        <p id={errorId} className="text-body-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
