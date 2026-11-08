import { Clock, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ButtonLink, EmptyState } from '@/components/ui';
import { useAuth } from './auth';

/** Oturum ve rol kapısı: firma ekranları firma kullanıcılarına, panel teknokent yöneticilerine açıktır. */
export function RequireAuth({ children, panel, company }: { children: ReactNode; panel?: boolean; company?: boolean }) {
  const auth = useAuth();
  const location = useLocation();
  if (auth.loading)
    return (
      <div className="grid min-h-[60vh] place-items-center" role="status" aria-label="Yükleniyor">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-electric-400" />
      </div>
    );
  if (!auth.user) return <Navigate to="/giris" state={{ from: location.pathname + location.search }} replace />;
  if (panel && !auth.isPanelUser) return <Navigate to="/app" replace />;
  if (company && !auth.isCompanyUser) return <Navigate to="/app/panel" replace />;
  return <>{children}</>;
}

/** Keşif, eşleşme ve mesajlaşma yalnızca teknokent onaylı firmalara açıktır. */
export function RequireApproved({ children }: { children: ReactNode }) {
  const auth = useAuth();
  if (auth.approved) return <>{children}</>;
  const rejected = auth.company?.verification?.status === 'rejected';
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <EmptyState
        icon={rejected ? <XCircle className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
        title={rejected ? 'Firma başvurunuz onaylanmadı' : 'Bu bölüm teknokent onayından sonra açılır'}
        description={
          rejected
            ? `${auth.company?.verification?.note ? `Not: ${auth.company.verification.note}. ` : ''}Bilgilerinizi güncelleyip teknokent yönetimiyle iletişime geçebilirsiniz.`
            : 'Teknokent yönetimi firmanızı onayladığında firmaları keşfedebilir, eşleşip mesajlaşabilirsiniz. Bu sürede profilinizi tamamlayın: net “arıyorum” maddeleri daha iyi eşleşme demek.'
        }
        action={<ButtonLink to="/app/profile">Profilimi tamamla</ButtonLink>}
      />
    </div>
  );
}
