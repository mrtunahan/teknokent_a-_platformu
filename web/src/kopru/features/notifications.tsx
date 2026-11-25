/**
 * Bildirim merkezi.
 * SÖZLEŞME:
 *  - NotificationsPage(): rota "bildirimler"
 */
import {
  Banknote,
  Bell,
  BellOff,
  CalendarClock,
  CheckCheck,
  ChevronRight,
  ClipboardList,
  FileText,
  FlaskConical,
  FolderKanban,
  Info,
  Lightbulb,
  ListChecks,
  Mail,
  MessageSquare,
  Star,
  TrendingUp,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, ButtonLink, EmptyState } from '@/components/ui';
import { clock, cn, dayLabel, timeAgo } from '@/lib/utils';
import { firmOf, orgOf, ttoName, PERSONAS, type Notification, type Role } from '../data';
import { useKopru } from '../store';

type KindMeta = { label: string; icon: LucideIcon; tone: string };

const KINDS: Record<string, KindMeta> = {
  need: { label: 'İhtiyaç', icon: ClipboardList, tone: 'bg-amber-50 text-amber-700 ring-amber-200' },
  invite: { label: 'Davet', icon: Mail, tone: 'bg-primary-50 text-primary-700 ring-primary-200' },
  project: { label: 'Proje', icon: FolderKanban, tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  stage: { label: 'Aşama', icon: TrendingUp, tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  message: { label: 'Mesaj', icon: MessageSquare, tone: 'bg-blue-50 text-blue-700 ring-blue-200' },
  approval: { label: 'Onay', icon: UserCheck, tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  lab: { label: 'Laboratuvar', icon: FlaskConical, tone: 'bg-blue-50 text-blue-700 ring-blue-200' },
  funding: { label: 'Destek', icon: Banknote, tone: 'bg-violet-50 text-violet-700 ring-violet-200' },
  ip: { label: 'Fikri mülkiyet', icon: Lightbulb, tone: 'bg-amber-50 text-amber-700 ring-amber-200' },
  meeting: { label: 'Toplantı', icon: CalendarClock, tone: 'bg-blue-50 text-blue-700 ring-blue-200' },
  document: { label: 'Belge', icon: FileText, tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
  task: { label: 'Görev', icon: ListChecks, tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
  feedback: { label: 'Değerlendirme', icon: Star, tone: 'bg-amber-50 text-amber-700 ring-amber-200' },
};
const GENERIC: KindMeta = { label: 'Genel', icon: Bell, tone: 'bg-slate-100 text-slate-600 ring-slate-200' };
const kindKey = (n: Notification) => (n.kind && KINDS[n.kind] ? n.kind : 'genel');
const metaOf = (key: string) => KINDS[key] ?? GENERIC;

function dayKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function groupLabel(ts: number) {
  const l = dayLabel(ts);
  if (l === 'Bugün' || l === 'Dün') return l;
  const d = new Date(ts);
  return d.getFullYear() === new Date().getFullYear() ? l : d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Rol ve kuruma özel, yönlendirici boş durum metni */
function emptyCopy(role: Role, orgSel: Record<'tto' | 'osb' | 'teknokent', string>): { title: string; description: string; cta?: { to: string; label: string } } {
  const b = `/kopru/${role}`;
  switch (role) {
    case 'firma':
      return {
        title: `${firmOf(PERSONAS.firma.firmId).name} için yeni bildirim yok`,
        description: 'Bir ihtiyaç bildirdiğinizde TTO incelemeye aldığında, uzmanlar davetinizi yanıtladığında ve projeniz ilerledikçe burada haber verilir.',
        cta: { to: `${b}/ihtiyaclar/yeni`, label: 'İhtiyaç bildir' },
      };
    case 'tfirma':
      return {
        title: 'Orion Yazılım için yeni bildirim yok',
        description: 'TTO’lar veya OSB firmaları sizi bir sanayi ihtiyacına davet ettiğinde ve projelerinizde gelişme olduğunda burada görürsünüz.',
        cta: { to: `${b}/ihtiyaclar`, label: 'Sanayi davetlerine git' },
      };
    case 'akademisyen':
      return {
        title: 'Size ait yeni bildirim yok',
        description: 'TTO sizi bir ihtiyaca davet ettiğinde, profiliniz onaylandığında veya projenizde mesaj geldiğinde burada görünür. Uzmanlık profilinizi güncel tutmak davet olasılığını artırır.',
        cta: { to: `${b}/profil`, label: 'Profilimi güncelle' },
      };
    case 'tto':
      return {
        title: `${ttoName(orgSel.tto)} kutusu boş`,
        description: `${orgOf(orgSel.tto).city} ilindeki firmalar yeni ihtiyaç bildirdiğinde, akademisyenleriniz başka TTO’larca davet edildiğinde ve davetler yanıtlandığında burada haber alırsınız.`,
        cta: { to: b, label: 'İhtiyaç havuzunu aç' },
      };
    case 'osb':
      return {
        title: `${orgOf(orgSel.osb).short} kutusu boş`,
        description: 'Bölgenizdeki firmalar ihtiyaç bildirdiğinde burada haber alırsınız. Firma rolüne geçip bir ihtiyaç bildirerek akışı deneyebilirsiniz.',
        cta: { to: `${b}/ihtiyaclar`, label: 'Bölge ihtiyaçlarını gör' },
      };
    case 'teknokent':
      return {
        title: `${orgOf(orgSel.teknokent).short} kutusu boş`,
        description: 'Teknokent firmalarınız bir sanayi ihtiyacına davet edildiğinde burada haber alırsınız.',
        cta: { to: `${b}/ihtiyaclar`, label: 'Firmalarımızın katkısı' },
      };
    default:
      return {
        title: 'Platform kutusu boş',
        description: 'Ağ genelindeki kurum başvuruları ve sistem duyuruları burada görünür.',
        cta: { to: b, label: 'Kurum ağına git' },
      };
  }
}

export function NotificationsPage() {
  const { role } = useParams() as { role: Role };
  const k = useKopru();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);

  const items = useMemo(() => [...k.inbox.items].sort((a, b) => b.at - a.at), [k.inbox.items]);
  const kinds = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((n) => m.set(kindKey(n), (m.get(kindKey(n)) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);
  const visible = items.filter((n) => (filter === 'all' || kindKey(n) === filter) && (!unreadOnly || !n.read));
  const groups = useMemo(() => {
    const out: { key: string; label: string; items: Notification[] }[] = [];
    for (const n of visible) {
      const key = dayKey(n.at);
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(n);
      else out.push({ key, label: groupLabel(n.at), items: [n] });
    }
    return out;
  }, [visible]);

  const open = (n: Notification) => {
    if (!n.read) k.markRead([n.id]);
    if (n.link) navigate(`/kopru/${role}/${n.link}`);
  };
  const empty = emptyCopy(role, k.state.orgSel);
  const chip = (active: boolean) =>
    cn('inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition', active ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300');

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        title="Bildirimler"
        description={k.inbox.unread ? `${k.inbox.unread} okunmamış bildiriminiz var.` : 'Tüm bildirimleri okudunuz.'}
        actions={
          items.length > 0 ? (
            <Button size="sm" variant="secondary" onClick={() => k.markRead()} disabled={!k.inbox.unread} aria-label="Tümünü okundu say">
              <CheckCheck className="h-4 w-4" /> Tümünü okundu say
            </Button>
          ) : undefined
        }
      />

      <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Gerçek sistemde bu bildirimler e-posta ile de gönderilir.</span>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<BellOff className="h-6 w-6" />}
          title={empty.title}
          description={empty.description}
          action={empty.cta ? <ButtonLink to={empty.cta.to}>{empty.cta.label}</ButtonLink> : undefined}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Bildirim türü filtresi">
            <button type="button" className={chip(filter === 'all')} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
              Tümü ({items.length})
            </button>
            {kinds.map(([key, count]) => {
              const m = metaOf(key);
              const Icon = m.icon;
              return (
                <button key={key} type="button" className={chip(filter === key)} aria-pressed={filter === key} onClick={() => setFilter(key)}>
                  <Icon className="h-3.5 w-3.5" aria-hidden /> {m.label} ({count})
                </button>
              );
            })}
            <span className="mx-1 hidden h-5 w-px bg-slate-200 sm:inline-block" aria-hidden />
            <button type="button" className={chip(unreadOnly)} aria-pressed={unreadOnly} onClick={() => setUnreadOnly((v) => !v)}>
              Yalnızca okunmamış ({k.inbox.unread})
            </button>
          </div>

          {groups.length === 0 ? (
            <p className="glass rounded-2xl p-6 text-center text-sm text-slate-500">Bu filtrede bildirim yok.</p>
          ) : (
            groups.map((g) => (
              <section key={g.key} aria-label={g.label}>
                <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{g.label}</h2>
                <ul className="glass divide-y divide-slate-100 overflow-hidden rounded-2xl">
                  {g.items.map((n) => {
                    const m = metaOf(kindKey(n));
                    const Icon = m.icon;
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => open(n)}
                          className={cn('flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50', !n.read && 'bg-primary-50/50')}
                        >
                          <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1', m.tone)} aria-hidden>
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={cn('block break-words text-sm', n.read ? 'text-slate-600' : 'font-semibold text-slate-900')}>{n.text}</span>
                            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                              <span>{m.label}</span>
                              <span aria-hidden>·</span>
                              <time dateTime={new Date(n.at).toISOString()} title={new Date(n.at).toLocaleString('tr-TR')}>
                                {clock(n.at)} · {timeAgo(n.at)}
                              </time>
                              {!n.read && <span className="sr-only">(okunmamış)</span>}
                            </span>
                          </span>
                          {!n.read && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary-500" aria-hidden />}
                          {n.link && <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" aria-hidden />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </>
      )}
    </div>
  );
}
