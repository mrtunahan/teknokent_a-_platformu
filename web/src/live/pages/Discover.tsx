import { Clock } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ButtonLink, EmptyState } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { Directory, type DirItem, type DirStatus } from '@/components/discover/Directory';
import { api, type ApiError } from '../api';
import { useAuth } from '../auth';
import { useLoad } from '../hooks';
import { useLive } from '../LiveShell';
import { CompanySheet } from '../CompanySheet';
import type { Card } from '../types';
import { Alert, cardToCompany } from '../ui';

/** GET /companies yanıtındaki firma: kart + açıklama + ilgi/eşleşme durumu */
type DirCompany = Card & { description?: string; website?: string; foundedYear?: number; technologies?: { id: string; name: string }[]; status: DirStatus; matchId: string | null };

/** Canlı keşif: onaylı firmaların listesi (GET /companies); ilgi ve gizleme POST /swipes ile kaydedilir. */
export default function LiveDiscover() {
  const auth = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const { reloadMatches } = useLive();
  const dir = useLoad(() => (auth.approved ? api.get<{ companies: DirCompany[] }>('/companies') : Promise.resolve(null)), [auth.approved]);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);

  const items = useMemo<DirItem[]>(
    () =>
      (dir.data?.companies ?? []).map((c) => ({
        company: cardToCompany(c),
        score: c.matchPercent,
        reasons: c.reasons,
        status: c.status,
        matchId: c.matchId,
      })),
    [dir.data],
  );

  const patch = useCallback(
    (id: string, fn: (c: DirCompany) => DirCompany | null) =>
      dir.setData((d) => (d ? { companies: d.companies.map((c) => (String(c.id) === id ? fn(c) : c)).filter(Boolean) as DirCompany[] } : d)),
    [dir],
  );

  const send = useCallback(
    async (id: string, direction: 'right' | 'left') => {
      const c = dir.data?.companies.find((x) => String(x.id) === id);
      setBusy((s) => new Set(s).add(id));
      try {
        const r = await api.post<{ matched: boolean; matchId: string | null }>('/swipes', { targetCompanyId: id, direction });
        if (direction === 'left') {
          patch(id, () => null);
          toast({ title: `${c?.name ?? 'Firma'} gizlendi`, body: 'Bir süre listenizde görünmeyecek.', tone: 'info' });
        } else if (r.matched && r.matchId) {
          patch(id, (x) => ({ ...x, status: 'matched', matchId: r.matchId }));
          void reloadMatches();
          toast({ title: `Eşleştiniz: ${c?.name ?? ''} 🎉`, body: 'Karşılıklı ilgi oluştu, iletişim kanalı açıldı.', action: { label: 'Mesaj gönder', onClick: () => navigate(`/app/messages/${r.matchId}`) } });
        } else {
          patch(id, (x) => ({ ...x, status: 'interested' }));
          toast({ title: 'İlgi gönderildi', body: `${c?.name ?? 'Firma'} da ilgilenirse eşleşeceksiniz.` });
        }
      } catch (e) {
        const err = e as ApiError;
        // 409: zaten ilgi gösterilmiş → durumu güncelle
        if (err.status === 409 && direction === 'right') patch(id, (x) => ({ ...x, status: 'interested' }));
        toast({ title: err.message, tone: 'warning' });
      } finally {
        setBusy((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        });
      }
    },
    [dir.data, patch, reloadMatches, toast, navigate],
  );

  if (!auth.approved) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          icon={<Clock className="h-6 w-6" />}
          title="Firma listesi onaydan sonra açılacak"
          description="Teknokent yönetimi firmanızı onayladığında diğer firmaları burada listeleyebilirsiniz. Bu sürede profilinizi güçlendirin: net “arıyorum” maddeleri daha iyi eşleşme demek."
          action={<ButtonLink to="/app/profile">Profilimi tamamla</ButtonLink>}
        />
      </div>
    );
  }

  const detailStatus = detailId ? items.find((i) => i.company.id === detailId)?.status : undefined;

  return (
    <>
      {dir.error && (
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          <Alert error={dir.error} />
        </div>
      )}
      <Directory
        items={items}
        loading={dir.loading}
        initialQuery={params.get('q') ?? ''}
        busyIds={busy}
        onInterest={(id) => void send(id, 'right')}
        onHide={(id) => void send(id, 'left')}
        onOpen={setDetailId}
        onMessage={(matchId) => navigate(`/app/messages/${matchId}`)}
      />
      <CompanySheet
        companyId={detailId}
        onClose={() => setDetailId(null)}
        onBlocked={(id) => patch(id, () => null)}
        onLike={detailId && detailStatus === 'none' ? () => { const id = detailId; setDetailId(null); void send(id, 'right'); } : undefined}
        onPass={detailId && detailStatus === 'none' ? () => { const id = detailId; setDetailId(null); void send(id, 'left'); } : undefined}
      />
    </>
  );
}
