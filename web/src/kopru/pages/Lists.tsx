import { ClipboardList, FlaskConical, GraduationCap, PlusCircle, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/AppShell';
import { ButtonLink, EmptyState } from '@/components/ui';
import { cn } from '@/lib/utils';
import { FIRMS, LABS, PERSONAS, STATUS, firmOf, type NeedStatus, type Role } from '../data';
import { useKopru, type Solver } from '../store';
import { Card, NeedRow, SolverAvatar, SolverKind, Stat, Tag } from '../ui';
import { useVisibleProjects } from './Projects';

/** Firma genel bakış */
export function FirmHome() {
  const k = useKopru();
  const mine = k.state.needs.filter((n) => n.firmId === PERSONAS.firma.firmId);
  const projects = useVisibleProjects('firma');
  const accepted = mine.reduce((a, n) => a + n.invites.filter((i) => i.status === 'kabul').length, 0);
  const firm = firmOf(PERSONAS.firma.firmId!);
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        title={`Hoş geldiniz, ${PERSONAS.firma.name.split(' ')[0]}`}
        description={`${firm.name} · ${firm.sector} · Çankırı OSB`}
        actions={
          <ButtonLink to="/kopru/firma/ihtiyaclar/yeni">
            <PlusCircle className="h-4 w-4" /> İhtiyaç bildir
          </ButtonLink>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Açık ihtiyaç" value={mine.filter((n) => n.status !== 'proje' && n.status !== 'kapandi').length} />
        <Stat label="Kabul eden uzman" value={accepted} />
        <Stat label="Aktif proje" value={projects.filter((p) => p.stage !== 'tamamlandi').length} />
        <Stat label="Tamamlanan" value={projects.filter((p) => p.stage === 'tamamlandi').length} />
      </div>
      {mine.length === 0 ? (
        <div className="glass rounded-2xl p-8">
          <EmptyState
            icon={<ClipboardList className="h-6 w-6" />}
            title="Henüz bir ihtiyaç bildirmediniz"
            description="Üretimde yaşadığınız bir sorunu, test/analiz ihtiyacını veya geliştirmek istediğiniz ürünü yazın; TTO doğru akademisyen ve teknokent firmasıyla buluşturur."
            action={<ButtonLink to="/kopru/firma/ihtiyaclar/yeni">İlk ihtiyacı bildir</ButtonLink>}
          />
        </div>
      ) : (
        <Card title="İhtiyaçlarım">
          <div className="-mx-3 divide-y divide-slate-100">{mine.map((n) => <NeedRow key={n.id} need={n} to={`/kopru/firma/ihtiyaclar/${n.id}`} />)}</div>
        </Card>
      )}
      <Card title="Bölgenizde çözülen örnekler" description="Çankırı OSB firmalarının üniversiteyle çözdüğü sorunlar">
        <div className="-mx-3 divide-y divide-slate-100">
          {k.state.needs
            .filter((n) => n.firmId !== PERSONAS.firma.firmId && (n.status === 'proje' || n.status === 'kapandi') && !n.confidential)
            .map((n) => <NeedRow key={n.id} need={n} to={`/kopru/firma/ihtiyaclar/${n.id}`} />)}
        </div>
      </Card>
    </div>
  );
}

/** İhtiyaç listesi: firma (kendi), OSB (bölge), teknokent (firmalarının davet edildikleri) */
export function NeedList() {
  const { role } = useParams() as { role: Role };
  const k = useKopru();
  const [status, setStatus] = useState<NeedStatus | 'all'>('all');
  const base = k.state.needs.filter((n) =>
    role === 'firma' ? n.firmId === PERSONAS.firma.firmId : role === 'osb' ? firmOf(n.firmId).orgId === 'osb' : role === 'teknokent' ? n.invites.some((i) => i.kind === 'firm') : true,
  );
  const list = status === 'all' ? base : base.filter((n) => n.status === status);
  const title = role === 'firma' ? 'İhtiyaçlarım' : role === 'osb' ? 'Bölge ihtiyaçları' : role === 'teknokent' ? 'Firmalarımızın davet edildiği ihtiyaçlar' : 'İhtiyaçlar';
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        title={title}
        description={role === 'osb' ? 'Gizli ihtiyaçların ayrıntıları kurum yöneticilerine gösterilmez.' : undefined}
        actions={role === 'firma' ? <ButtonLink to="/kopru/firma/ihtiyaclar/yeni"><PlusCircle className="h-4 w-4" /> İhtiyaç bildir</ButtonLink> : undefined}
      />
      <div className="flex flex-wrap gap-1.5">
        {(['all', ...Object.keys(STATUS)] as (NeedStatus | 'all')[]).map((s) => (
          <button key={s} onClick={() => setStatus(s)} aria-pressed={status === s} className={cn('rounded-full border px-3 py-1 text-xs font-semibold transition', status === s ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}>
            {s === 'all' ? `Tümü (${base.length})` : `${STATUS[s]} (${base.filter((n) => n.status === s).length})`}
          </button>
        ))}
      </div>
      <div className="glass rounded-2xl p-2">
        {list.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">Bu filtrede ihtiyaç yok.</p> : <div className="divide-y divide-slate-100">{list.map((n) => <NeedRow key={n.id} need={n} to={`/kopru/${role}/ihtiyaclar/${n.id}`} />)}</div>}
      </div>
    </div>
  );
}

/** Uzman, laboratuvar ve teknokent firması rehberi */
export function Experts() {
  const { role } = useParams() as { role: Role };
  const k = useKopru();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'uzman' | 'lab'>('uzman');
  const [kind, setKind] = useState<'all' | 'academic' | 'firm'>('all');
  const solvers: Solver[] = useMemo(
    () => [
      ...k.state.academics.filter((a) => a.approved).map((a) => ({ kind: 'academic' as const, data: a })),
      ...FIRMS.filter((f) => f.orgId === 'tk').map((f) => ({ kind: 'firm' as const, data: f })),
    ],
    [k.state.academics],
  );
  const ql = q.toLocaleLowerCase('tr');
  const match = (txt: string) => !ql || txt.toLocaleLowerCase('tr').includes(ql);
  const shown = solvers.filter((s) => (kind === 'all' || s.kind === kind) && match(`${s.data.name} ${s.data.summary} ${s.data.tags.join(' ')} ${s.kind === 'academic' ? s.data.department : s.data.sector}`));
  const labs = LABS.filter((l) => match(`${l.name} ${l.department} ${l.equipment.join(' ')} ${l.tags.join(' ')}`));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader title="Uzman & laboratuvar rehberi" description="ÇAKÜ akademisyenleri, laboratuvar cihazları ve ÇAKÜ Teknokent firmaları" />
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input !py-2.5 !pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Alan, cihaz veya isim ara (ör. SEM, raf ömrü, enerji)" aria-label="Rehberde ara" />
        </div>
        <div className="flex rounded-xl bg-slate-100 p-1" role="tablist">
          {(['uzman', 'lab'] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn('rounded-lg px-3 py-1.5 text-sm font-semibold', tab === t ? 'bg-white text-slate-900 shadow-glass' : 'text-slate-500')}>
              {t === 'uzman' ? `Uzmanlar (${shown.length})` : `Laboratuvarlar (${labs.length})`}
            </button>
          ))}
        </div>
        {tab === 'uzman' && (
          <select className="input !w-auto !py-2.5" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} aria-label="Tür">
            <option value="all">Tümü</option>
            <option value="academic">Akademisyen</option>
            <option value="firm">Teknokent firması</option>
          </select>
        )}
      </div>

      {tab === 'uzman' ? (
        <div className="grid gap-3 md:grid-cols-2">
          {shown.map((s) => (
            <div key={s.data.id} className="glass rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <SolverAvatar solver={s} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-900">{s.data.name}</div>
                  <SolverKind solver={s} />
                </div>
                {s.kind === 'academic' && (
                  <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', s.data.availability === 'uygun' ? 'bg-emerald-50 text-emerald-700' : s.data.availability === 'sinirli' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500')}>
                    {s.data.availability === 'uygun' ? 'Uygun' : s.data.availability === 'sinirli' ? 'Sınırlı' : 'Dolu'}
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm text-slate-600">{s.data.summary}</p>
              <div className="mt-3 flex flex-wrap gap-1">{s.data.tags.map((t) => <Tag key={t}>{t}</Tag>)}</div>
              {s.kind === 'academic' && (
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                  <span>{s.data.industryProjects} sanayi projesi</span>
                  <span>{s.data.publications} yayın</span>
                  {s.data.labIds.map((id) => (
                    <span key={id} className="inline-flex items-center gap-1">
                      <FlaskConical className="h-3 w-3" /> {LABS.find((l) => l.id === id)?.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {labs.map((l) => {
            const owners = k.state.academics.filter((a) => a.approved && a.labIds.includes(l.id));
            return (
              <div key={l.id} className="glass rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-600">
                    <FlaskConical className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="font-semibold text-slate-900">{l.name}</div>
                    <div className="text-xs text-slate-500">{l.department}</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">{l.equipment.map((e) => <Tag key={e} hit>{e}</Tag>)}</div>
                <div className="mt-3 text-sm text-slate-600">{l.service}</div>
                {owners.length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                    <GraduationCap className="h-3.5 w-3.5" /> {owners.map((o) => o.name).join(', ')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {role === 'firma' && (
        <p className="text-center text-sm text-slate-500">
          Bir uzmanla çalışmak için önce <Link to="/kopru/firma/ihtiyaclar/yeni" className="font-semibold text-primary-600 hover:underline">ihtiyacınızı bildirin</Link>; ihtiyaç sayfasından doğrudan davet gönderebilirsiniz.
        </p>
      )}
    </div>
  );
}
