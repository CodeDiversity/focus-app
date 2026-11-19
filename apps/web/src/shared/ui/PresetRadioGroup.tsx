import { CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';

export type Preset = { value: number; label: string; description: string };

/** True when `value` is one of the named presets. */
export const isPreset = (presets: ReadonlyArray<Preset>, value: number) =>
  presets.some((p) => p.value === value);

export const CUSTOM_DESCRIPTION = 'What is saved right now. Pick a named option to change it.';

/** The presets plus the honest Custom option when the saved value is none of them (EP13N D-N2). */
export function withCustom(
  presets: ReadonlyArray<Preset>,
  custom: number | null,
  label: (n: number) => string
): ReadonlyArray<Preset> {
  return custom === null
    ? presets
    : [...presets, { value: custom, label: label(custom), description: CUSTOM_DESCRIPTION }];
}

export interface PresetRadioGroupProps {
  /**
   * The radio group's `name`. A plain string since EP17G (D-G7): the
   * proposal's groups are not form fields.
   */
  name: string;
  legend: string;
  /** Optional sentence under the legend, announced with the group (EP17G D-G6). */
  description?: string;
  options: ReadonlyArray<Preset>;
  value: number;
  onSelect: (value: number) => void;
  error?: string;
  disabled: boolean;
  idBase: string;
}

/**
 * EP13N's radio-card group (D-N5), extracted verbatim from
 * `StudyPreferencesForm.tsx` to `shared/ui` by EP17G (D-G7) so the proposal
 * and Profile cannot spell the same choice two ways. Native fieldset/legend +
 * radios; arrow keys move the selection; `focus-within` ring; a "Selected"
 * text cue (never colour only); a 44 px target below `sm`.
 */
export function PresetRadioGroup({
  name,
  legend,
  description,
  options,
  value,
  onSelect,
  error,
  disabled,
  idBase,
}: PresetRadioGroupProps) {
  const errorId = `${idBase}-${name}-error`;
  const descId = `${idBase}-${name}-description`;
  const describedBy = [description ? descId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ');
  return (
    <fieldset className="space-y-2" aria-describedby={describedBy || undefined}>
      <legend className="mb-2 block text-body-sm font-medium text-text">{legend}</legend>
      {description && (
        <p id={descId} className="mb-2 text-sm text-text-muted">
          {description}
        </p>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {options.map((option) => {
          const checked = value === option.value;
          const optionId = `${idBase}-${name}-${option.value}`;
          return (
            <label
              key={option.value}
              className={clsx(
                'flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition-colors duration-base max-sm:min-h-[44px]',
                'focus-within:outline-none focus-within:ring-2 focus-within:ring-focus-ring focus-within:ring-offset-2',
                checked
                  ? 'border-accent bg-accent/10'
                  : 'border-border bg-surface hover:border-border-strong',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onSelect(option.value)}
                aria-labelledby={`${optionId}-label`}
                aria-describedby={`${optionId}-desc`}
                // Explicit size + resets: the global base rule
                // `input { @apply w-full … }` (index.css) would
                // otherwise stretch this radio to the card width.
                className="mt-1 h-4 w-4 shrink-0 border-0 bg-transparent p-0"
                disabled={disabled}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span id={`${optionId}-label`} className="text-sm font-medium text-text">
                    {option.label}
                  </span>
                  {checked && (
                    <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-accent">
                      <CheckCircle2 aria-hidden size={14} data-icon="selected" />
                      Selected
                    </span>
                  )}
                </span>
                <span id={`${optionId}-desc`} className="mt-0.5 block text-xs text-text-muted">
                  {option.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p id={errorId} className="text-body-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export default PresetRadioGroup;
