import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/shared/ui/Button';

export function Header() {
  const { isAuthenticated, logout, user } = useAuth();
  const location = useLocation();

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap justify-between items-center gap-3 min-h-16 py-3">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-xl font-semibold text-secondary-900">StudyPilot</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/" className={location.pathname === '/' ? 'text-primary-600 font-medium' : ''}>
              Home
            </Link>
            {isAuthenticated && (
              <>
                <Link to="/dashboard" className={location.pathname === '/dashboard' ? 'text-primary-600 font-medium' : ''}>
                  Dashboard
                </Link>
                <Link to="/profile" className={location.pathname === '/profile' ? 'text-primary-600 font-medium' : ''}>
                  Profile
                </Link>
              </>
            )}
          </nav>

          {/* Auth buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {isAuthenticated ? (
              <>
                <span className="hidden md:inline text-sm text-secondary-600">
                  Welcome, {user?.name || user?.email.split('@')[0]}
                </span>
                <Link to="/verify-email" className="text-sm underline rounded focus-visible:ring-2">Email verification</Link>
                <Button variant="outline" onClick={logout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline">Login</Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
