import { motion } from 'framer-motion';
import { Building2, CalendarCheck2, Check, Download, FileSpreadsheet, Flag, HeartHandshake, Network, Percent, Search, TrendingUp, Upload, Users, X } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, Chip, Modal } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { BarChart } from '@/components/dashboard/Charts';
import { api } from '../api';
import { useAuth } from '../auth';
import { useAction, useLoad } from '../hooks';
import { OUTCOMES, REPORT_REASON_LABEL, VERIFICATION, fmtDate, fmtMoney } from '../labels';
import type { VerificationStatus } from '../types';
import { Alert, Field, Select, Spinner, Tabs } from '../ui';

type Tp = { id: string; name: string; city: string };

const BASE_TABS = [
  ['stats', 'Genel bakış'],
  ['companies', 'Firmalar'],
  ['import', 'Toplu yükleme'],
  ['gap', 'Talep–arz boşluğu'],
  ['network', 'Ağ haritası'],
  ['reports', 'Raporlar'],
] as const;
type TabKey = (typeof BASE_TABS)[number][0] | 'admin';

export default function Panel() {
  const auth = useAuth();
  const [tab, setTab] = useState<TabKey>('stats');
  const tps = useLoad(() => (auth.isSuperAdmin ? api.get<{ technoparks: Tp[] }>('/technoparks') : Promise.resolve(null)), [auth.isSuperAdmin]);
  const [tp, setTp] = useState('');
  const q = tp ? `technoparkId=${tp}` : '';
  const tabs = auth.isSuperAdmin ? ([...BASE_TABS, ['admin', 'Platform']] as const) : BASE_TABS;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        title="Teknokent Paneli"
        description="Firma onayı, ekosistem metrikleri ve moderasyon."
        actions={
          auth.isSuperAdmin &&
          tps.data && (
            <Select value={tp} onChange={(e) => setTp(e.target.value)} aria-label="Teknokent" className="!w-auto">
              <option value="">Tüm teknokentler</option>
              {tps.data.technoparks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          )
        }
      />
      <Tabs id="panel" tabs={tabs as readonly (readonly [TabKey, string])[]} value={tab} onChange={setTab} />
      {tab === 'stats' && <Stats q={q} />}
      {tab === 'companies' && <Companies q={q} />}
      {tab === 'import' && <Import tp={tp} needsTp={auth.isSuperAdmin} />}
      {tab === 'gap' && <Gap q={q} />}
      {tab === 'network' && <NetworkTab q={q} />}
      {tab === 'reports' && <Reports q={q} />}
      {tab === 'admin' && <PlatformAdmin technoparks={tps.data?.technoparks ?? []} onChanged={tps.reload} />}
    </div>
  );
}

function Panelbox({ title, description, children, actions, className }: { title?: string; description?: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={cn('glass rounded-3xl p-5 sm:p-6', className)}>
      {(title || actions) && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="font-display text-lg font-semibold text-slate-900">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/* --------------------------------- Metrikler -------------------------------- */

interface StatsResp {
  companies: { total: number; approved: number; pending: number; prefilledUnclaimed: number };
  metrics: {
    profileCompletionRate: number;
    weeklyActiveCompanies: number;
    weeklyActiveRate: number;
    swipes: { total: number };
    rightSwipeRate: number;
    matches: number;
    matchToMessageRate: number;
    meetings: number;
    messageToMeetingRate: number;
    outcomes: Record<keyof typeof OUTCOMES, number>;
    documentedCollaborations: number;
    estimatedValue: number;
  };
  monthly: { month: string; matches: number; meetings: number; outcomes: number }[];
}

function Stat({ label, value, sub, icon, color, highlight }: { label: string; value: ReactNode; sub?: string; icon: ReactNode; color: string; highlight?: boolean }) {
  return (
    <div className={cn('glass relative overflow-hidden rounded-3xl p-5', highlight && 'border-primary-200')}>
      <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: `${color}1f`, color }}>
        {icon}
      </span>
      <div className="mt-4 font-display text-3xl font-bold tracking-tight text-slate-900">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
      {sub && <div className="mt-1.5 text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}

function Rate({ label, value, target }: { label: string; value: number; target: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-900">%{value}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <motion.div className="h-full rounded-full bg-brand-gradient" initial={{ width: 0 }} animate={{ width: `${Math.min(100, value)}%` }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} />
      </div>
      <div className="mt-1 text-[11px] text-slate-500">{target}</div>
    </div>
  );
}

function Stats({ q }: { q: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const [range, setRange] = useState({ from: monthAgo, to: today });
  const qs = `from=${range.from}&to=${range.to}T23:59:59${q ? `&${q}` : ''}`;
  const { data, error, loading } = useLoad(() => api.get<StatsResp>(`/panel/stats?${qs}`), [qs]);
  const act = useAction();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Başlangıç" htmlFor="st-from">
          <input id="st-from" type="date" className="input [color-scheme:dark]" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
        </Field>
        <Field label="Bitiş" htmlFor="st-to">
          <input id="st-to" type="date" className="input [color-scheme:dark]" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
        </Field>
        <Button variant="secondary" className="ml-auto" disabled={act.busy} onClick={() => act.run(() => api.download(`/panel/stats/export.csv?${qs}`, `teknoortak-rapor-${range.to}.csv`))}>
          <Download className="h-4 w-4" /> Excel/CSV indir
        </Button>
      </div>
      <Alert error={error || act.error} />
      {loading || !data ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <Stat highlight label="Toplantı (kuzey yıldızı)" value={data.metrics.meetings} sub="eşleşme sonrası gerçekleşen/kabul edilen" icon={<CalendarCheck2 className="h-[18px] w-[18px]" />} color="#FF5E00" />
            <Stat label="Eşleşme" value={data.metrics.matches} icon={<HeartHandshake className="h-[18px] w-[18px]" />} color="#0F172A" />
            <Stat label="Belgeli iş birliği" value={data.metrics.documentedCollaborations} sub="teklif + sözleşme" icon={<FileSpreadsheet className="h-[18px] w-[18px]" />} color="#2563EB" />
            <Stat label="Tahmini değer" value={fmtMoney(data.metrics.estimatedValue) || '₺0'} icon={<TrendingUp className="h-[18px] w-[18px]" />} color="#f59e0b" />
            <Stat label="Onaylı firma" value={data.companies.approved} sub={`${data.companies.pending} onay bekliyor · ${data.companies.prefilledUnclaimed} sahiplenilmedi`} icon={<Building2 className="h-[18px] w-[18px]" />} color="#22d3ee" />
            <Stat label="Haftalık aktif firma" value={data.metrics.weeklyActiveCompanies} sub={`%${data.metrics.weeklyActiveRate} · hedef %30`} icon={<Users className="h-[18px] w-[18px]" />} color="#ec4899" />
            <Stat label="Kaydırma" value={data.metrics.swipes.total} sub={`%${data.metrics.rightSwipeRate} sağa · sağlıklı aralık %15–30`} icon={<Percent className="h-[18px] w-[18px]" />} color="#10b981" />
            <Stat label="Profil tamamlama" value={`%${data.metrics.profileCompletionRate}`} sub="hedef %70" icon={<Check className="h-[18px] w-[18px]" />} color="#6366f1" />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Panelbox title="Dönüşüm hunisi" className="lg:col-span-1">
              <div className="space-y-5">
                <Rate label="Eşleşme → mesaj" value={data.metrics.matchToMessageRate} target="hedef %50" />
                <Rate label="Mesaj → toplantı" value={data.metrics.messageToMeetingRate} target="hedef %25" />
                <Rate label="Profil tamamlama" value={data.metrics.profileCompletionRate} target="hedef %70" />
              </div>
              <div className="hairline my-5" />
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">İş sonuçları</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(Object.entries(data.metrics.outcomes) as [keyof typeof OUTCOMES, number][]).map(([k, v]) => (
                  <Chip key={k} tone={k === 'contract' ? 'aqua' : k === 'proposal' ? 'violet' : 'default'}>
                    {OUTCOMES[k]}: {v}
                  </Chip>
                ))}
              </div>
            </Panelbox>
            <Panelbox title="Aylık gelişim" description="Eşleşme, toplantı ve iş sonucu" className="lg:col-span-2">
              {data.monthly.length ? (
                <BarChart
                  labels={data.monthly.map((m) => m.month)}
                  series={[
                    { name: 'Eşleşme', color: '#FF5E00', values: data.monthly.map((m) => m.matches) },
                    { name: 'Toplantı', color: '#2563EB', values: data.monthly.map((m) => m.meetings) },
                    { name: 'İş sonucu', color: '#0F172A', values: data.monthly.map((m) => m.outcomes) },
                  ]}
                />
              ) : (
                <p className="py-10 text-center text-sm text-slate-500">Seçili dönemde veri yok.</p>
              )}
            </Panelbox>
          </div>
        </>
      )}
    </div>
  );
}

/* --------------------------------- Firmalar --------------------------------- */

interface PanelCompany {
  id: string;
  name: string;
  taxNumber: string;
  emailDomain?: string;
  verificationStatus: VerificationStatus;
  prefilled: boolean;
  underReview: boolean;
  active: boolean;
  completion: number;
  userCount: number;
  createdAt: string;
}

function Companies({ q }: { q: string }) {
  const [status, setStatus] = useState<'' | VerificationStatus>('pending');
  const [search, setSearch] = useState('');
  const qs = `${status ? `status=${status}&` : ''}${search ? `q=${encodeURIComponent(search)}&` : ''}limit=200${q ? `&${q}` : ''}`;
  const list = useLoad(() => api.get<{ companies: PanelCompany[]; total: number }>(`/panel/companies?${qs}`), [qs]);
  const inactive = useLoad(() => api.get<{ companies: { name: string }[] }>(`/panel/companies/inactive${q ? `?${q}` : ''}`), [q]);
  const [rejecting, setRejecting] = useState<PanelCompany | null>(null);
  const [note, setNote] = useState('');
  const act = useAction();
  const toast = useToast();
  const review = (c: PanelCompany, action: 'approve' | 'reject', n?: string) =>
    act.run(async () => {
      await api.post(`/panel/companies/${c.id}/review`, { action, note: n || undefined });
      toast({ title: action === 'approve' ? `${c.name} onaylandı` : `${c.name} reddedildi`, tone: action === 'approve' ? 'success' : 'warning' });
      await list.reload();
    });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
          {(
            [
              ['pending', 'Onay bekleyen'],
              ['approved', 'Onaylı'],
              ['rejected', 'Reddedilen'],
              ['', 'Tümü'],
            ] as const
          ).map(([k, v]) => (
            <button key={k} onClick={() => setStatus(k)} className={cn('rounded-xl px-3.5 py-2 text-sm transition', status === k ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900')}>
              {v}
            </button>
          ))}
        </div>
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input className="input !py-2.5 !pl-10" placeholder="Firma ara…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Firma ara" />
        </div>
        {list.data && <span className="text-sm text-slate-500">{list.data.total} firma</span>}
      </div>
      <Alert error={list.error || act.error} />
      {list.loading || !list.data ? (
        <Spinner />
      ) : (
        <div className="glass overflow-x-auto rounded-3xl">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                {['Firma', 'VKN', 'Alan adı', 'Durum', 'Profil', 'Kullanıcı', 'Kayıt', ''].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.data.companies.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{c.name}</div>
                    {c.prefilled && <div className="text-xs text-slate-500">Önceden yüklendi, sahiplenilmedi</div>}
                    {c.underReview && <Chip className="mt-1 !text-[10px]">İncelemede</Chip>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{c.taxNumber}</td>
                  <td className="px-4 py-3 text-slate-500">{c.emailDomain || '—'}</td>
                  <td className="px-4 py-3">
                    <Chip tone={c.verificationStatus === 'approved' ? 'aqua' : c.verificationStatus === 'pending' ? 'violet' : 'default'}>{VERIFICATION[c.verificationStatus]}</Chip>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full bg-brand-gradient" style={{ width: `${c.completion}%` }} />
                      </div>
                      <span className="text-xs text-slate-500">%{c.completion}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{c.userCount}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(c.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {c.verificationStatus !== 'approved' && (
                        <Button size="sm" className="!h-8" disabled={act.busy} onClick={() => review(c, 'approve')}>
                          <Check className="h-3.5 w-3.5" /> Onayla
                        </Button>
                      )}
                      {c.verificationStatus !== 'rejected' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="!h-8"
                          disabled={act.busy}
                          onClick={() => {
                            setNote('');
                            setRejecting(c);
                          }}
                        >
                          Reddet
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!list.data.companies.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    Kayıt yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {!!inactive.data?.companies.length && (
        <Panelbox title={`Son 30 günde pasif firmalar (${inactive.data.companies.length})`}>
          <p className="text-sm text-slate-500">{inactive.data.companies.map((c) => c.name).join(', ')}</p>
        </Panelbox>
      )}
      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title={`${rejecting?.name ?? ''} reddedilsin mi?`}>
        <Field label="Ret nedeni (firmaya iletilir)" htmlFor="rj-note">
          <textarea id="rj-note" className="input min-h-[90px]" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRejecting(null)}>
            Vazgeç
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              const c = rejecting!;
              setRejecting(null);
              void review(c, 'reject', note);
            }}
          >
            <X className="h-4 w-4" /> Reddet
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/* ------------------------------ Toplu yükleme ------------------------------- */

/** Basit CSV ayrıştırıcı (; veya , ayraçlı, tırnak destekli). */
export function parseCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/)[0] || '';
  const sep = (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

const COLS: Record<string, string> = {
  ad: 'name', unvan: 'name', name: 'name', vkn: 'taxNumber', vergi_no: 'taxNumber', taxnumber: 'taxNumber', alan_adi: 'emailDomain', emaildomain: 'emailDomain',
  sehir: 'city', city: 'city', web: 'website', website: 'website', aciklama: 'description', description: 'description', calisan: 'employeeRange',
  employeerange: 'employeeRange', sektorler: 'sectors', sectors: 'sectors', teknolojiler: 'technologies', technologies: 'technologies',
};
const normHead = (h: string) =>
  h.trim().toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/\s+/g, '_');

type ImportRow = Record<string, string | string[]>;

function Import({ tp, needsTp }: { tp: string; needsTp: boolean }) {
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<{ created: number; skipped: number; errors: { row: number; taxNumber: string; error: string }[] } | null>(null);
  const { run, busy, error, setError } = useAction();
  const onFile = async (file: File) => {
    setResult(null);
    setFileName(file.name);
    const text = (await file.text()).replace(/^﻿/, '');
    const [head = [], ...body] = parseCsv(text);
    const keys = head.map((h) => COLS[normHead(h)]);
    if (!keys.includes('name') || !keys.includes('taxNumber')) {
      setRows(null);
      setError(new Error('CSV başlığında en az "ad" ve "vkn" sütunları olmalı.'));
      return;
    }
    setError(null);
    setRows(
      body.map((r) => {
        const o: ImportRow = {};
        keys.forEach((k, i) => {
          const v = r[i]?.trim();
          if (!k || !v) return;
          o[k] = ['sectors', 'technologies'].includes(k) ? v.split('|').map((s) => s.trim()).filter(Boolean) : v;
        });
        return o;
      }),
    );
  };
  return (
    <Panelbox title="Firma listesini yükleyin" description="Teknokentteki firmaları önceden yükleyin; firmalar kurumsal e-postayla kayıt olduklarında profillerini sahiplenir. Yüklenen firmalar onaylı sayılır.">
      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
          CSV sütunları: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">ad; vkn; alan_adi; sehir; web; aciklama; calisan; sektorler; teknolojiler</code>
          <br />
          Sektör/teknoloji birden fazlaysa <code className="rounded bg-slate-100 px-1">|</code> ile ayırın. Çalışan: 1-5, 6-20, 21-50, 50+.
        </div>
        {needsTp && !tp && <Alert kind="info">Yüklemeden önce sağ üstten bir teknokent seçin.</Alert>}
        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-primary-300">
          <Upload className="h-7 w-7 text-primary-600" />
          <span className="text-sm text-slate-900">{fileName || 'CSV dosyası seçin'}</span>
          <span className="text-xs text-slate-500">.csv · UTF-8</span>
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
        <Alert error={error} />
        {rows && (
          <>
            <p className="text-sm text-slate-600">
              <strong className="text-slate-900">{rows.length}</strong> satır okundu. İlk satırlar:
            </p>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    {['Ad', 'VKN', 'Alan adı', 'Sektörler'].map((h) => (
                      <th key={h} className="px-4 py-2.5 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {rows.slice(0, 8).map((r, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2">{r.name as string}</td>
                      <td className="px-4 py-2 font-mono text-xs">{r.taxNumber as string}</td>
                      <td className="px-4 py-2">{(r.emailDomain as string) ?? ''}</td>
                      <td className="px-4 py-2">{((r.sectors as string[]) ?? []).join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button
              disabled={busy || (needsTp && !tp)}
              onClick={() =>
                run(async () => {
                  setResult(await api.post('/panel/companies/import', { companies: rows, ...(tp ? { technoparkId: tp } : {}) }));
                  setRows(null);
                  setFileName('');
                })
              }
            >
              {busy ? 'İçe aktarılıyor…' : 'İçe aktar'}
            </Button>
          </>
        )}
        {result && (
          <Alert kind="success">
            {result.created} firma eklendi, {result.skipped} firma zaten kayıtlıydı.
            {result.errors.length > 0 && <div className="mt-1 text-xs text-rose-700">Hatalı satırlar: {result.errors.map((e) => `#${e.row + 2} (${e.taxNumber}): ${e.error}`).join(' · ')}</div>}
          </Alert>
        )}
      </div>
    </Panelbox>
  );
}

/* ---------------------------- Talep–arz boşluğu ----------------------------- */

function Gap({ q }: { q: string }) {
  const { data, error, loading } = useLoad(() => api.get<{ items: { tag: { _id: string; name?: string }; demand: number; supply: number; gap: number }[] }>(`/panel/supply-demand${q ? `?${q}` : ''}`), [q]);
  if (loading) return <Spinner />;
  if (error || !data) return <Alert error={error} />;
  const max = Math.max(1, ...data.items.map((x) => Math.max(x.demand, x.supply)));
  return (
    <Panelbox title="En çok aranan, en az sunulan yetkinlikler" description="Yeni firma kabulü ve kuluçka programı için doğrudan veri: pozitif boşluk = teknokentte karşılanmayan talep.">
      <ul className="space-y-3">
        {data.items.map((x) => (
          <li key={x.tag._id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 sm:grid-cols-[220px_minmax(0,1fr)_80px]">
            <span className="truncate text-sm text-slate-900">{x.tag.name || '—'}</span>
            <span className={cn('text-right font-display text-sm font-bold sm:order-last', x.gap > 0 ? 'text-rose-600' : 'text-emerald-600')}>{x.gap > 0 ? `+${x.gap}` : x.gap}</span>
            <div className="col-span-2 space-y-1 sm:col-span-1">
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-50">
                  <motion.div className="h-full rounded-full bg-blue-500" initial={{ width: 0 }} animate={{ width: `${(x.demand / max) * 100}%` }} />
                </div>
                <span className="w-6 text-right text-xs text-slate-500">{x.demand}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-50">
                  <motion.div className="h-full rounded-full bg-emerald-500" initial={{ width: 0 }} animate={{ width: `${(x.supply / max) * 100}%` }} />
                </div>
                <span className="w-6 text-right text-xs text-slate-500">{x.supply}</span>
              </div>
            </div>
          </li>
        ))}
        {!data.items.length && <li className="py-8 text-center text-sm text-slate-500">Henüz veri yok.</li>}
      </ul>
      <div className="mt-6 flex gap-5 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-500" /> Talep (arıyorum)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Arz (sunuyorum)
        </span>
      </div>
    </Panelbox>
  );
}

/* -------------------------------- Ağ haritası ------------------------------- */

const W = 900;
const H = 560;
const PALETTE = ['#FF5E00', '#0F172A', '#2563EB', '#ec4899', '#f59e0b', '#10b981', '#22d3ee', '#6366f1'];
type NNode = { id: string; name: string; sectors: string[]; degree: number };
type NEdge = { source: string; target: string; score: number };

/** Basit kuvvet yönlendirmeli yerleşim (yüzlerce düğüm için yeterli; tek seferlik hesap). */
function layout(nodes: NNode[], edges: NEdge[]) {
  const n = nodes.length;
  const idx = new Map(nodes.map((x, i) => [String(x.id), i]));
  const pos = nodes.map((_, i) => {
    const a = (2 * Math.PI * i) / Math.max(1, n);
    return { x: W / 2 + Math.cos(a) * W * 0.35, y: H / 2 + Math.sin(a) * H * 0.35 };
  });
  const links = edges.map((e) => [idx.get(String(e.source)), idx.get(String(e.target))] as const).filter((l): l is readonly [number, number] => l[0] != null && l[1] != null);
  const k = Math.sqrt((W * H) / Math.max(1, n)) * 0.42;
  for (let iter = 0; iter < 250; iter += 1) {
    const t = 12 * (1 - iter / 250) + 0.5;
    const disp = pos.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < n; i += 1)
      for (let j = i + 1; j < n; j += 1) {
        const dx = pos[i]!.x - pos[j]!.x;
        const dy = pos[i]!.y - pos[j]!.y;
        const d = Math.max(0.01, Math.hypot(dx, dy));
        const f = (k * k) / d;
        disp[i]!.x += (dx / d) * f;
        disp[i]!.y += (dy / d) * f;
        disp[j]!.x -= (dx / d) * f;
        disp[j]!.y -= (dy / d) * f;
      }
    for (const [a, b] of links) {
      const dx = pos[a]!.x - pos[b]!.x;
      const dy = pos[a]!.y - pos[b]!.y;
      const d = Math.max(0.01, Math.hypot(dx, dy));
      const f = (d * d) / k;
      disp[a]!.x -= (dx / d) * f;
      disp[a]!.y -= (dy / d) * f;
      disp[b]!.x += (dx / d) * f;
      disp[b]!.y += (dy / d) * f;
    }
    for (let i = 0; i < n; i += 1) {
      disp[i]!.x += (W / 2 - pos[i]!.x) * 0.9;
      disp[i]!.y += (H / 2 - pos[i]!.y) * 0.9;
      const d = Math.max(0.01, Math.hypot(disp[i]!.x, disp[i]!.y));
      pos[i]!.x = Math.min(W - 30, Math.max(30, pos[i]!.x + (disp[i]!.x / d) * Math.min(d, t)));
      pos[i]!.y = Math.min(H - 30, Math.max(30, pos[i]!.y + (disp[i]!.y / d) * Math.min(d, t)));
    }
  }
  return { pos, links };
}

function NetworkTab({ q }: { q: string }) {
  const { data, error, loading } = useLoad(() => api.get<{ nodes: NNode[]; edges: NEdge[]; isolated: number }>(`/panel/network${q ? `?${q}` : ''}`), [q]);
  if (loading) return <Spinner />;
  if (error || !data) return <Alert error={error} />;
  return (
    <Panelbox title="Ağ haritası" description={`${data.nodes.length} firma · ${data.edges.length} eşleşme · ${data.isolated} firma henüz kimseyle eşleşmedi (gri).`}>
      <NetworkGraph nodes={data.nodes} edges={data.edges} />
    </Panelbox>
  );
}

function NetworkGraph({ nodes, edges }: { nodes: NNode[]; edges: NEdge[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const { pos, links } = useMemo(() => layout(nodes, edges), [nodes, edges]);
  const sectors = useMemo(() => [...new Set(nodes.map((x) => x.sectors[0]).filter(Boolean))] as string[], [nodes]);
  const color = (x: Pick<NNode, 'degree' | 'sectors'>) => (x.degree === 0 ? '#CBD5E1' : PALETTE[sectors.indexOf(x.sectors[0]!) % PALETTE.length] ?? PALETTE[0]!);
  if (!nodes.length)
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        <Network className="mx-auto mb-2 h-6 w-6" /> Henüz onaylı firma yok.
      </p>
    );
  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Firma eşleşme ağı">
          {links.map(([a, b], i) => (
            <line key={i} x1={pos[a]!.x} y1={pos[a]!.y} x2={pos[b]!.x} y2={pos[b]!.y} stroke={hover != null && (hover === a || hover === b) ? '#FF7A33' : 'rgba(148,163,184,0.25)'} strokeWidth={hover != null && (hover === a || hover === b) ? 2 : 1} />
          ))}
          {nodes.map((x, i) => {
            const r = 6 + Math.min(10, x.degree * 2);
            return (
              <g key={x.id} transform={`translate(${pos[i]!.x},${pos[i]!.y})`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className="cursor-pointer">
                <circle r={r + 6} fill={color(x)} opacity={hover === i ? 0.25 : 0.1} />
                <circle r={r} fill={color(x)} />
                {(hover === i || nodes.length <= 40) && (
                  <text y={-r - 8} textAnchor="middle" className="fill-slate-700 text-[12px]" style={{ paintOrder: 'stroke', stroke: '#ffffff', strokeWidth: 4 }}>
                    {x.name}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      {sectors.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
          {sectors.slice(0, 8).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: color({ degree: 1, sectors: [s] }) }} /> {s}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" /> Eşleşmesi yok
          </span>
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Raporlar --------------------------------- */

interface ReportDoc {
  _id: string;
  reason: keyof typeof REPORT_REASON_LABEL;
  details?: string;
  createdAt: string;
  targetCompany?: { _id: string; name: string; underReview?: boolean };
  reporterCompany?: { name: string };
}

function Reports({ q }: { q: string }) {
  const { data, error, loading, reload } = useLoad(() => api.get<{ reports: ReportDoc[] }>(`/panel/reports${q ? `?${q}` : ''}`), [q]);
  const act = useAction();
  const toast = useToast();
  const [confirm, setConfirm] = useState<string | null>(null);
  const moderate = (id: string, action: 'restore' | 'deactivate') =>
    act.run(async () => {
      await api.post(`/panel/companies/${id}/moderate`, { action });
      toast({ title: action === 'restore' ? 'Firma yeniden yayında' : 'Firma pasifleştirildi', tone: action === 'restore' ? 'success' : 'warning' });
      await reload();
    });
  if (loading) return <Spinner />;
  if (error || !data) return <Alert error={error} />;
  const byTarget = new Map<string, ReportDoc[]>();
  for (const r of data.reports) {
    const k = String(r.targetCompany?._id);
    byTarget.set(k, [...(byTarget.get(k) ?? []), r]);
  }
  return (
    <div className="space-y-4">
      <Alert error={act.error} />
      {!byTarget.size && (
        <Panelbox>
          <p className="py-8 text-center text-sm text-slate-500">
            <Flag className="mx-auto mb-2 h-6 w-6" /> Açık rapor yok.
          </p>
        </Panelbox>
      )}
      {[...byTarget.entries()].map(([id, rs]) => (
        <Panelbox
          key={id}
          title={rs[0]!.targetCompany?.name ?? 'Firma'}
          description={`${rs.length} açık rapor${rs[0]!.targetCompany?.underReview ? ' · profil inceleme altında' : ''}`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" disabled={act.busy} onClick={() => moderate(id, 'restore')}>
                Raporları reddet, yayına al
              </Button>
              <Button size="sm" variant="danger" disabled={act.busy} onClick={() => setConfirm(id)}>
                Pasifleştir
              </Button>
            </div>
          }
        >
          <ul className="space-y-3">
            {rs.map((r) => (
              <li key={r._id} className="rounded-2xl bg-slate-50 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone="violet">{REPORT_REASON_LABEL[r.reason]}</Chip>
                  <span className="text-slate-600">{r.reporterCompany?.name}</span>
                  <span className="text-xs text-slate-500">· {fmtDate(r.createdAt)}</span>
                </div>
                {r.details && <p className="mt-2 text-slate-500">{r.details}</p>}
              </li>
            ))}
          </ul>
        </Panelbox>
      ))}
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Firma pasifleştirilsin mi?">
        <p className="text-sm text-slate-500">Firma akıştan kaldırılır ve tüm eşleşmeleri kapanır.</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirm(null)}>
            Vazgeç
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              const id = confirm!;
              setConfirm(null);
              void moderate(id, 'deactivate');
            }}
          >
            Pasifleştir
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/* ------------------------------ Platform yönetimi ---------------------------- */

function PlatformAdmin({ technoparks, onChanged }: { technoparks: Tp[]; onChanged: () => Promise<void> }) {
  const [tp, setTp] = useState({ name: '', city: '' });
  const [adm, setAdm] = useState({ technoparkId: '', email: '', fullName: '' });
  const a1 = useAction();
  const a2 = useAction();
  const toast = useToast();
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panelbox title="Teknokent ekle">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void a1.run(async () => {
              await api.post('/technoparks', tp);
              setTp({ name: '', city: '' });
              toast({ title: 'Teknokent eklendi' });
              await onChanged();
            });
          }}
        >
          <Alert error={a1.error} />
          <Field label="Ad" htmlFor="pa-name">
            <input id="pa-name" className="input" required value={tp.name} onChange={(e) => setTp({ ...tp, name: e.target.value })} />
          </Field>
          <Field label="Şehir" htmlFor="pa-city">
            <input id="pa-city" className="input" required value={tp.city} onChange={(e) => setTp({ ...tp, city: e.target.value })} />
          </Field>
          <Button type="submit" disabled={a1.busy}>
            Ekle
          </Button>
        </form>
      </Panelbox>
      <Panelbox title="Teknokent yöneticisi ekle" description="Davet edilen kişiye şifre belirleme bağlantısı gönderilir.">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void a2.run(async () => {
              await api.post(`/technoparks/${adm.technoparkId}/admins`, { email: adm.email, fullName: adm.fullName });
              toast({ title: 'Davet gönderildi', body: `${adm.email} için şifre belirleme bağlantısı gönderildi.` });
              setAdm({ technoparkId: '', email: '', fullName: '' });
            });
          }}
        >
          <Alert error={a2.error} />
          <Field label="Teknokent" htmlFor="pa-tp">
            <Select id="pa-tp" required value={adm.technoparkId} onChange={(e) => setAdm({ ...adm, technoparkId: e.target.value })}>
              <option value="">Seçin…</option>
              {technoparks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ad soyad" htmlFor="pa-fn">
            <input id="pa-fn" className="input" required value={adm.fullName} onChange={(e) => setAdm({ ...adm, fullName: e.target.value })} />
          </Field>
          <Field label="E-posta" htmlFor="pa-em">
            <input id="pa-em" className="input" type="email" required value={adm.email} onChange={(e) => setAdm({ ...adm, email: e.target.value })} />
          </Field>
          <Button type="submit" disabled={a2.busy}>
            Davet et
          </Button>
        </form>
      </Panelbox>
    </div>
  );
}
