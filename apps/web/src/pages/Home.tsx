import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { useAuth } from '../context/AuthContext';

export function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-secondary-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-secondary-900 mb-6">
            Take Control of Your Studies
          </h1>
          <p className="text-xl text-secondary-600 mb-8 max-w-2xl mx-auto">
            StudyPilot helps students with ADHD stay organized, manage deadlines,
            and build effective study habits with personalized planning tools.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button size="lg">Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/register">
                  <Button size="lg" variant="primary">
                    Get Started Free
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline">
                    Sign In
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Feature cards */}
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          {[
            {
              title: 'Organize Your Courses',
              description: 'Keep track of all your courses, assignments, and deadlines in one place.',
              icon: '📚',
            },
            {
              title: 'Smart Scheduling',
              description: 'Let StudyPilot help you create optimal study plans based on your availability.',
              icon: '📅',
            },
            {
              title: 'Stay Focused',
              description: 'Track your study sessions and build consistent habits.',
              icon: '⏰',
            },
          ].map((feature, index) => (
            <div
              key={index}
              className="card hover:shadow-lg transition-shadow"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-secondary-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
