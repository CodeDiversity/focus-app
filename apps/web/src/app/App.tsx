import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/widgets/layout/ui/Layout';
import { HomePage } from '@/pages/home/ui/HomePage';
import { LoginPage } from '@/pages/login/ui/LoginPage';
import { RegisterPage } from '@/pages/register/ui/RegisterPage';
import { DashboardPage } from '@/pages/dashboard/ui/DashboardPage';
import { SemestersPage } from '@/pages/semesters/ui/SemestersPage';
import { CoursesPage } from '@/pages/courses/ui/CoursesPage';
import { CourseDetailPage } from '@/pages/courses/ui/CourseDetailPage';
import { ProfilePage } from '@/pages/profile/ui/ProfilePage';
import { OnboardingPage } from '@/pages/onboarding/ui/OnboardingPage';
import { VerifyEmailPage } from '@/pages/verify-email/ui/VerifyEmailPage';
import { ForgotPasswordPage } from '@/pages/forgot-password/ui/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/reset-password/ui/ResetPasswordPage';
import { ProtectedRoute } from '@/widgets/protected-route/ui/ProtectedRoute';
import { PublicRoute } from '@/widgets/public-route/ui/PublicRoute';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Public routes */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          {/* SP-110B: semester management page (D110-4: inside ProtectedRoute,
              rendered within the standard Layout like all existing pages) */}
          <Route path="/semesters" element={<SemestersPage />} />
          {/* SP-111B: course management page (mirrors the semesters pattern:
              inside ProtectedRoute, rendered within the standard Layout) */}
          <Route path="/courses" element={<CoursesPage />} />
          {/* SP-112B: course detail page (meetings + assignments) — inside
              ProtectedRoute like the list, rendered within the standard Layout */}
          <Route path="/courses/:id" element={<CourseDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          {/* SP-107C: onboarding wizard (D107-3: inside ProtectedRoute,
              rendered within the standard Layout like all existing pages) */}
          <Route path="/onboarding" element={<OnboardingPage />} />
        </Route>

        {/* Redirects */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
