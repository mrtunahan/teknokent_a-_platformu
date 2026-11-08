import { AnimatePresence, motion } from 'framer-motion';
import {
  EyeOff,
  Ban,
  Bookmark,
  CalendarDays,
  Flag,
  FlaskConical,
  Globe,
  Globe2,
  Handshake,
  Heart,
  Layers,
  Lock,
  Mail,
  MapPin,
  PiggyBank,
  Rocket,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { label, REPORT_REASONS } from '@/data/options';
import { useStore } from '@/store/AppStore';
import { Button, Chip, CompanyLogo, Modal, VerifiedBadge } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import type { Company, ReportReason } from '@/types';
import { CoverArt } from './CoverArt';
import { ScoreRing } from './ScoreRing';

interface Props {
  company: Company | null;
  open: boolean;
  onClose: () => void;
  score?: number;
  reasons?: string[];
  /** Kart destesinden açıldıysa beğen/geç aksiyonları gösterilir */
  onLike?: () => void;
  onPass?: () => void;
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {icon} {title}
      </h3>
      {children}
    </section>
  );
}

const List = ({ items }: { items: string[] }) => (
  <ul className="space-y-2 text-sm text-slate-600">
    {items.map((i) => (
      <li key={i} className="flex gap-2.5">
        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary-500" />
        {i}
      </li>
    ))}
  </ul>
);

export function CompanyDetailSheet({ company, open, onClose, score, reasons, onLike, onPass }: Props) {
  const { state, dispatch, block } = useStore();
  const toast = useToast();
  const [reportOpen, setReportOpen] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && !reportOpen && !confirmBlock && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose, reportOpen, confirmBlock]);

  const isMatched = !!company && state.matches.some((m) => m.companyId === company.id);
  const isFav = !!company && state.favorites.includes(company.id);
  const contactVisible = isMatched && state.privacy.showContactAfterMatch;

  return createPortal(
    <AnimatePresence>
      {open && company && (
        <motion.div key="detail" className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${company.name} detayları`}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 34 }}
            className="relative flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[2rem] border border-slate-200 bg-white shadow-card sm:rounded-[2rem]"
          >
            <div className="overflow-y-auto overscroll-contain">
              <div className="relative h-44 sm:h-52">
                <CoverArt company={company} className="absolute inset-0 h-full w-full" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />
                <button onClick={onClose} className="absolute right-4 top-4 rounded-full bg-black/40 p-2 text-white backdrop-blur-md hover:bg-black/60" aria-label="Kapat">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="relative -mt-14 px-5 pb-32 sm:px-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <CompanyLogo company={company} size={88} className="ring-4 ring-white" />
                  {score !== undefined && (
                    <div className="glass flex items-center gap-3 rounded-2xl py-2 pl-2 pr-4">
                      <ScoreRing value={score} size={46} stroke={4} />
                      <div className="text-xs">
                        <div className="font-semibold text-slate-900">Uyum skoru</div>
                        <div className="text-slate-500">Profilinize göre</div>
                      </div>
                    </div>
                  )}
                </div>
                <h2 className="mt-4 flex flex-wrap items-center gap-2 font-display text-3xl font-bold tracking-tight text-slate-900">
                  {company.name} {company.verified && <VerifiedBadge withLabel className="text-base" />}
                </h2>
                <p className="mt-1 text-slate-500">{company.tagline}</p>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" /> {company.technopark}, {company.city}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4" /> {company.foundedYear}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" /> {label.size(company.employeeRange)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Rocket className="h-4 w-4" /> {label.stage(company.stage)}
                  </span>
                  <a className="flex items-center gap-1.5 text-primary-600 hover:underline" href={`https://${company.website}`} target="_blank" rel="noreferrer noopener">
                    <Globe className="h-4 w-4" /> {company.website}
                  </a>
                </div>

                {reasons && reasons.length > 0 && (
                  <div className="mt-6 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-primary-50/40 p-5">
                    <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Neden bu firma?</div>
                    <ul className="mt-3 space-y-2 text-sm text-slate-700">
                      {reasons.map((r) => (
                        <li key={r} className="flex gap-2">
                          <span className="text-emerald-600">✓</span> {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="mt-6 leading-relaxed text-slate-600">{company.description}</p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <Section icon={<FlaskConical className="h-4 w-4" />} title="Teknolojik uzmanlıklar">
                    <div className="flex flex-wrap gap-1.5">
                      {company.expertise.map((e) => (
                        <Chip key={e} tone="blue">
                          {e}
                        </Chip>
                      ))}
                    </div>
                  </Section>
                  <Section icon={<Layers className="h-4 w-4" />} title="Ürün ve hizmetler">
                    <List items={company.products} />
                  </Section>
                  <Section icon={<Handshake className="h-4 w-4 text-blue-600" />} title="İş birliği aradığı alanlar">
                    <List items={company.seeking} />
                  </Section>
                  <Section icon={<Handshake className="h-4 w-4 text-emerald-600" />} title="Sunabileceği imkânlar">
                    <List items={company.offering} />
                  </Section>
                  <Section icon={<Rocket className="h-4 w-4" />} title="İş birliği türleri">
                    <div className="flex flex-wrap gap-1.5">
                      {company.collaborationTypes.map((t) => (
                        <Chip key={t} tone="violet">
                          {label.collab(t)}
                        </Chip>
                      ))}
                    </div>
                  </Section>
                  <Section icon={<PiggyBank className="h-4 w-4" />} title="Yatırım & Ar-Ge">
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-xs text-slate-500">Yatırım ihtiyacı</dt>
                        <dd className="text-slate-700">{label.investment(company.investmentNeed)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Ar-Ge merkezi</dt>
                        <dd className="text-slate-700">{company.hasRndCenter ? 'Var' : 'Yok'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Proje ortaklığı</dt>
                        <dd className="text-slate-700">{company.seekingProjectPartner ? 'Arıyor' : '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Ar-Ge ihtiyacı</dt>
                        <dd className="text-slate-700">{company.rndNeeds[0] ?? '—'}</dd>
                      </div>
                    </dl>
                  </Section>
                </div>

                {company.internationalGoals.length > 0 && (
                  <div className="mt-4">
                    <Section icon={<Globe2 className="h-4 w-4" />} title="Uluslararası hedefler">
                      <div className="flex flex-wrap gap-1.5">
                        {company.internationalGoals.map((g) => (
                          <Chip key={g} tone="aqua">
                            {g}
                          </Chip>
                        ))}
                      </div>
                    </Section>
                  </div>
                )}

                <div className="mt-4">
                  <Section icon={<Mail className="h-4 w-4" />} title="İletişim">
                    {contactVisible ? (
                      <div className="text-sm text-slate-700">
                        <div className="font-medium">{company.contact.name}</div>
                        <div className="text-slate-500">{company.contact.title}</div>
                        <a href={`mailto:${company.contact.email}`} className="mt-1 inline-block text-primary-600 hover:underline">
                          {company.contact.email}
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        <Lock className="h-4 w-4 shrink-0 text-slate-500" />
                        İletişim bilgileri KVKK kapsamında yalnızca karşılıklı eşleşmeden sonra görünür.
                      </div>
                    )}
                  </Section>
                </div>

                <div className="mt-6 flex flex-wrap gap-2 text-sm">
                  <button
                    onClick={() => {
                      dispatch({ type: 'toggleFavorite', id: company.id });
                      toast({ title: isFav ? 'Favorilerden çıkarıldı' : 'Favorilere eklendi', tone: 'info' });
                    }}
                    className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-100"
                  >
                    <Bookmark className={`h-4 w-4 ${isFav ? 'fill-electric-400 text-electric-400' : ''}`} /> {isFav ? 'Favorilerde' : 'Favorilere ekle'}
                  </button>
                  <button onClick={() => setReportOpen(true)} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                    <Flag className="h-4 w-4" /> Raporla
                  </button>
                  <button onClick={() => setConfirmBlock(true)} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600">
                    <Ban className="h-4 w-4" /> Engelle
                  </button>
                </div>
              </div>
            </div>

            {(onLike || onPass) && (
              <div className="safe-bottom absolute inset-x-0 bottom-0 flex justify-center gap-4 bg-gradient-to-t from-white via-white/95 to-transparent px-6 pb-6 pt-10">
                <Button variant="secondary" size="lg" className="flex-1 sm:max-w-[200px]" onClick={onPass}>
                  <EyeOff className="h-5 w-5 text-slate-500" /> Gizle
                </Button>
                <Button size="lg" className="flex-1 sm:max-w-[200px]" onClick={onLike}>
                  <Heart className="h-5 w-5 fill-white" /> İlgileniyorum
                </Button>
              </div>
            )}
          </motion.div>

          <ReportModal company={company} open={reportOpen} onClose={() => setReportOpen(false)} />
          <Modal open={confirmBlock} onClose={() => setConfirmBlock(false)} title={`${company.name} engellensin mi?`}>
            <p className="text-sm leading-relaxed text-slate-500">
              Engellediğiniz firma sizi keşfet ekranında göremez, size mesaj gönderemez ve mevcut eşleşmeniz kaldırılır. Bu işlemi Hesap Ayarları &gt; Engellenenler bölümünden geri alabilirsiniz.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmBlock(false)}>
                Vazgeç
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  await block(company.id);
                  setConfirmBlock(false);
                  onClose();
                  toast({ title: `${company.name} engellendi`, tone: 'warning' });
                }}
              >
                <Ban className="h-4 w-4" /> Engelle
              </Button>
            </div>
          </Modal>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function ReportModal({ company, open, onClose }: { company: Company; open: boolean; onClose: () => void }) {
  const { report, state } = useStore();
  const toast = useToast();
  const [reason, setReason] = useState<ReportReason>('spam');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const already = state.reported.includes(company.id);
  return (
    <Modal open={open} onClose={onClose} title="Firmayı raporla">
      {already ? (
        <p className="text-sm text-slate-500">Bu firmayı daha önce raporladınız. Moderasyon ekibimiz inceleme sürecini tamamladığında bilgilendirileceksiniz.</p>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            await report(company.id, reason, details);
            setBusy(false);
            onClose();
            toast({ title: 'Raporunuz alındı', body: 'Teknokent moderasyon ekibi 24 saat içinde inceleyecek.' });
          }}
        >
          <p className="mb-4 text-sm text-slate-500">
            <span className="text-slate-900">{company.name}</span> hakkındaki raporunuz gizli tutulur; firma kimin raporladığını göremez.
          </p>
          <fieldset className="space-y-2">
            <legend className="label">Neden</legend>
            {REPORT_REASONS.map((r) => (
              <label key={r.value} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${reason === r.value ? 'border-electric-400/50 bg-primary-50 text-white' : 'border-white/[0.08] text-slate-600 hover:border-white/15'}`}>
                <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="accent-primary-500" />
                {r.label}
              </label>
            ))}
          </fieldset>
          <label className="label mt-5" htmlFor="report-details">
            Ayrıntılar (isteğe bağlı)
          </label>
          <textarea id="report-details" className="input min-h-[90px]" maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Yaşadığınız durumu kısaca açıklayın" />
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={busy}>
              <Flag className="h-4 w-4" /> {busy ? 'Gönderiliyor…' : 'Raporu gönder'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
