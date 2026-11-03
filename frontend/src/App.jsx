import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import Layout from './components/Layout';
import { Spinner } from './components/ui';
import {
  AcceptInvite, ForgotPassword, Login, Register, ResetPassword, VerifyEmail,
} from './pages/Auth';
import Feed from './pages/Feed';
import CompanyDetail from './pages/CompanyDetail';
import Matches from './pages/Matches';
import MatchDetail from './pages/MatchDetail';
import Profile from './pages/Profile';
import Panel from './pages/Panel';
import Account from './pages/Account';

function RequireAuth({ children, panel = false, company = false }) {
  const auth = useAuth();
  const loc = useLocation();
  if (auth.loading) return <Spinner />;
  if (!auth.user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (panel && !auth.isPanelUser) return <Navigate to="/" replace />;
  if (company && !auth.isCompanyUser) return <Navigate to="/" replace />;
  return children;
}

function Home() {
  const auth = useAuth();
  if (auth.loading) return <Spinner />;
  if (!auth.user) return <Navigate to="/login" replace />;
  return <Navigate to={auth.isPanelUser ? '/panel' : '/feed'} replace />;
}

function PublicOnly({ children }) {
  const auth = useAuth();
  if (auth.loading) return <Spinner />;
  return auth.user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Home />} />
        <Route path="/feed" element={<RequireAuth company><Feed /></RequireAuth>} />
        <Route path="/companies/:id" element={<RequireAuth company><CompanyDetail /></RequireAuth>} />
        <Route path="/matches" element={<RequireAuth company><Matches /></RequireAuth>} />
        <Route path="/matches/:id" element={<RequireAuth company><MatchDetail /></RequireAuth>} />
        <Route path="/matches/:id/outcome" element={<RequireAuth company><MatchDetail /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth company><Profile /></RequireAuth>} />
        <Route path="/panel" element={<RequireAuth panel><Panel /></RequireAuth>} />
        <Route path="/account" element={<Account />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
