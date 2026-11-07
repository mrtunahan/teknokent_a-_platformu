import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth';

/** Oturum ve rol kapısı: firma ekranları firma kullanıcılarına, panel teknokent yöneticilerine açıktır. */
export function RequireAuth({ children, panel, company }: { children: ReactNode; panel?: boolean; company?: boolean }) {
  const auth = useAuth();
  const location = useLocation();
  if (auth.loading)
    return (
      <div className="grid min-h-[60vh] place-items-center" role="status" aria-label="Yükleniyor">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-electric-400" />
      </div>
    );
  if (!auth.user) return <Navigate to="/giris" state={{ from: location.pathname + location.search }} replace />;
  if (panel && !auth.isPanelUser) return <Navigate to="/app" replace />;
  if (company && !auth.isCompanyUser) return <Navigate to="/app/panel" replace />;
  return <>{children}</>;
}
