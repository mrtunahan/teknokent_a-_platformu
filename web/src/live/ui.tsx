import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { CompanyLogo } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Company } from '@/types';
import { fileUrl } from './api';
import type { ApiError } from './api';
import type { Card, Tag } from './types';

export function Spinner({ label = 'Yükleniyor…', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-3 py-16 text-sm text-slate-400', className)} role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-electric-400" /> {label}
    </div>
  );
}

export function Alert({ error, kind = 'error', children, className }: { error?: Error | null; kind?: 'error' | 'success' | 'info'; children?: ReactNode; className?: string }) {
  if (!error && !children) return null;
  const tones = {
    error: 'border-rose-400/30 bg-rose-500/10 text-rose-200',
    success: 'border-aqua-400/30 bg-aqua-400/10 text-aqua-300',
    info: 'border-electric-400/30 bg-electric-500/10 text-electric-300',
  };
  const Icon = kind === 'error' ? AlertCircle : kind === 'success' ? CheckCircle2 : Info;
  const details = (error as ApiError | undefined)?.details;
  return (
    <div className={cn('flex gap-3 rounded-2xl border px-4 py-3 text-sm', tones[kind], className)} role={kind === 'error' ? 'alert' : 'status'}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">
        {error?.message}
        {details && <div className="mt-1 text-xs opacity-80">{details}</div>}
        {children}
      </div>
    </div>
  );
}

export function Field({ label, hint, error, htmlFor, children, className }: { label: string; hint?: ReactNode; error?: string; htmlFor?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? <p className="mt-1.5 text-xs text-rose-300">{error}</p> : hint ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

const PALETTE: [string, string][] = [
  ['#2f7bff', '#8b5cf6'],
  ['#14b8a6', '#2f7bff'],
  ['#8b5cf6', '#ec4899'],
  ['#22d3ee', '#10b981'],
  ['#6366f1', '#22d3ee'],
  ['#f59e0b', '#ef4444'],
];
export const brandFor = (name = ''): [string, string] => PALETTE[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length]!;

/** API'den gelen (göreli) logo yolunu çözen logo bileşeni. */
export function Logo({ company, size = 48, className }: { company?: { name?: string; logoUrl?: string } | null; size?: number; className?: string }) {
  const [broken, setBroken] = useState(false);
  const name = company?.name || '?';
  const src = broken ? undefined : fileUrl(company?.logoUrl) || undefined;
  return (
    <CompanyLogo company={{ name, brand: brandFor(name), logoUrl: src }} size={size} className={className} onImgError={() => setBroken(true)} />
  );
}

/** Aranabilir etiket seçici (tekli/çoklu). */
export function TagSelect({
  tags,
  value,
  onChange,
  multiple = false,
  max,
  placeholder = 'Etiket ara…',
  id,
}: {
  tags: Tag[];
  value: string[] | string;
  onChange: (v: any) => void;
  multiple?: boolean;
  max?: number;
  placeholder?: string;
  id?: string;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const selected = multiple ? ((value as string[]) ?? []) : value ? [value as string] : [];
  const byId = useMemo(() => new Map(tags.map((t) => [String(t.id), t])), [tags]);
  const norm = (s: string) => s.toLocaleLowerCase('tr-TR');
  const options = tags.filter((t) => !selected.includes(String(t.id)) && norm(t.name).includes(norm(q))).slice(0, 40);
  const full = multiple && max !== undefined && selected.length >= max;
  const add = (tid: string) => {
    if (multiple) onChange([...selected, tid]);
    else onChange(tid);
    setQ('');
    setOpen(multiple);
  };
  const remove = (tid: string) => (multiple ? onChange(selected.filter((x) => x !== tid)) : onChange(''));
  return (
    <div className="relative">
      <div className="flex min-h-[48px] flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] p-1.5 transition focus-within:border-electric-400/60 focus-within:ring-4 focus-within:ring-electric-500/10">
        {selected.map((tid) => (
          <span key={tid} className="inline-flex items-center gap-1 rounded-lg bg-electric-500/15 py-1 pl-2.5 pr-1 text-sm text-electric-300">
            {byId.get(tid)?.name ?? '…'}
            <button type="button" onClick={() => remove(tid)} className="rounded p-0.5 hover:bg-white/10" aria-label={`${byId.get(tid)?.name ?? ''} kaldır`}>
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        {!full && (multiple || !selected.length) && (
          <input
            id={id}
            value={q}
            placeholder={placeholder}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            className="min-w-[140px] flex-1 bg-transparent px-2 py-1.5 text-sm text-white outline-none placeholder:text-slate-500"
          />
        )}
      </div>
      {open && options.length > 0 && (
        <ul className="glass-strong absolute inset-x-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-xl p-1" role="listbox">
          {options.map((t) => (
            <li key={t.id}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => add(String(t.id))} className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/5">
                {t.parent && byId.get(String(t.parent)) ? <small className="text-slate-500">{byId.get(String(t.parent))!.name} › </small> : null}
                {t.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Select({ className, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn('input [color-scheme:dark]', className)} {...rest} />;
}

export function Tabs<T extends string>({ tabs, value, onChange, id }: { tabs: readonly (readonly [T, string])[]; value: T; onChange: (v: T) => void; id: string }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <div className="inline-flex gap-1 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-1" role="tablist">
        {tabs.map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={value === k} onClick={() => onChange(k)} className="relative whitespace-nowrap rounded-xl px-4 py-2 text-sm">
            {value === k && <span className="absolute inset-0 rounded-xl bg-white/[0.08]" data-tab={id} />}
            <span className={cn('relative', value === k ? 'text-white' : 'text-slate-400 hover:text-slate-200')}>{l}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const tpName = (t: Card['technopark']) => (typeof t === 'string' ? '' : t?.name ?? '');

/** API kartını mevcut kaydırma kartının beklediği şekle dönüştürür. */
export function cardToCompany(c: Card & { description?: string; website?: string; foundedYear?: number; technologies?: { name: string }[] }): Company {
  const seekingTypes = c.needs.map((n) => n.collaborationType);
  const offerTypes = c.offers.map((o) => o.collaborationType);
  const describe = (x: { tag: { name: string } | null; description?: string }) => [x.tag?.name, x.description].filter(Boolean).join(' — ');
  return {
    id: c.id,
    name: c.name,
    logoUrl: fileUrl(c.logoUrl) || undefined,
    brand: brandFor(c.name),
    tagline: c.offers[0]?.description || '',
    description: c.description || c.offers.map((o) => o.description).filter(Boolean).join(' ') || c.needs.map((n) => n.description).filter(Boolean).join(' '),
    foundedYear: c.foundedYear ?? 0,
    technopark: tpName(c.technopark),
    city: c.city || (typeof c.technopark === 'object' ? c.technopark?.city ?? '' : ''),
    website: c.website ?? '',
    sector: c.sectors[0]?.name ?? 'Teknoloji',
    expertise: (c.technologies?.length ? c.technologies : c.offers.map((o) => o.tag).filter(Boolean) as { name: string }[]).map((t) => t.name).slice(0, 5),
    products: [],
    seeking: c.needs.map(describe),
    offering: c.offers.map(describe),
    collaborationTypes: Array.from(new Set([...offerTypes, ...seekingTypes])),
    rndNeeds: [],
    employeeRange: c.employeeRange ?? '6-20',
    stage: c.stage ?? 'mvp',
    investmentNeed: seekingTypes.includes('investment') ? 'seed' : 'none',
    seekingInvestor: seekingTypes.includes('investment'),
    seekingProjectPartner: seekingTypes.includes('project_subcontractor'),
    hasRndCenter: false,
    internationalGoals: [],
    exportFocused: false,
    verified: c.verified,
    contact: { name: '', title: '', email: '' },
    cover: (['mesh', 'grid', 'waves', 'orbit'] as const)[c.name.length % 4]!,
  };
}
