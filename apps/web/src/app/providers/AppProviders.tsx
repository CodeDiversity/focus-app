import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { AuthProvider } from '@/features/auth/model/AuthContext';
import { store } from '@/app/store/store';

/**
 * Top-level provider composition for the app shell.
 * Order (outermost → innermost) is the SP-103/SP-108E contract:
 * BrowserRouter → Redux Provider → AuthProvider.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter>
      <Provider store={store}>
        <AuthProvider>{children}</AuthProvider>
      </Provider>
    </BrowserRouter>
  );
}
