/**
 * Proje sonu değerlendirme (firma ve çözüm sağlayıcı karşılıklı).
 * SÖZLEŞME:
 *  - ProjectFeedback({ projectId }): proje tamamlanınca değerlendirme formu ve sonuçları
 *  - useSatisfaction(projectIds): { avg: 1–5 veya null, count }
 *
 * Karşılıklı ve "kör" değerlendirme: taraflar karşı tarafın değerlendirmesini kendi değerlendirmelerini
 * gönderdikten sonra görür. TTO ve platform iki tarafı da görür.
 */
import { MessageSquareQuote, Send, Star, ThumbsUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { cn, timeAgo, uid } from '@/lib/utils';
import { PERSONAS, firmOf, type Role } from '../data';
import { firmInbox, solverIdOf, solverInbox, useKopru } from '../store';
import { Card } from '../ui';

type Side = 'firma' | 'cozucu';
type Again = 'evet' | 'belki' | 'hayir';

export interface Review {
  id: string;
  projectId: string;
  /** firma → çözüm sağlayıcıyı, cozucu → firmayı değerlendirir */
  from: Side;
  by: string;
  scores: Record<string, number>;
  comment: string;
  again: Again;
  at: number;
}

export interface FeedbackState {
  reviews: Review[];
}

const KEY = 'feedback';

/** Firma, çözüm sağlayıcıyı bu ölçütlerle değerlendirir */
export const SOLVER_CRITERIA = [
  { key: 'iletisim', label: 'İletişim' },
  { key: 'zaman', label: 'Zamanında teslim' },
  { key: 'teknik', label: 'Teknik yeterlilik' },
  { key: 'deger', label: 'Sağlanan ticari değer' },
] as const;

/** Çözüm sağlayıcı, firmayı bu ölçütlerle değerlendirir */
export const FIRM_CRITERIA = [
  { key: 'bilgi', label: 'Bilgi/numune paylaşımı' },
  { key: 'iletisim', label: 'İletişim' },
  { key: 'surec', label: 'Süreç ve ödeme' },
] as const;

const AGAIN: Record<Again, string> = { evet: 'Evet', belki: 'Belki', hayir: 'Hayır' };
const criteriaOf = (from: Side) => (from === 'firma' ? SOLVER_CRITERIA : FIRM_CRITERIA);

const DAY = 86_400_000;
const NOW = Date.now();

const SEED: FeedbackState = {
  reviews: [
    {
      id: 'fb1',
      projectId: 'p2',
      from: 'firma',
      by: 'Çankırı Makine Sanayi',
      scores: { iletisim: 5, zaman: 4, teknik: 5, deger: 4 },
      comment: 'Hakan Hoca ölçümleri vardiyayı aksatmadan sahada yaptı, ekibimize de eğitim verdi. Sonuç raporu birkaç gün gecikti; ancak önerilen reküperatörle ilk ay doğalgazda yaklaşık %15 tasarruf gördük.',
      again: 'evet',
      at: NOW - 18 * DAY,
    },
    {
      id: 'fb2',
      projectId: 'p2',
      from: 'cozucu',
      by: 'Doç. Dr. Hakan Yıldız',
      scores: { bilgi: 5, iletisim: 5, surec: 5 },
      comment: 'Bakım ekibi baca gazı ve tüketim verilerini eksiksiz paylaştı, fırına erişim her seferinde hazırdı. Ödemeler sözleşmedeki takvime uygun yapıldı.',
      again: 'evet',
      at: NOW - 17 * DAY,
    },
  ],
};

const avgOf = (r: Review) => {
  const v = Object.values(r.scores);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
};
const fmt1 = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/* ------------------------------- Yıldız bileşenleri ------------------------------ */

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const row = (cls: string) => (
    <span className="flex">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} className={cls} style={{ width: size, height: size }} />
      ))}
    </span>
  );
  return (
    <span className="relative inline-flex shrink-0" role="img" aria-label={`5 üzerinden ${fmt1(value)}`}>
      {row('text-slate-200 fill-slate-200')}
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${pct}%` }} aria-hidden>
        {row('text-amber-400 fill-amber-400 shrink-0')}
      </span>
    </span>
  );
}

function StarInput({ name, label, value, onChange }: { name: string; label: string; value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1" role="radiogroup" aria-labelledby={`${name}-l`}>
      <span id={`${name}-l`} className="text-sm font-medium text-slate-800">{label}</span>
      <div className="flex" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer p-0.5" onMouseEnter={() => setHover(n)}>
            <input type="radio" className="peer sr-only" name={name} value={n} checked={value === n} onChange={() => onChange(n)} aria-label={`${label}: ${n} yıldız`} />
            <span className="block rounded-md peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500">
              <Star className={cn('h-7 w-7 transition', n <= shown ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} aria-hidden />
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------- Görünümler --------------------------------- */

function ReviewView({ r, title, hideComment }: { r: Review; title: string; hideComment?: boolean }) {
  const avg = avgOf(r);
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</div>
        <div className="flex items-center gap-1.5">
          <Stars value={avg} />
          <span className="font-display text-sm font-bold text-slate-900">{fmt1(avg)}</span>
        </div>
      </div>
      <ul className="mt-2 space-y-1">
        {criteriaOf(r.from).map((c) => (
          <li key={c.key} className="flex items-center justify-between gap-2 text-xs text-slate-600">
            <span>{c.label}</span>
            <Stars value={r.scores[c.key] ?? 0} size={12} />
          </li>
        ))}
      </ul>
      {!hideComment && r.comment && (
        <blockquote className="mt-3 flex gap-2 rounded-lg bg-slate-50 p-2.5 text-sm text-slate-700">
          <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <span>{r.comment}</span>
        </blockquote>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        <span className={cn('inline-flex items-center gap-1', r.again === 'evet' && 'text-emerald-700')}>
          <ThumbsUp className="h-3.5 w-3.5" aria-hidden /> Tekrar çalışır: {AGAIN[r.again]}
        </span>
        <span>
          {r.by} · {timeAgo(r.at)}
        </span>
      </div>
    </div>
  );
}

function FeedbackForm({ projectId, side, by, onSubmit }: { projectId: string; side: Side; by: string; onSubmit: (r: Review) => void }) {
  const crit = criteriaOf(side);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [again, setAgain] = useState<Again | ''>('');
  const ok = crit.every((c) => (scores[c.key] ?? 0) > 0) && !!again;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ok || !again) return;
        onSubmit({ id: uid('fb'), projectId, from: side, by, scores, comment: comment.trim(), again, at: Date.now() });
      }}
    >
      <div className="space-y-2">
        {crit.map((c) => (
          <StarInput key={c.key} name={`fb-${projectId}-${c.key}`} label={c.label} value={scores[c.key] ?? 0} onChange={(v) => setScores((s) => ({ ...s, [c.key]: v }))} />
        ))}
      </div>
      <div>
        <label className="label" htmlFor={`fb-c-${projectId}`}>Yorum (isteğe bağlı)</label>
        <textarea id={`fb-c-${projectId}`} className="input" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Neler iyi gitti, neler geliştirilebilir?" />
      </div>
      <fieldset>
        <legend className="label">Tekrar birlikte çalışır mısınız?</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(AGAIN) as Again[]).map((a) => (
            <label key={a} className={cn('cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-500', again === a ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}>
              <input type="radio" className="sr-only" name={`fb-again-${projectId}`} value={a} checked={again === a} onChange={() => setAgain(a)} />
              {AGAIN[a]}
            </label>
          ))}
        </div>
      </fieldset>
      <Button type="submit" className="w-full" disabled={!ok}>
        <Send className="h-4 w-4" /> Değerlendirmeyi gönder
      </Button>
      {!ok && <p className="text-center text-xs text-slate-500">Tüm ölçütleri puanlayın ve tekrar çalışma tercihinizi seçin.</p>}
    </form>
  );
}

/* ---------------------------------- Dışa açık ---------------------------------- */

export function ProjectFeedback({ projectId }: { projectId: string }) {
  const k = useKopru();
  const toast = useToast();
  const data = k.ext<FeedbackState>(KEY, SEED);
  const p = k.state.projects.find((x) => x.id === projectId);
  const need = p && k.state.needs.find((n) => n.id === p.needId);
  if (!p || !need) return null;
  const role: Role = k.role;
  const firm = firmOf(need.firmId);
  const solver = k.findSolver(p.solverId);
  const solverName = solver?.data.name ?? 'Çözüm sağlayıcı';
  const mySide: Side | null =
    role === 'firma' && need.firmId === PERSONAS.firma.firmId ? 'firma' : (role === 'akademisyen' || role === 'tfirma') && p.solverId === solverIdOf(role) ? 'cozucu' : null;
  const observer = role === 'tto' || role === 'platform';
  const summaryOnly = role === 'osb' || role === 'teknokent';

  if (p.stage !== 'tamamlandi') {
    if (!mySide && !observer) return null;
    return (
      <Card title="Proje değerlendirmesi">
        <p className="flex items-start gap-2 text-sm text-slate-500">
          <Star className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" aria-hidden /> Proje tamamlandığında karşılıklı değerlendirme açılır.
        </p>
      </Card>
    );
  }

  const reviews = data.reviews.filter((r) => r.projectId === projectId);
  const firmReview = reviews.find((r) => r.from === 'firma');
  const solverReview = reviews.find((r) => r.from === 'cozucu');
  const titleFirm = `${firm.name} → ${solverName}`;
  const titleSolver = `${solverName} → ${firm.name}`;

  const submit = (r: Review) => {
    k.setExt<FeedbackState>(KEY, SEED, (prev) => ({ ...prev, reviews: [...prev.reviews.filter((x) => !(x.projectId === projectId && x.from === r.from)), r] }));
    const counterpart = r.from === 'firma' ? solverInbox(p.solverId) : firmInbox(need.firmId);
    const ttos = (need.ttoOrg ? [need.ttoOrg] : need.ttoIds).map((u) => `tto:${u}`);
    k.notify([counterpart, ...ttos], `${r.by} proje değerlendirmesini gönderdi (${fmt1(avgOf(r))}/5): ${need.title}`, `projeler/${projectId}`, 'feedback');
    toast({ title: 'Değerlendirmeniz gönderildi', body: 'Karşı taraf ve TTO bilgilendirildi. Teşekkürler!' });
  };

  if (mySide) {
    const mine = mySide === 'firma' ? firmReview : solverReview;
    const theirs = mySide === 'firma' ? solverReview : firmReview;
    return (
      <Card title="Proje değerlendirmesi" description={mine ? undefined : mySide === 'firma' ? `${solverName} ile çalışmanızı değerlendirin.` : `${firm.name} ile çalışmanızı değerlendirin.`}>
        {!mine ? (
          <FeedbackForm projectId={projectId} side={mySide} by={mySide === 'firma' ? firm.name : solverName} onSubmit={submit} />
        ) : (
          <div className="space-y-3">
            <ReviewView r={mine} title="Değerlendirmeniz" />
            {theirs ? (
              <ReviewView r={theirs} title={mySide === 'firma' ? `${solverName} sizi değerlendirdi` : `${firm.name} sizi değerlendirdi`} />
            ) : (
              <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Karşı tarafın değerlendirmesi bekleniyor.</p>
            )}
          </div>
        )}
      </Card>
    );
  }

  if (!observer && !summaryOnly) return null;
  return (
    <Card title="Proje değerlendirmesi" description={observer ? 'Karşılıklı değerlendirmeler' : undefined}>
      {reviews.length === 0 ? (
        <p className="text-sm text-slate-500">Taraflar henüz değerlendirme göndermedi.</p>
      ) : (
        <div className="space-y-3">
          {firmReview ? <ReviewView r={firmReview} title={titleFirm} hideComment={summaryOnly} /> : <p className="text-xs text-slate-500">{firm.name} henüz değerlendirme göndermedi.</p>}
          {solverReview ? <ReviewView r={solverReview} title={titleSolver} hideComment={summaryOnly} /> : <p className="text-xs text-slate-500">{solverName} henüz değerlendirme göndermedi.</p>}
        </div>
      )}
    </Card>
  );
}

/** Verilen projelerde firma → çözüm sağlayıcı değerlendirmelerinin ortalaması (1 ondalık) ve sayısı */
export function useSatisfaction(projectIds: string[]): { avg: number | null; count: number } {
  const k = useKopru();
  const data = k.ext<FeedbackState>(KEY, SEED);
  const list = data.reviews.filter((r) => r.from === 'firma' && projectIds.includes(r.projectId));
  if (!list.length) return { avg: null, count: 0 };
  const avg = list.reduce((a, r) => a + avgOf(r), 0) / list.length;
  return { avg: Math.round(avg * 10) / 10, count: list.length };
}
