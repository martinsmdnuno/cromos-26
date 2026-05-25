import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { LangProvider } from './i18n/LangContext';
import { Layout } from './components/Layout';
// Onboarding is the logged-out landing screen — kept eager so the first paint
// for new visitors needs no extra round-trip. Every authenticated page below is
// split into its own chunk and loaded on demand (Suspense lives in Layout).
import { Onboarding } from './pages/Onboarding';

const Collection = lazy(() => import('./pages/Collection').then((m) => ({ default: m.Collection })));
const Groups = lazy(() => import('./pages/Groups').then((m) => ({ default: m.Groups })));
const GroupDetail = lazy(() => import('./pages/GroupDetail').then((m) => ({ default: m.GroupDetail })));
const Trades = lazy(() => import('./pages/Trades').then((m) => ({ default: m.Trades })));
const Stats = lazy(() => import('./pages/Stats').then((m) => ({ default: m.Stats })));
const Legal = lazy(() => import('./pages/Legal').then((m) => ({ default: m.Legal })));
const Profile = lazy(() => import('./pages/Profile').then((m) => ({ default: m.Profile })));
const Admin = lazy(() => import('./pages/Admin').then((m) => ({ default: m.Admin })));
const History = lazy(() => import('./pages/History').then((m) => ({ default: m.History })));

export function App() {
  return (
    <LangProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </LangProvider>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullScreenLoader />;
  }

  if (!user) {
    return (
      <Suspense fallback={<FullScreenLoader />}>
        <Routes>
          {/* Legal pages are public — they are linked from the onboarding screen and
              crawlers (Google, Apple) need to fetch them without an account. */}
          <Route path="/legal/terms" element={<Legal kind="terms" />} />
          <Route path="/legal/privacy" element={<Legal kind="privacy" />} />
          <Route path="*" element={<Onboarding />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/collection" replace />} />
        <Route path="/collection" element={<Collection />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/groups/:id" element={<GroupDetail />} />
        {/* Deep-link from a shared WhatsApp invite — auto-opens the join modal pre-filled. */}
        <Route path="/join/:code" element={<Groups />} />
        <Route path="/trades" element={<Trades />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/history" element={<History />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/legal/terms" element={<Legal kind="terms" />} />
        <Route path="/legal/privacy" element={<Legal kind="privacy" />} />
        <Route path="*" element={<Navigate to="/collection" replace />} />
      </Route>
    </Routes>
  );
}

/** Full-viewport "26" loader — shown while auth resolves and as the Suspense
 *  fallback for the logged-out (pre-Layout) routes. */
function FullScreenLoader() {
  return (
    <div className="min-h-full flex items-center justify-center bg-panini-cream">
      <div className="num-display text-6xl tracking-tight">
        <span className="text-panini-red">2</span>
        <span className="text-panini-blue">6</span>
      </div>
    </div>
  );
}
