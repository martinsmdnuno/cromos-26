import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { LangProvider } from './i18n/LangContext';
import { Layout } from './components/Layout';
import { Onboarding } from './pages/Onboarding';
import { Collection } from './pages/Collection';
import { Groups } from './pages/Groups';
import { GroupDetail } from './pages/GroupDetail';
import { Trades } from './pages/Trades';
import { Stats } from './pages/Stats';
import { Legal } from './pages/Legal';
import { Profile } from './pages/Profile';
import { Admin } from './pages/Admin';

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
    return (
      <div className="min-h-full flex items-center justify-center bg-panini-cream">
        <div className="num-display text-6xl tracking-tight">
          <span className="text-panini-red">2</span>
          <span className="text-panini-blue">6</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        {/* Legal pages are public — they are linked from the onboarding screen and
            crawlers (Google, Apple) need to fetch them without an account. */}
        <Route path="/legal/terms" element={<Legal kind="terms" />} />
        <Route path="/legal/privacy" element={<Legal kind="privacy" />} />
        <Route path="*" element={<Onboarding />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/collection" replace />} />
        <Route path="/collection" element={<Collection />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/groups/:id" element={<GroupDetail />} />
        <Route path="/trades" element={<Trades />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/legal/terms" element={<Legal kind="terms" />} />
        <Route path="/legal/privacy" element={<Legal kind="privacy" />} />
        <Route path="*" element={<Navigate to="/collection" replace />} />
      </Route>
    </Routes>
  );
}
