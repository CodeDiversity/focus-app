import { extendTailwindMerge } from 'tailwind-merge';

// Tailwind-merge does not know about StudyPilot's custom typography scale
// (text-body, text-body-sm, text-caption, text-h1, ...), so it treats those
// classes as text-color utilities and drops the real text-color class
// (text-white, text-text, text-accent, ...) whenever a font-size utility is
// merged in. That made buttons/badges/inputs inherit their text color and
// become invisible on colored backgrounds. Register the custom font-size
// keys so tailwind-merge keeps color and size utilities separate.
export const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['display', 'h1', 'h2', 'h3', 'body', 'body-sm', 'caption'] }],
    },
  },
});

export default twMerge;
