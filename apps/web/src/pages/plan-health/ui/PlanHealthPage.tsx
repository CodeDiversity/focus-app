import { Outlet } from 'react-router-dom';

/**
 * The `/plan/health` layout (EP13E D-E1; EP08E's `/catch-up` container,
 * renamed and moved): a plain wrapper with the nested views in its
 * `<Outlet/>` — the index route renders the plan-health view and
 * `catch-up` renders the regeneration preview/edit/confirm/decline surface.
 *
 * The layout deliberately carries **no** `aria-labelledby`: the labelled
 * section ids live inside the views, and one id here would dangle on the
 * other route.
 */
export function PlanHealthPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Outlet />
    </div>
  );
}

export default PlanHealthPage;
