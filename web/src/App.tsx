import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { AppStoreProvider } from '@/store/AppStore';
import { ToastProvider } from '@/components/ui/Toast';
import { AppShell } from '@/components/layout/AppShell';
import { AuthProvider, homeFor, useAuth } from '@/live/auth';
import { RequireApproved, RequireAuth } from '@/live/RequireAuth';
import Landing from '@/pages/Landing';

const lazyNamed = <T extends Record<string, unknown>>(f: () => Promise<T>, name: keyof T) => lazy(() => f().then((m) => ({ default: m[name] as React.ComponentType })));

// Kimlik doğrulama
const auth = () => import('@/live/pages/AuthPages');
const Login = lazyNamed(auth, 'Login');
const Register = lazyNamed(auth, 'Register');
const VerifyEmail = lazyNamed(auth, 'VerifyEmail');
const ForgotPassword = lazyNamed(auth, 'ForgotPassword');
const ResetPassword = lazyNamed(auth, 'ResetPassword');
const AcceptInvite = lazyNamed(auth, 'AcceptInvite');
const Kvkk = lazy(() => import('@/pages/Kvkk'));

// Canlı uygulama (API)
const LiveShell = lazy(() => import('@/live/LiveShell'));
const LiveOverview = lazy(() => import('@/live/pages/Overview'));
const LiveDiscover = lazy(() => import('@/live/pages/Discover'));
const LiveMatches = lazy(() => import('@/live/pages/Matches'));
const LiveMessages = lazy(() => import('@/live/pages/Messages'));
const LiveProfile = lazy(() => import('@/live/pages/Profile'));
const LiveAccount = lazy(() => import('@/live/pages/Account'));
const Panel = lazy(() => import('@/live/pages/Panel'));

// Demo (yerel örnek veri)
const DemoOnboarding = lazy(() => import('@/demo/Onboarding'));
const DemoOverview = lazy(() => import('@/demo/Overview'));
const DemoDiscover = lazy(() => import('@/demo/Discover'));
const DemoMessages = lazy(() => import('@/demo/Messages'));
const DemoProfile = lazy(() => import('@/demo/Profile'));
const DemoProfileEdit = lazyNamed(() => import('@/demo/Profile'), 'ProfileEdit');
const DemoSettings = lazy(() => import('@/demo/Settings'));
const DemoMatches = lazyNamed(() => import('@/demo/Lists'), 'Matches');
const DemoFavorites = lazyNamed(() => import('@/demo/Lists'), 'Favorites');
const DemoNotifications = lazyNamed(() => import('@/demo/Lists'), 'Notifications');

/** Rota değişiminde başa kaydır; `#bölüm` varsa o bölüme kaydır. */
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 60);
      return () => clearTimeout(t);
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

function Loader() {
  return (
    <div className="grid min-h-[60vh] place-items-center" role="status" aria-label="Yükleniyor">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-primary-500" />
    </div>
  );
}

const S = ({ children }: { children: ReactNode }) => <Suspense fallback={<Loader />}>{children}</Suspense>;

/** Oturum açıkken giriş/kayıt sayfaları yerine uygulamaya yönlendir. */
function PublicOnly({ children }: { children: ReactNode }) {
  const a = useAuth();
  if (a.loading) return <Loader />;
  return a.user ? <Navigate to={homeFor(a)} replace /> : <>{children}</>;
}

/** /app: panel kullanıcıları panele, firma kullanıcıları genel bakışa */
function AppHome() {
  const a = useAuth();
  return a.isPanelUser ? <Navigate to="/app/panel" replace /> : <S><LiveOverview /></S>;
}

/** Eski arayüzün ve e-posta bağlantılarının adresleri (ör. /matches/:id/outcome) */
function LegacyMatch({ outcome }: { outcome?: boolean }) {
  const { id } = useParams();
  return <Navigate to={`/app/messages/${id}${outcome ? '?outcome=1' : ''}`} replace />;
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <AppStoreProvider>
          <ToastProvider>
            <BrowserRouter>
              <ScrollManager />
              <S>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/kvkk" element={<Kvkk />} />

                  {/* Kimlik doğrulama (e-posta bağlantıları bu adresleri kullanır) */}
                  <Route path="/giris" element={<PublicOnly><Login /></PublicOnly>} />
                  <Route path="/kayit" element={<PublicOnly><Register /></PublicOnly>} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/accept-invite" element={<AcceptInvite />} />

                  {/* Canlı uygulama */}
                  <Route path="/app" element={<RequireAuth><S><LiveShell /></S></RequireAuth>}>
                    <Route index element={<AppHome />} />
                    <Route path="discover" element={<RequireAuth company><S><LiveDiscover /></S></RequireAuth>} />
                    <Route path="matches" element={<RequireAuth company><RequireApproved><S><LiveMatches /></S></RequireApproved></RequireAuth>} />
                    <Route path="messages" element={<RequireAuth company><RequireApproved><S><LiveMessages /></S></RequireApproved></RequireAuth>} />
                    <Route path="messages/:matchId" element={<RequireAuth company><RequireApproved><S><LiveMessages /></S></RequireApproved></RequireAuth>} />
                    <Route path="profile" element={<RequireAuth company><S><LiveProfile /></S></RequireAuth>} />
                    <Route path="account" element={<S><LiveAccount /></S>} />
                    <Route path="panel" element={<RequireAuth panel><S><Panel /></S></RequireAuth>} />
                  </Route>

                  {/* Demo */}
                  <Route path="/demo/kayit" element={<DemoOnboarding />} />
                  <Route path="/demo" element={<AppShell />}>
                    <Route index element={<S><DemoOverview /></S>} />
                    <Route path="discover" element={<S><DemoDiscover /></S>} />
                    <Route path="matches" element={<S><DemoMatches /></S>} />
                    <Route path="messages" element={<S><DemoMessages /></S>} />
                    <Route path="messages/:matchId" element={<S><DemoMessages /></S>} />
                    <Route path="favorites" element={<S><DemoFavorites /></S>} />
                    <Route path="notifications" element={<S><DemoNotifications /></S>} />
                    <Route path="profile" element={<S><DemoProfile /></S>} />
                    <Route path="profile/edit" element={<S><DemoProfileEdit /></S>} />
                    <Route path="settings" element={<S><DemoSettings /></S>} />
                  </Route>

                  {/* Eski adresler */}
                  <Route path="/login" element={<Navigate to="/giris" replace />} />
                  <Route path="/register" element={<Navigate to="/kayit" replace />} />
                  <Route path="/feed" element={<Navigate to="/app/discover" replace />} />
                  <Route path="/matches" element={<Navigate to="/app/matches" replace />} />
                  <Route path="/matches/:id" element={<LegacyMatch />} />
                  <Route path="/matches/:id/outcome" element={<LegacyMatch outcome />} />
                  <Route path="/profile" element={<Navigate to="/app/profile" replace />} />
                  <Route path="/panel" element={<Navigate to="/app/panel" replace />} />
                  <Route path="/account" element={<Navigate to="/app/account" replace />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </S>
            </BrowserRouter>
          </ToastProvider>
        </AppStoreProvider>
      </AuthProvider>
    </MotionConfig>
  );
}
