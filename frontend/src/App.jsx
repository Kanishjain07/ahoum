import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout, { FocusLayout } from './components/Layout';
import { Button, PageLoader } from './components/ui';
import Icon from './components/Icon';
import { useAuth } from './lib/auth';
import AuthCallback from './pages/AuthCallback';
import Catalog from './pages/Catalog';
import CreatorDashboard from './pages/CreatorDashboard';
import Login from './pages/Login';
import MyBookings from './pages/MyBookings';
import Profile from './pages/Profile';
import SessionAttendees from './pages/SessionAttendees';
import SessionDetail from './pages/SessionDetail';
import SessionForm from './pages/SessionForm';
import Signup from './pages/Signup';
import Welcome from './pages/Welcome';

/** The 403 screen from the design, reused for "not signed in" and "not a creator". */
export function AccessDenied({
  title = 'Access denied',
  body,
  code = '403 Forbidden',
  actions,
}) {
  return (
    <div className="flex w-full max-w-md flex-col items-center py-2xl text-center">
      <div className="relative mb-xl flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-surface-container-high shadow-sm">
        <Icon name="lock" size={60} className="relative z-10 text-primary" />
        <div className="absolute -bottom-4 -right-4 h-16 w-16 rounded-full bg-secondary-container opacity-50" />
        <div className="absolute -left-2 -top-2 h-10 w-10 rounded-full bg-primary-container opacity-20" />
      </div>
      <h1 className="mb-sm text-headline-lg-mobile text-on-surface md:text-headline-lg">{title}</h1>
      <p className="mb-2xl max-w-sm text-body-lg text-on-surface-variant">{body}</p>
      <div className="flex w-full flex-col justify-center gap-md sm:flex-row">{actions}</div>
      <p className="mt-xl text-label-sm text-outline">Error code: {code}</p>
    </div>
  );
}

function RequireAuth({ children, creatorOnly = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Layout>
        <PageLoader />
      </Layout>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Signed in but never asked which kind of account they wanted.
  if (!user.role_chosen && location.pathname !== '/welcome') {
    return <Navigate to="/welcome" replace />;
  }

  if (creatorOnly && user.role !== 'creator') {
    return (
      <Layout>
        <div className="flex justify-center">
          <AccessDenied
            title="Creator access required"
            code="403 Forbidden"
            body="Publishing and managing live sessions is limited to Creator accounts."
            actions={
              <Button as={Link} to="/" icon="compass">
                Back to catalog
              </Button>
            }
          />
        </div>
      </Layout>
    );
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Catalog />} />
      <Route path="/sessions/:id" element={<SessionDetail />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/auth/callback/:provider" element={<AuthCallback />} />
      {/* Kept so an OAuth app still registered against the old single
          callback URL does not dead-end. */}
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route
        path="/welcome"
        element={
          <RequireAuth>
            <Welcome />
          </RequireAuth>
        }
      />

      <Route
        path="/bookings"
        element={
          <RequireAuth>
            <MyBookings />
          </RequireAuth>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <Profile />
          </RequireAuth>
        }
      />
      <Route
        path="/creator"
        element={
          <RequireAuth creatorOnly>
            <CreatorDashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/creator/sessions/new"
        element={
          <RequireAuth creatorOnly>
            <SessionForm />
          </RequireAuth>
        }
      />
      <Route
        path="/creator/sessions/:id/edit"
        element={
          <RequireAuth creatorOnly>
            <SessionForm />
          </RequireAuth>
        }
      />
      <Route
        path="/creator/sessions/:id/attendees"
        element={
          <RequireAuth creatorOnly>
            <SessionAttendees />
          </RequireAuth>
        }
      />

      <Route
        path="*"
        element={
          <FocusLayout>
            <AccessDenied
              title="Page not found"
              code="404 Not Found"
              body="That page does not exist. It may have been moved, or the link may be out of date."
              actions={
                <Button as={Link} to="/" icon="compass">
                  Back to catalog
                </Button>
              }
            />
          </FocusLayout>
        }
      />
    </Routes>
  );
}
