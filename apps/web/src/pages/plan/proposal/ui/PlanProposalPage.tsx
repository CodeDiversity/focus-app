import { useEffect } from 'react';
import { PlanProposal, PROPOSAL_TITLE } from '@/features/plan-proposal/ui/PlanProposal';

/** EP16C (D-C1, A-C1) — the `/plan/proposal` route: container + title. */
export function PlanProposalPage() {
  useEffect(() => {
    document.title = `${PROPOSAL_TITLE} — StudyPilot`;
  }, []);
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <PlanProposal />
    </div>
  );
}

export default PlanProposalPage;
