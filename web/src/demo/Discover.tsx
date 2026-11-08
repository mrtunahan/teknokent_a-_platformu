import { SlidersHorizontal, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { activeFilterCount, useStore } from '@/store/AppStore';
import { compatibility } from '@/lib/score';
import { Button } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { CompanyDetailSheet } from '@/components/discover/CompanyDetail';
import { Directory, type DirItem } from '@/components/discover/Directory';
import { FilterDrawer } from '@/components/discover/FilterDrawer';
import type { Company, Filters, Stage } from '@/types';

/** TRL (1-9) → ürün aşaması yaklaşık eşlemesi (demo verisinde TRL alanı yok) */
const TRL_STAGE: Record<number, Stage[]> = {
  1: ['idea'], 2: ['idea'], 3: ['idea', 'mvp'], 4: ['mvp'], 5: ['mvp', 'first_customer'], 6: ['first_customer'], 7: ['first_customer', 'growth'], 8: ['growth', 'mature'], 9: ['mature'],
};

/** Gelişmiş filtre çekmecesindeki kriterler */
function matchesFilters(c: Company, f: Filters) {
  if (f.sectors.length && !f.sectors.includes(c.sector)) return false;
  if (f.expertise.length && !c.expertise.some((e) => f.expertise.includes(e))) return false;
  if (f.cities.length && !f.cities.includes(c.city)) return false;
  if (f.technoparks.length && !f.technoparks.includes(c.technopark)) return false;
  if (f.sizes.length && !f.sizes.includes(c.employeeRange)) return false;
  if (f.collaborationTypes.length && !c.collaborationTypes.some((t) => f.collaborationTypes.includes(t))) return false;
  if (f.investmentNeed === 'needs' && c.investmentNeed === 'none') return false;
  if (f.investmentNeed === 'none' && c.investmentNeed !== 'none') return false;
  if (f.projectPartnership && !c.seekingProjectPartner) return false;
  if (f.rndCapable && !c.hasRndCenter) return false;
  if (f.exportFocused && !c.exportFocused) return false;
  return true;
}

export default function Discover() {
  const { state, dispatch, swipe, companyById } = useStore();
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const trl = Number(params.get('trl')) || 0;
  const [filtersOpen, setFiltersOpen] = useState(params.get('filters') === '1');
  const [detailId, setDetailId] = useState<string | null>(null);
  const advanced = activeFilterCount(state.filters);

  const items = useMemo<DirItem[]>(
    () =>
      state.companies
        .filter((c) => !state.blocked.includes(c.id) && state.swipes[c.id] !== 'left')
        .filter((c) => matchesFilters(c, state.filters) && (!trl || TRL_STAGE[trl]!.includes(c.stage)))
        .map((c) => {
          const m = state.matches.find((x) => x.companyId === c.id);
          const { score, reasons } = compatibility(state.me, c);
          return { company: c, score, reasons, status: m ? 'matched' : state.swipes[c.id] ? 'interested' : 'none', matchId: m?.id ?? null, favorite: state.favorites.includes(c.id) };
        }),
    [state.companies, state.blocked, state.swipes, state.matches, state.filters, state.favorites, state.me, trl],
  );

  const interest = useCallback(
    async (id: string) => {
      const c = companyById(id)!;
      const m = await swipe(id, 'right');
      if (m) toast({ title: `Eşleştiniz: ${c.name} 🎉`, body: 'Karşılıklı ilgi oluştu, iletişim kanalı açıldı.', action: { label: 'Mesaj gönder', onClick: () => navigate(`/demo/messages/${m.id}`) } });
      else toast({ title: 'İlgi gönderildi', body: `${c.name} da ilgilenirse eşleşeceksiniz.` });
    },
    [swipe, companyById, toast, navigate],
  );

  const hide = useCallback(
    async (id: string) => {
      const c = companyById(id)!;
      await swipe(id, 'left');
      toast({ title: `${c.name} gizlendi`, tone: 'info', action: { label: 'Geri al', onClick: () => dispatch({ type: 'undo' }) } });
    },
    [swipe, companyById, toast, dispatch],
  );

  const detail = detailId ? companyById(detailId) ?? null : null;
  const detailScore = detail ? compatibility(state.me, detail) : undefined;
  const detailStatus = detail ? items.find((i) => i.company.id === detail.id)?.status : undefined;

  return (
    <>
      <Directory
        items={items}
        initialQuery={params.get('q') ?? ''}
        toolbarExtra={
          <Button variant="secondary" onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal className="h-4 w-4" /> Gelişmiş filtreler{advanced > 0 && ` (${advanced})`}
          </Button>
        }
        activeExtra={
          trl > 0 && (
            <button onClick={() => { params.delete('trl'); setParams(params, { replace: true }); }} className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
              TRL {trl} <X className="h-3 w-3" />
            </button>
          )
        }
        onInterest={interest}
        onHide={hide}
        onOpen={setDetailId}
        onMessage={(matchId) => navigate(`/demo/messages/${matchId}`)}
        onFavorite={(id) => dispatch({ type: 'toggleFavorite', id })}
      />
      <FilterDrawer
        open={filtersOpen}
        onClose={() => {
          setFiltersOpen(false);
          if (params.get('filters')) {
            params.delete('filters');
            setParams(params, { replace: true });
          }
        }}
      />
      <CompanyDetailSheet
        company={detail}
        open={!!detail}
        onClose={() => setDetailId(null)}
        score={detailScore?.score}
        reasons={detailScore?.reasons}
        onLike={detail && detailStatus === 'none' ? () => { setDetailId(null); void interest(detail.id); } : undefined}
        onPass={detail && detailStatus === 'none' ? () => { setDetailId(null); void hide(detail.id); } : undefined}
      />
    </>
  );
}
