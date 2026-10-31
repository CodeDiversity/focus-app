import { RecoverySummary } from '@/features/recovery/ui/RecoverySummary';

export function CatchUpPage() {
  return (
    <section
      aria-labelledby="catch-up-heading"
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
    >
      <RecoverySummary />
    </section>
  );
}

export default CatchUpPage;
