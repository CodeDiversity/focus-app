import { Outlet } from 'react-router-dom';

/**
 * The `/catch-up` layout (EP08E decision 2): a plain container with the
 * nested views in its `<Outlet/>` — the index route renders the recovery
 * summary (EP08D, untouched) and `preview` renders the catch-up preview/edit/
 * confirm/decline surface. The layout deliberately carries **no**
 * `aria-labelledby`: the labelled section ids live inside the views, and one
 * id here would dangle on the other route.
 */
export function CatchUpPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Outlet />
    </div>
  );
}

export default CatchUpPage;
