import { motion } from 'framer-motion';
import { Check, FlaskConical, GraduationCap, Lock, Building2, Cpu } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn, initials, timeAgo } from '@/lib/utils';
import { CATEGORY, STAGES, STATUS, firmOf, orgOf, type Need, type NeedEvent, type NeedStatus, type Stage } from './data';
import type { Candidate, Solver } from './store';

export function Avatar({ name, brand, size = 40, square }: { name: string; brand: [string, string]; size?: number; square?: boolean }) {
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center font-display font-bold text-white"
      style={{ width: size, height: size, borderRadius: square ? size * 0.3 : size, background: `linear-gradient(135deg, ${brand[0]}, ${brand[1]})`, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}

export function SolverAvatar({ solver, size = 40 }: { solver: Solver; size?: number }) {
  return <Avatar name={solver.data.name} brand={solver.data.brand} size={size} square={solver.kind === 'firm'} />;
}

export function SolverKind({ solver }: { solver: Solver }) {
  return solver.kind === 'academic' ? (
    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
      <GraduationCap className="h-3.5 w-3.5 text-blue-600" /> {orgOf(solver.data.orgId).short} · {solver.data.department}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
      <Cpu className="h-3.5 w-3.5 text-primary-600" /> {orgOf(solver.data.orgId).short} · {solver.data.sector}
    </span>
  );
}

const STATUS_TONE: Record<NeedStatus, string> = {
  yeni: 'bg-amber-50 text-amber-700 ring-amber-200',
  inceleme: 'bg-blue-50 text-blue-700 ring-blue-200',
  eslestirme: 'bg-primary-50 text-primary-700 ring-primary-200',
  proje: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  kapandi: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export function StatusChip({ status }: { status: NeedStatus }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1', STATUS_TONE[status])}>{STATUS[status]}</span>;
}

export function Tag({ children, hit }: { children: ReactNode; hit?: boolean }) {
  return <span className={cn('inline-flex rounded-md px-2 py-0.5 text-xs font-medium', hit ? 'bg-primary-50 text-primary-700' : 'bg-slate-100 text-slate-600')}>{children}</span>;
}

export function Card({ title, description, actions, children, className }: { title?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('glass rounded-2xl p-5', className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="font-display text-base font-bold text-slate-900">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: string; icon?: ReactNode }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label} {icon}
      </div>
      <div className="mt-2 font-display text-2xl font-extrabold text-slate-900">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

/** Uyum skoru çubuğu */
export function ScoreBar({ value }: { value: number }) {
  const color = value >= 70 ? 'bg-emerald-500' : value >= 45 ? 'bg-primary-500' : 'bg-slate-400';
  return (
    <div className="flex items-center gap-2" aria-label={`Uyum %${value}`}>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
        <motion.div className={cn('h-full rounded-full', color)} initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.6 }} />
      </div>
      <span className="text-xs font-bold tabular-nums text-slate-700">%{value}</span>
    </div>
  );
}

export function NeedRow({ need, to, extra }: { need: Need; to: string; extra?: ReactNode }) {
  const firm = firmOf(need.firmId);
  return (
    <Link to={to} className="flex items-start gap-3 rounded-xl p-3 transition hover:bg-slate-50">
      <Avatar name={firm.name} brand={firm.brand} size={40} square />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-900">{need.title}</span>
          {need.confidential && <Lock className="h-3.5 w-3.5 text-slate-400" aria-label="Gizli" />}
          {need.urgency === 'acil' && <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-600">Acil</span>}
        </div>
        <div className="mt-0.5 text-xs text-slate-500">
          {firm.name} · {orgOf(firm.orgId).short} · {CATEGORY[need.category]} · {need.route === 'ag' ? 'tüm ağ' : orgOf(firm.orgId).city} · {timeAgo(need.createdAt)}
        </div>
        {extra}
      </div>
      <StatusChip status={need.status} />
    </Link>
  );
}

export function CandidateRow({ c, needTags, right }: { c: Candidate; needTags: string[]; right?: ReactNode }) {
  const s = c.solver;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
      <SolverAvatar solver={s} size={40} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-semibold text-slate-900">{s.data.name}</span>
          <ScoreBar value={c.score} />
        </div>
        <SolverKind solver={s} />
        <div className="mt-2 flex flex-wrap gap-1">
          {s.data.tags.slice(0, 5).map((t) => (
            <Tag key={t} hit={needTags.includes(t)}>
              {t}
            </Tag>
          ))}
        </div>
        {c.reasons.length > 0 && <ul className="mt-2 space-y-0.5 text-xs text-slate-500">{c.reasons.map((r) => <li key={r}>• {r}</li>)}</ul>}
      </div>
      {right}
    </div>
  );
}

export function Stepper({ stage, skipFunding }: { stage: Stage; skipFunding?: boolean }) {
  const steps = STAGES.filter((s) => !(skipFunding && s.key === 'basvuru'));
  const idx = steps.findIndex((s) => s.key === stage);
  return (
    <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
      {steps.map((s, i) => {
        const done = i < idx || stage === 'tamamlandi';
        const cur = i === idx && stage !== 'tamamlandi';
        return (
          <li key={s.key} className={cn('rounded-xl border p-3 text-xs', cur ? 'border-primary-300 bg-primary-50' : done ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-white')}>
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <span className={cn('grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold', done ? 'bg-emerald-500 text-white' : cur ? 'bg-primary-500 text-white' : 'bg-slate-200 text-slate-600')}>{done ? <Check className="h-3 w-3" /> : i + 1}</span>
              {s.label}
            </div>
            <p className="mt-1 text-slate-500">{s.hint}</p>
          </li>
        );
      })}
    </ol>
  );
}

export function Timeline({ events }: { events: NeedEvent[] }) {
  return (
    <ol className="relative space-y-4 border-l border-slate-200 pl-5">
      {[...events].reverse().map((e, i) => (
        <li key={`${e.at}-${i}`} className="relative">
          <span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full bg-primary-500 ring-4 ring-white" />
          <div className="text-sm text-slate-900">{e.text}</div>
          <div className="text-xs text-slate-500">
            {e.actor} · {timeAgo(e.at)}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function OrgIcon({ type, className }: { type: 'osb' | 'teknokent' | 'universite'; className?: string }) {
  const I = type === 'osb' ? Building2 : type === 'teknokent' ? Cpu : FlaskConical;
  return <I className={className} />;
}

export const fmtTL = (v?: number) => (v == null ? '—' : `${v.toLocaleString('tr-TR')} ₺`);
