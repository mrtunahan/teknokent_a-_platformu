import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { AppStoreProvider } from '@/store/AppStore';
import { ToastProvider } from '@/components/ui/Toast';
import { AppShell } from '@/components/layout/AppShell';
import Landing from '@/pages/Landing';

// Uygulama ekranları ayrı parçalara bölünür; landing ilk yüklemede hafif kalır.
const Onboarding = lazy(() => import('@/pages/Onboarding'));
const Kvkk = lazy(() => import('@/pages/Kvkk'));
const Overview = lazy(() => import('@/pages/Overview'));
const Discover = lazy(() => import('@/pages/Discover'));
const Messages = lazy(() => import('@/pages/Messages'));
const Profile = lazy(() => import('@/pages/Profile'));
const ProfileEdit = lazy(() => import('@/pages/Profile').then((m) => ({ default: m.ProfileEdit })));
const Settings = lazy(() => import('@/pages/Settings'));
const Matches = lazy(() => import('@/pages/Lists').then((m) => ({ default: m.Matches })));
const Favorites = lazy(() => import('@/pages/Lists').then((m) => ({ default: m.Favorites })));
const Notifications = lazy(() => import('@/pages/Lists').then((m) => ({ default: m.Notifications })));

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
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-electric-400" />
    </div>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AppStoreProvider>
        <ToastProvider>
          <BrowserRouter>
            <ScrollManager />
            <Suspense fallback={<Loader />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/kayit" element={<Onboarding />} />
                <Route path="/kvkk" element={<Kvkk />} />
                <Route path="/app" element={<AppShell />}>
                  <Route index element={<Suspense fallback={<Loader />}><Overview /></Suspense>} />
                  <Route path="discover" element={<Suspense fallback={<Loader />}><Discover /></Suspense>} />
                  <Route path="matches" element={<Suspense fallback={<Loader />}><Matches /></Suspense>} />
                  <Route path="messages" element={<Suspense fallback={<Loader />}><Messages /></Suspense>} />
                  <Route path="messages/:matchId" element={<Suspense fallback={<Loader />}><Messages /></Suspense>} />
                  <Route path="favorites" element={<Suspense fallback={<Loader />}><Favorites /></Suspense>} />
                  <Route path="notifications" element={<Suspense fallback={<Loader />}><Notifications /></Suspense>} />
                  <Route path="profile" element={<Suspense fallback={<Loader />}><Profile /></Suspense>} />
                  <Route path="profile/edit" element={<Suspense fallback={<Loader />}><ProfileEdit /></Suspense>} />
                  <Route path="settings" element={<Suspense fallback={<Loader />}><Settings /></Suspense>} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </AppStoreProvider>
    </MotionConfig>
  );
}
