import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/widgets/layout/ui/Layout';
import { HomePage } from '@/pages/home/ui/HomePage';
import { LoginPage } from '@/pages/login/ui/LoginPage';
import { RegisterPage } from '@/pages/register/ui/RegisterPage';
import { DashboardPage } from '@/pages/dashboard/ui/DashboardPage';
import { SemestersPage } from '@/pages/semesters/ui/SemestersPage';
import { CoursesPage } from '@/pages/courses/ui/CoursesPage';
import { AssignmentsPage } from '@/pages/assignments/ui/AssignmentsPage';
import { FocusPage } from '@/pages/focus/ui/FocusPage';
import { StudyHistoryPage } from '@/pages/focus/history/ui/StudyHistoryPage';
import { CalendarPage } from '@/pages/calendar/ui/CalendarPage';
import { PlanPage } from '@/pages/plan/ui/PlanPage';
import { PlanHealthPage } from '@/pages/plan-health/ui/PlanHealthPage';
import { PlanHealthView } from '@/features/plan-health/ui/PlanHealthView';
import { CatchUpPreview } from '@/features/catch-up/ui/CatchUpPreview';
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
          {/* SP-122B: assignments list page (search, filters, sort) */}
          <Route path="/assignments" element={<AssignmentsPage />} />
          {/* EP07D: focus-mode interface and timer controls */}
          <Route path="/focus" element={<FocusPage />} />
          {/* EP07E: study history surface */}
          <Route path="/focus/history" element={<StudyHistoryPage />} />
          {/* SP-127B: weekly academic calendar */}
          <Route path="/calendar" element={<CalendarPage />} />
          {/* EP15I (D-I1): the old availability page is retired — bookmarks
              and muscle memory land on the calendar, which owns the editor. */}
          <Route path="/availability" element={<Navigate to="/calendar" replace />} />
          <Route path="/plan" element={<PlanPage />} />
          {/* EP13E (D-E1): the informational plan-health view and, nested
              under it, EP08E's regeneration preview/edit/confirm/decline
              surface (deep-linking /plan/health/catch-up self-fetches). */}
          <Route path="/plan/health" element={<PlanHealthPage />}>
            <Route index element={<PlanHealthView />} />
            <Route path="catch-up" element={<CatchUpPreview />} />
          </Route>
          {/* EP13E (D-E2): EP08's standalone catch-up entry is folded into
              plan health. The old paths keep working for bookmarks and
              `replace` keeps Back from bouncing between old and new. */}
          <Route path="/catch-up" element={<Navigate to="/plan/health" replace />} />
          <Route
            path="/catch-up/preview"
            element={<Navigate to="/plan/health/catch-up" replace />}
          />
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
