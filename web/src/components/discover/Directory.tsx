import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpDown,
  Bookmark,
  Check,
  EyeOff,
  FlaskConical,
  Handshake,
  Info,
  LayoutGrid,
  List,
  MapPin,
  MessageCircle,
  Package,
  Search,
  Sparkles,
  Truck,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { label } from '@/data/options';
import { cn } from '@/lib/utils';
import { Button, CompanyLogo, EmptyState, VerifiedBadge } from '@/components/ui';
import type { CollaborationType, Company } from '@/types';

export type DirStatus = 'none' | 'interested' | 'matched';

export interface DirItem {
  company: Company;
  /** Uyum skoru 0-100 (hesaplanmadıysa null) */
  score: number | null;
  reasons: string[];
  status: DirStatus;
  matchId?: string | null;
  favorite?: boolean;
}

/** Üstteki 4 hızlı erişim kutucuğu: iş birliği türleri */
const TILES: { type: CollaborationType; title: string; text: string; icon: typeof FlaskConical }[] = [
  { type: 'joint_rnd', title: 'Ortak Ar‑Ge', text: 'Birlikte araştırma ve geliştirme', icon: FlaskConical },
  { type: 'joint_product', title: 'Ortak Ürün', text: 'Birlikte ürün geliştirme', icon: Package },
  { type: 'project_subcontractor', title: 'Proje Ortaklığı', text: 'TÜBİTAK, KOSGEB, AB projeleri', icon: Handshake },
  { type: 'supply_distribution', title: 'Tedarik & Distribütörlük', text: 'Tedarik zinciri ve satış ağı', icon: Truck },
];

type Sort = 'score' | 'name' | 'newest';
type View = 'grid' | 'list';
const PAGE = 24;

const norm = (s: string) => s.toLocaleLowerCase('tr');

interface Props {
  items: DirItem[];
  loading?: boolean;
  initialQuery?: string;
  /** Sayfa başlığının sağındaki ek düğmeler (ör. gelişmiş filtreler) */
  toolbarExtra?: ReactNode;
  /** Ek filtre açıklaması (ör. "TRL 5" çipi) */
  activeExtra?: ReactNode;
  busyIds?: Set<string>;
  onInterest: (id: string) => void;
  onHide: (id: string) => void;
  onOpen: (id: string) => void;
  onMessage: (matchId: string) => void;
  onFavorite?: (id: string) => void;
}

/** Liste tabanlı firma keşfi: iş birliği kutucukları, faaliyet alanı filtresi, arama, sıralama, ızgara/liste görünümü. */
export function Directory({ items, loading, initialQuery = '', toolbarExtra, activeExtra, busyIds, onInterest, onHide, onOpen, onMessage, onFavorite }: Props) {
  const [q, setQ] = useState(initialQuery);
  const [collab, setCollab] = useState<CollaborationType | null>(null);
  const [sector, setSector] = useState<string | null>(null);
  const [city, setCity] = useState('');
  const [status, setStatus] = useState<'all' | DirStatus>('all');
  const [sort, setSort] = useState<Sort>('score');
  const [view, setView] = useState<View>('grid');
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => setQ(initialQuery), [initialQuery]);
  useEffect(() => setLimit(PAGE), [q, collab, sector, city, status, sort]);

  const tileCounts = useMemo(() => Object.fromEntries(TILES.map((t) => [t.type, items.filter((i) => i.company.collaborationTypes.includes(t.type)).length])), [items]);

  // Faaliyet alanı çipleri: kutucuk seçiliyse o türdeki firmaların sektörleri
  const sectors = useMemo(() => {
    const m = new Map<string, number>();
    items.filter((i) => !collab || i.company.collaborationTypes.includes(collab)).forEach((i) => m.set(i.company.sector, (m.get(i.company.sector) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'tr'));
  }, [items, collab]);
  const cities = useMemo(() => [...new Set(items.map((i) => i.company.city).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr')), [items]);

  const filtered = useMemo(() => {
    const list = items.filter((i) => {
      const c = i.company;
      if (collab && !c.collaborationTypes.includes(collab)) return false;
      if (sector && c.sector !== sector) return false;
      if (city && c.city !== city) return false;
      if (status !== 'all' && i.status !== status) return false;
      if (q && ![c.name, c.sector, c.description, c.tagline, c.technopark, ...c.expertise, ...c.products, ...c.offering, ...c.seeking].some((x) => x && norm(x).includes(norm(q)))) return false;
      return true;
    });
    return list.sort((a, b) =>
      sort === 'name' ? a.company.name.localeCompare(b.company.name, 'tr') : sort === 'newest' ? (b.company.foundedYear || 0) - (a.company.foundedYear || 0) : (b.score ?? -1) - (a.score ?? -1) || a.company.name.localeCompare(b.company.name, 'tr'),
    );
  }, [items, collab, sector, city, status, q, sort]);

  const activeCount = (collab ? 1 : 0) + (sector ? 1 : 0) + (city ? 1 : 0) + (status !== 'all' ? 1 : 0) + (q ? 1 : 0);
  const clear = () => {
    setCollab(null);
    setSector(null);
    setCity('');
    setStatus('all');
    setQ('');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Firmaları Keşfet</h1>
          <p className="mt-1 text-sm text-slate-500">İş birliği türüne ve faaliyet alanına göre filtreleyin, ilgilendiğiniz firmalara “İlgileniyorum” deyin.</p>
        </div>
        {toolbarExtra}
      </div>

      {/* 4 iş birliği kutucuğu */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {TILES.map((t) => {
          const on = collab === t.type;
          return (
            <button
              key={t.type}
              onClick={() => {
                setCollab(on ? null : t.type);
                setSector(null);
              }}
              aria-pressed={on}
              className={cn(
                'group flex items-center gap-2.5 rounded-2xl border p-3 text-left transition sm:gap-3 sm:p-4',
                on ? 'border-primary-400 bg-primary-50 shadow-glow' : 'border-slate-200 bg-white shadow-glass hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-card',
              )}
            >
              <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl transition sm:h-11 sm:w-11', on ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-primary-50 group-hover:text-primary-600')}>
                <t.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-bold leading-tight text-slate-900 sm:text-sm">{t.title}</span>
                <span className="hidden truncate text-xs text-slate-500 sm:block">{t.text}</span>
                <span className="mt-0.5 block text-xs font-semibold text-slate-500 sm:hidden">{tileCounts[t.type] ?? 0} firma</span>
              </span>
              <span className={cn('hidden shrink-0 rounded-full px-2 py-0.5 text-xs font-bold sm:inline-block', on ? 'bg-white text-primary-600' : 'bg-slate-100 text-slate-600')}>{tileCounts[t.type] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {/* Arama ve sıralama */}
      <div className="mt-5 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-glass md:flex-row md:items-center">
        <label className="relative flex flex-1 items-center">
          <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Firma, teknoloji veya ürün ara…" aria-label="Firma, teknoloji veya ürün ara" className="h-11 w-full rounded-xl bg-transparent pl-10 pr-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:bg-slate-50" />
          {q && (
            <button onClick={() => setQ('')} className="absolute right-2 rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Aramayı temizle">
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <select value={city} onChange={(e) => setCity(e.target.value)} aria-label="Şehir" className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none hover:border-slate-300">
            <option value="">Tüm şehirler</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Durum" className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none hover:border-slate-300">
            <option value="all">Tüm firmalar</option>
            <option value="none">Henüz ilgilenmediklerim</option>
            <option value="interested">İlgi gönderdiklerim</option>
            <option value="matched">Eşleştiklerim</option>
          </select>
          <label className="relative flex items-center">
            <ArrowUpDown className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sıralama" className="h-11 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-700 outline-none hover:border-slate-300">
              <option value="score">En uyumlu</option>
              <option value="name">A–Z</option>
              <option value="newest">En yeni kurulan</option>
            </select>
          </label>
          <div className="flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Görünüm">
            {(
              [
                ['grid', LayoutGrid, 'Izgara'],
                ['list', List, 'Liste'],
              ] as const
            ).map(([v, Icon, l]) => (
              <button key={v} onClick={() => setView(v)} aria-pressed={view === v} aria-label={l} title={l} className={cn('grid h-9 w-9 place-items-center rounded-lg transition', view === v ? 'bg-white text-slate-900 shadow-glass' : 'text-slate-500 hover:text-slate-900')}>
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Faaliyet alanı çipleri */}
      <div className="-mx-4 mt-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
          <button onClick={() => setSector(null)} className={cn('whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition', !sector ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300')}>
            Tüm alanlar
          </button>
          {sectors.map(([s, n]) => (
            <button key={s} onClick={() => setSector(sector === s ? null : s)} aria-pressed={sector === s} className={cn('whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition', sector === s ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300')}>
              {s} <span className={sector === s ? 'text-slate-300' : 'text-slate-400'}>{n}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">
          <span className="font-bold text-slate-900">{filtered.length}</span> firma listeleniyor
          {collab && (
            <>
              {' '}
              · <span className="font-semibold text-primary-600">{label.collab(collab)}</span>
            </>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {activeExtra}
          {activeCount > 0 && (
            <button onClick={clear} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900">
              <X className="h-3.5 w-3.5" /> Filtreleri temizle
            </button>
          )}
        </div>
      </div>

      <div className="mt-3">
        {loading ? (
          <div className={cn('grid gap-4', view === 'grid' ? 'sm:grid-cols-2 xl:grid-cols-3' : '')}>
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Sparkles className="h-6 w-6" />} title="Bu kriterlere uyan firma yok" description="Filtreleri genişleterek daha fazla firma görebilirsiniz." action={activeCount ? <Button variant="secondary" onClick={clear}>Filtreleri temizle</Button> : undefined} />
        ) : (
          <>
            <motion.div layout className={cn('grid gap-4', view === 'grid' ? 'sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1')}>
              <AnimatePresence initial={false}>
                {filtered.slice(0, limit).map((it) => (
                  <motion.div key={it.company.id} className="h-full" layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.2 }}>
                    <CompanyCard item={it} view={view} busy={busyIds?.has(it.company.id)} onInterest={onInterest} onHide={onHide} onOpen={onOpen} onMessage={onMessage} onFavorite={onFavorite} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
            {filtered.length > limit && (
              <div className="mt-6 flex justify-center">
                <Button variant="secondary" onClick={() => setLimit((l) => l + PAGE)}>
                  Daha fazla göster ({filtered.length - limit})
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatusButton({ item, busy, onInterest, onMessage }: { item: DirItem; busy?: boolean; onInterest: (id: string) => void; onMessage: (matchId: string) => void }) {
  if (item.status === 'matched' && item.matchId)
    return (
      <Button size="sm" className="flex-1" onClick={() => onMessage(item.matchId!)}>
        <MessageCircle className="h-4 w-4" /> Mesaj gönder
      </Button>
    );
  if (item.status === 'interested')
    return (
      <span className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-3 text-sm font-semibold text-emerald-700">
        <Check className="h-4 w-4" /> İlgi gönderildi
      </span>
    );
  return (
    <Button size="sm" className="flex-1" disabled={busy} onClick={() => onInterest(item.company.id)}>
      <Handshake className="h-4 w-4" /> {busy ? 'Gönderiliyor…' : 'İlgileniyorum'}
    </Button>
  );
}

function CompanyCard({ item, view, busy, onInterest, onHide, onOpen, onMessage, onFavorite }: { item: DirItem; view: View; busy?: boolean } & Pick<Props, 'onInterest' | 'onHide' | 'onOpen' | 'onMessage' | 'onFavorite'>) {
  const c = item.company;
  const meta = (
    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
      <MapPin className="h-3.5 w-3.5 shrink-0" /> {[c.technopark, c.city].filter(Boolean).join(' · ') || '—'}
    </p>
  );
  const scoreBadge = item.score != null && (
    <span className="shrink-0 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-600" title="Profilinize göre uyum skoru">
      %{item.score} uyum
    </span>
  );
  const secondary = (
    <>
      <Button size="sm" variant="secondary" onClick={() => onOpen(c.id)} aria-label={`${c.name} detayları`}>
        <Info className="h-4 w-4" /> <span className="hidden sm:inline">Detay</span>
      </Button>
      {onFavorite && (
        <button onClick={() => onFavorite(c.id)} aria-label={item.favorite ? 'Favorilerden çıkar' : 'Favorilere ekle'} title={item.favorite ? 'Favorilerden çıkar' : 'Favorilere ekle'} className={cn('grid h-9 w-9 place-items-center rounded-xl transition', item.favorite ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700')}>
          <Bookmark className={cn('h-4 w-4', item.favorite && 'fill-blue-600')} />
        </button>
      )}
      {item.status === 'none' && (
        <button onClick={() => onHide(c.id)} aria-label={`${c.name} firmasını gizle`} title="Bu firmayı listemden gizle" className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
          <EyeOff className="h-4 w-4" />
        </button>
      )}
    </>
  );

  if (view === 'list')
    return (
      <article className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-glass transition hover:border-slate-300 hover:shadow-card sm:flex-row sm:items-center" aria-label={`${c.name} firma kartı`}>
        <button onClick={() => onOpen(c.id)} className="flex min-w-0 flex-1 items-center gap-4 text-left">
          <CompanyLogo company={c} size={56} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate font-display text-base font-bold text-slate-900">{c.name}</h3>
              {c.verified && <VerifiedBadge />}
              <span className="ml-1 hidden shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 md:inline">{c.sector}</span>
            </div>
            {meta}
            <p className="mt-1 line-clamp-1 text-sm text-slate-600">{c.tagline || c.description}</p>
          </div>
        </button>
        <div className="flex items-center gap-2 sm:w-auto">
          {scoreBadge}
          <div className="flex flex-1 items-center gap-2 sm:w-64 sm:flex-none">
            <StatusButton item={item} busy={busy} onInterest={onInterest} onMessage={onMessage} />
            {secondary}
          </div>
        </div>
      </article>
    );

  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-glass transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-card" aria-label={`${c.name} firma kartı`}>
      <button onClick={() => onOpen(c.id)} className="flex items-start gap-3 text-left">
        <CompanyLogo company={c} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-display text-base font-bold text-slate-900">{c.name}</h3>
            {c.verified && <VerifiedBadge className="shrink-0" />}
          </div>
          {meta}
          <span className="mt-1.5 inline-block max-w-full truncate rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{c.sector}</span>
        </div>
        {scoreBadge}
      </button>
      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">{c.tagline || c.description}</p>
      {item.reasons[0] && (
        <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-primary-600">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span className="line-clamp-1">{item.reasons[0]}</span>
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {c.expertise.slice(0, 3).map((e) => (
          <span key={e} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            {e}
          </span>
        ))}
      </div>
      {c.collaborationTypes.length > 0 && (
        <p className="mt-3 line-clamp-1 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">İş birliği:</span> {c.collaborationTypes.map((t) => label.collab(t)).join(', ')}
        </p>
      )}
      <div className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-4">
        <StatusButton item={item} busy={busy} onInterest={onInterest} onMessage={onMessage} />
        {secondary}
      </div>
    </article>
  );
}
