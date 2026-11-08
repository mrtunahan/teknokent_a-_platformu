import { AnimatePresence, motion } from 'framer-motion';
import { Award, Ban, EyeOff, CalendarDays, FileText, Flag, Globe, Handshake, Heart, Layers, MapPin, Rocket, Users, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { REPORT_REASONS } from '@/data/options';
import { Button, Chip, Modal, VerifiedBadge } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { CoverArt } from '@/components/discover/CoverArt';
import { ScoreRing } from '@/components/discover/ScoreRing';
import type { ReportReason } from '@/types';
import { api } from './api';
import { useAction, useLoad } from './hooks';
import { CERTIFICATES, URGENCY, fmtDate, fmtMoney, label } from './labels';
import type { CompanyDetail, Need, Offer } from './types';
import { Alert, Logo, Spinner, brandFor } from './ui';

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

function Statement({ x, need }: { x: Offer | Need; need?: boolean }) {
  const n = x as Need;
  return (
    <li className="rounded-xl bg-slate-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-slate-900">{x.tag?.name ?? '—'}</span>
        <Chip tone={need ? 'violet' : 'aqua'} className="!text-[10px]">
          {label.collab(x.collaborationType)}
        </Chip>
        {need && n.urgency && n.urgency !== 'general' && <Chip className="!text-[10px]">{URGENCY[n.urgency]}</Chip>}
      </div>
      {x.description && <p className="mt-1.5 text-sm text-slate-500">{x.description}</p>}
      {need && (n.budgetRange?.min != null || n.budgetRange?.max != null) && (
        <p className="mt-1 text-xs text-slate-500">
          Bütçe: {fmtMoney(n.budgetRange?.min)} {n.budgetRange?.max != null && `– ${fmtMoney(n.budgetRange.max)}`}
        </p>
      )}
    </li>
  );
}

interface Props {
  companyId: string | null;
  onClose: () => void;
  onLike?: () => void;
  onPass?: () => void;
  /** Engelleme/rapor sonrası listeyi yenilemek için */
  onBlocked?: (id: string) => void;
}

/** Canlı firma detayı (GET /companies/:id): belgeler, referanslar, sunuyor/arıyor, rapor ve engelleme. */
export function CompanySheet({ companyId, onClose, onLike, onPass, onBlocked }: Props) {
  const open = !!companyId;
  const detail = useLoad(() => (companyId ? api.get<{ company: CompanyDetail }>(`/companies/${companyId}`) : Promise.resolve(null)), [companyId]);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const act = useAction();
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && !reportOpen && !blockOpen && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose, reportOpen, blockOpen]);

  const c = detail.data?.company;
  const tp = c && typeof c.technopark === 'object' ? c.technopark : undefined;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div key="sheet" className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={c ? `${c.name} detayları` : 'Firma detayı'}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 34 }}
            className="relative flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[2rem] border border-slate-200 bg-white shadow-card sm:rounded-[2rem]"
          >
            <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full bg-black/40 p-2 text-white backdrop-blur-md hover:bg-black/60" aria-label="Kapat">
              <X className="h-5 w-5" />
            </button>
            {detail.loading ? (
              <Spinner className="min-h-[300px]" />
            ) : detail.error || !c ? (
              <div className="p-8">
                <Alert error={detail.error ?? new Error('Firma bulunamadı.')} />
              </div>
            ) : (
              <>
                <div className="overflow-y-auto overscroll-contain">
                  <div className="relative h-40 sm:h-48">
                    <CoverArt company={{ id: c.id, brand: brandFor(c.name), cover: 'mesh' }} className="absolute inset-0 h-full w-full" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />
                  </div>
                  <div className={`relative -mt-14 px-5 sm:px-8 ${onLike || onPass ? 'pb-32' : 'pb-8'}`}>
                    <div className="flex flex-wrap items-end justify-between gap-4">
                      <Logo company={c} size={88} className="ring-4 ring-white" />
                      {c.matchPercent != null && (
                        <div className="glass flex items-center gap-3 rounded-2xl py-2 pl-2 pr-4">
                          <ScoreRing value={c.matchPercent} size={46} stroke={4} />
                          <div className="text-xs">
                            <div className="font-semibold text-slate-900">Uyum skoru</div>
                            <div className="text-slate-500">Profilinize göre</div>
                          </div>
                        </div>
                      )}
                    </div>
                    <h2 className="mt-4 flex flex-wrap items-center gap-2 font-display text-3xl font-bold tracking-tight text-slate-900">
                      {c.name} {c.verified && <VerifiedBadge withLabel className="text-base" />}
                    </h2>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                      {(tp?.name || c.city) && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4" /> {[tp?.name, c.city || tp?.city].filter(Boolean).join(', ')}
                        </span>
                      )}
                      {c.foundedYear && (
                        <span className="flex items-center gap-1.5">
                          <CalendarDays className="h-4 w-4" /> {c.foundedYear}
                        </span>
                      )}
                      {c.employeeRange && (
                        <span className="flex items-center gap-1.5">
                          <Users className="h-4 w-4" /> {label.size(c.employeeRange)}
                        </span>
                      )}
                      {c.stage && (
                        <span className="flex items-center gap-1.5">
                          <Rocket className="h-4 w-4" /> {label.stage(c.stage)}
                        </span>
                      )}
                      {c.website && (
                        <a className="flex items-center gap-1.5 text-primary-600 hover:underline" href={/^https?:/.test(c.website) ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer noopener">
                          <Globe className="h-4 w-4" /> {c.website.replace(/^https?:\/\//, '')}
                        </a>
                      )}
                    </div>

                    {c.reasons.length > 0 && (
                      <div className="mt-6 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-primary-50/40 p-5">
                        <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Neden bu firma?</div>
                        <ul className="mt-3 space-y-2 text-sm text-slate-700">
                          {c.reasons.map((r) => (
                            <li key={r} className="flex gap-2">
                              <span className="text-emerald-600">✓</span> {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {c.description && <p className="mt-6 whitespace-pre-line leading-relaxed text-slate-600">{c.description}</p>}

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <Section icon={<Handshake className="h-4 w-4 text-emerald-600" />} title="Sunuyor">
                        {c.offers.length ? (
                          <ul className="space-y-2">
                            {c.offers.map((o, i) => (
                              <Statement key={o.id ?? i} x={o} />
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-slate-500">Belirtilmemiş</p>
                        )}
                      </Section>
                      <Section icon={<Handshake className="h-4 w-4 text-blue-600" />} title="Arıyor">
                        {c.needs.length ? (
                          <ul className="space-y-2">
                            {c.needs.map((n, i) => (
                              <Statement key={n.id ?? i} x={n} need />
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-slate-500">Belirtilmemiş</p>
                        )}
                      </Section>
                      {(c.sectors.length > 0 || c.technologies.length > 0) && (
                        <Section icon={<Layers className="h-4 w-4" />} title="Sektör & teknolojiler">
                          <div className="flex flex-wrap gap-1.5">
                            {c.sectors.map((s) => (
                              <Chip key={s.id} tone="violet">
                                {s.name}
                              </Chip>
                            ))}
                            {c.technologies.map((s) => (
                              <Chip key={s.id} tone="blue">
                                {s.name}
                              </Chip>
                            ))}
                          </div>
                        </Section>
                      )}
                      {c.certificates.length > 0 && (
                        <Section icon={<Award className="h-4 w-4" />} title="Belgeler">
                          <ul className="space-y-2 text-sm">
                            {c.certificates.map((x) => (
                              <li key={x.id} className="flex items-center gap-2 text-slate-600">
                                <Chip tone="aqua" className="!text-[11px]">
                                  {CERTIFICATES[x.type]}
                                </Chip>
                                <span className="min-w-0 flex-1 truncate">{x.title}</span>
                                {x.validUntil && <span className="text-xs text-slate-500">{fmtDate(x.validUntil)}</span>}
                                {x.document && (
                                  <button onClick={() => act.run(() => api.openFile(`/companies/${c.id}/certificates/${x.id}/document`))} className="text-primary-600" aria-label="Belgeyi aç">
                                    <FileText className="h-4 w-4" />
                                  </button>
                                )}
                              </li>
                            ))}
                          </ul>
                          <Alert error={act.error} className="mt-3" />
                        </Section>
                      )}
                    </div>

                    {c.references.length > 0 && (
                      <div className="mt-4">
                        <Section icon={<Award className="h-4 w-4" />} title="Referanslar">
                          <ul className="space-y-3">
                            {c.references.map((r, i) => (
                              <li key={i}>
                                <div className="text-sm font-medium text-slate-900">
                                  {r.title} {r.client && <span className="font-normal text-slate-500">· {r.client}</span>}
                                </div>
                                {r.description && <p className="text-sm text-slate-500">{r.description}</p>}
                              </li>
                            ))}
                          </ul>
                        </Section>
                      </div>
                    )}

                    <div className="mt-6 flex flex-wrap gap-2 text-sm">
                      <button onClick={() => setReportOpen(true)} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                        <Flag className="h-4 w-4" /> Raporla
                      </button>
                      <button onClick={() => setBlockOpen(true)} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600">
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
                <LiveReportModal companyId={c.id} companyName={c.name} open={reportOpen} onClose={() => setReportOpen(false)} />
                <Modal open={blockOpen} onClose={() => setBlockOpen(false)} title={`${c.name} engellensin mi?`}>
                  <p className="text-sm leading-relaxed text-slate-500">Engellediğiniz firma akışınızda görünmez, size ulaşamaz ve varsa eşleşmeniz kapatılır.</p>
                  <Alert error={act.error} className="mt-4" />
                  <div className="mt-6 flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setBlockOpen(false)}>
                      Vazgeç
                    </Button>
                    <Button
                      variant="danger"
                      disabled={act.busy}
                      onClick={() =>
                        act.run(async () => {
                          await api.post(`/companies/me/blocks/${c.id}`);
                          setBlockOpen(false);
                          toast({ title: `${c.name} engellendi`, tone: 'warning' });
                          onBlocked?.(c.id);
                          onClose();
                        })
                      }
                    >
                      <Ban className="h-4 w-4" /> Engelle
                    </Button>
                  </div>
                </Modal>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function LiveReportModal({ companyId, companyName, open, onClose }: { companyId: string; companyName: string; open: boolean; onClose: () => void }) {
  const [reason, setReason] = useState<ReportReason>('spam');
  const [details, setDetails] = useState('');
  const { run, busy, error } = useAction();
  const toast = useToast();
  return (
    <Modal open={open} onClose={onClose} title="Firmayı raporla">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await api.post('/reports', { targetCompanyId: companyId, reason, details: details || undefined });
            onClose();
            toast({ title: 'Raporunuz alındı', body: 'Teknokent yönetimi inceleyecek.' });
          });
        }}
      >
        <p className="mb-4 text-sm text-slate-500">
          <span className="text-slate-900">{companyName}</span> hakkındaki raporunuz gizli tutulur.
        </p>
        <Alert error={error} className="mb-4" />
        <fieldset className="space-y-2">
          <legend className="label">Neden</legend>
          {REPORT_REASONS.map((r) => (
            <label key={r.value} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${reason === r.value ? 'border-electric-400/50 bg-primary-50 text-white' : 'border-white/[0.08] text-slate-600 hover:border-white/15'}`}>
              <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="accent-primary-500" />
              {r.label}
            </label>
          ))}
        </fieldset>
        <label className="label mt-5" htmlFor="lr-details">
          Ayrıntılar (isteğe bağlı)
        </label>
        <textarea id="lr-details" className="input min-h-[90px]" maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} />
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Vazgeç
          </Button>
          <Button type="submit" disabled={busy}>
            <Flag className="h-4 w-4" /> {busy ? 'Gönderiliyor…' : 'Raporu gönder'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
