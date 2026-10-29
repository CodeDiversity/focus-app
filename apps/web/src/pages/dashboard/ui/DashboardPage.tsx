import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/model/AuthContext';
import { Button } from '@/shared/ui/Button';

export function DashboardPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent motion-reduce:animate-none"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text">Dashboard</h1>
          <p className="text-text-muted mt-1">
            Welcome back, {user?.name || user?.email.split('@')[0]}!
          </p>
        </div>
        <Link to="/profile">
          <Button variant="outline">View Profile</Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="card">
          <h2 className="text-lg font-semibold text-text mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              Add New Assignment
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Create Study Plan
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Start Focus Session
            </Button>
          </div>
        </div>

        {/* Recent Assignments */}
        <div className="card md:col-span-2">
          <h2 className="text-lg font-semibold text-text mb-4">Recent Assignments</h2>
          <div className="text-center py-8 text-text-muted">
            <p>No assignments yet</p>
            <p className="text-sm mt-1">Add your first assignment to get started</p>
          </div>
        </div>

        {/* Study Stats */}
        <div className="card">
          <h2 className="text-lg font-semibold text-text mb-4">Study Stats</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-surface-muted rounded-lg">
              <p className="text-2xl font-bold text-accent">0</p>
              <p className="text-sm text-text-muted">Hours Studied</p>
            </div>
            <div className="text-center p-4 bg-surface-muted rounded-lg">
              <p className="text-2xl font-bold text-accent">0</p>
              <p className="text-sm text-text-muted">Tasks Completed</p>
            </div>
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="card md:col-span-2">
          <h2 className="text-lg font-semibold text-text mb-4">Upcoming Deadlines</h2>
          <div className="text-center py-8 text-text-muted">
            <p>No upcoming deadlines</p>
            <p className="text-sm mt-1">You&apos;re all caught up!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
