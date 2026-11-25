/**
 * Akademisyen verisi: ORCID / YÖK Akademik'ten yayın ve proje aktarımı.
 * SÖZLEŞME:
 *  - PublicationImport({ academicId }): profil sayfasında aktarım ve yayın listesi
 *  - PublicationsCompact({ academicId }): rehber kartında kısa yayın özeti
 *
 * Not: Üretimde CSP dış çağrıları engellediğinden aktarım örnek veriyle simüle edilir.
 */
import { motion } from 'framer-motion';
import { BookOpen, Briefcase, Download, Factory, Info, Loader2, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { cn, timeAgo } from '@/lib/utils';
import { PERSONAS, SEED_ACADEMICS } from '../data';
import { useKopru } from '../store';
import { Card } from '../ui';
import { ORCID_RE, PUB_TYPE, SCHOLAR_SEED, formatOrcid, generateProjects, generatePublications, type Publication, type ScholarRecord, type ScholarState } from './scholar-data';

const KEY = 'scholar';
const fmtDate = (t: number) => new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
const sortPubs = (p: Publication[]) => [...p].sort((a, b) => b.year - a.year || a.title.localeCompare(b.title, 'tr'));
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

function useScholar(academicId: string) {
  const k = useKopru();
  const all = k.ext<ScholarState>(KEY, SCHOLAR_SEED);
  const rec: ScholarRecord | undefined = all[academicId];
  const save = (fn: (r: ScholarRecord) => ScholarRecord) =>
    k.setExt<ScholarState>(KEY, SCHOLAR_SEED, (prev) => ({ ...prev, [academicId]: fn(prev[academicId] ?? { total: 0, pubs: [], projects: [] }) }));
  return { k, rec, save };
}

type Busy = null | 'orcid' | 'yok';

export function PublicationImport({ academicId }: { academicId: string }) {
  const { k, rec, save } = useScholar(academicId);
  const toast = useToast();
  const academic = k.state.academics.find((a) => a.id === academicId);
  const editable = k.role === 'akademisyen' && academicId === PERSONAS.akademisyen.academicId;
  const [orcid, setOrcid] = useState(rec?.orcid ?? '');
  const [orcidErr, setOrcidErr] = useState('');
  const [busy, setBusy] = useState<Busy>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  if (!academic) return null;

  const pubs = sortPubs(rec?.pubs ?? []);
  const industryCount = pubs.filter((p) => p.industry).length;

  const simulate = (kind: 'orcid' | 'yok', done: () => void) => {
    setBusy(kind);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      done();
      setBusy(null);
    }, 1000 + Math.round(Math.random() * 500));
  };

  const importOrcid = () => {
    const id = formatOrcid(orcid);
    if (!ORCID_RE.test(id)) {
      setOrcidErr('ORCID iD 0000-0000-0000-000X biçiminde olmalı (16 hane, son hane X olabilir).');
      return;
    }
    setOrcidErr('');
    setOrcid(id);
    simulate('orcid', () => {
      const fresh = generatePublications(academic);
      const prevFlags = new Map((rec?.pubs ?? []).map((p) => [p.title, p.industry]));
      const merged = fresh.map((p) => ({ ...p, industry: prevFlags.get(p.title) ?? p.industry }));
      const base = SEED_ACADEMICS.find((a) => a.id === academicId)?.publications ?? academic.publications;
      const total = Math.max(merged.length, base + (academicId.charCodeAt(academicId.length - 1) % 3) + 1);
      save((r) => ({ ...r, orcid: id, pubs: merged, total, orcidAt: Date.now() }));
      k.updateAcademic(academicId, { publications: total });
      toast({ title: `${merged.length} yayın aktarıldı`, body: `ORCID kaydında toplam ${total} yayın · profil sayacı güncellendi.` });
    });
  };

  const importYok = () =>
    simulate('yok', () => {
      const projects = generateProjects(academic);
      save((r) => ({ ...r, projects, yokAt: Date.now() }));
      toast({ title: `${projects.length} proje aktarıldı`, body: 'YÖK Akademik kaydındaki TÜBİTAK ve BAP projeleri eklendi.' });
    });

  const toggleIndustry = (id: string) => save((r) => ({ ...r, pubs: r.pubs.map((p) => (p.id === id ? { ...p, industry: !p.industry } : p)) }));
  const removePub = (p: Publication) => {
    const total = Math.max(0, (rec?.total ?? 1) - 1);
    save((r) => ({ ...r, pubs: r.pubs.filter((x) => x.id !== p.id), total }));
    k.updateAcademic(academicId, { publications: total });
    toast({ title: 'Yayın listeden kaldırıldı', tone: 'info' });
  };
  const removeProject = (id: string) => save((r) => ({ ...r, projects: r.projects.filter((x) => x.id !== id) }));

  return (
    <Card title="Yayınlar ve projeler" description="ORCID ve YÖK Akademik kayıtlarınızı aktarın; sanayi ile ilgili işaretlediğiniz yayınlar uzman rehberinde öne çıkar.">
      {editable && (
        <div className="space-y-3 rounded-xl bg-slate-50 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label className="label" htmlFor={`orcid-${academicId}`}>ORCID iD</label>
              <input
                id={`orcid-${academicId}`}
                className={cn('input font-mono', orcidErr && '!border-rose-300')}
                inputMode="text"
                autoComplete="off"
                placeholder="0000-0000-0000-000X"
                value={orcid}
                maxLength={19}
                aria-invalid={!!orcidErr}
                aria-describedby={orcidErr ? `orcid-err-${academicId}` : undefined}
                onChange={(e) => {
                  setOrcid(formatOrcid(e.target.value));
                  if (orcidErr) setOrcidErr('');
                }}
              />
            </div>
            <Button type="button" onClick={importOrcid} disabled={!!busy}>
              {busy === 'orcid' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} ORCID'den aktar
            </Button>
            <Button type="button" variant="secondary" onClick={importYok} disabled={!!busy}>
              {busy === 'yok' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Briefcase className="h-4 w-4" />} YÖK Akademik'ten aktar
            </Button>
          </div>
          {orcidErr && <p id={`orcid-err-${academicId}`} className="text-xs text-rose-600">{orcidErr}</p>}
          <div aria-live="polite">
            {busy && (
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-slate-600">{busy === 'orcid' ? 'ORCID kaydı okunuyor, yayınlar eşleştiriliyor…' : 'YÖK Akademik kaydından projeler alınıyor…'}</div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <motion.div className="h-full rounded-full bg-primary-500" initial={{ width: '5%' }} animate={{ width: '95%' }} transition={{ duration: 1.2, ease: 'easeOut' }} />
                </div>
              </div>
            )}
          </div>
          <p className="flex items-start gap-1.5 text-xs text-slate-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> Demo: aktarım örnek veriyle simüle edildi; gerçek ORCID / YÖK Akademik bağlantısı kurulmaz.
          </p>
        </div>
      )}

      {(rec?.orcidAt || rec?.yokAt) && (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          {rec.orcidAt && (
            <span>
              Son ORCID aktarımı: <span className="font-medium text-slate-700">{fmtDate(rec.orcidAt)}</span> ({timeAgo(rec.orcidAt)}){rec.orcid ? ` · ${rec.orcid}` : ''}
            </span>
          )}
          {rec.yokAt && (
            <span>
              Son YÖK Akademik aktarımı: <span className="font-medium text-slate-700">{fmtDate(rec.yokAt)}</span> ({timeAgo(rec.yokAt)})
            </span>
          )}
        </div>
      )}

      {pubs.length === 0 && !rec?.projects.length ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-center">
          <BookOpen className="mx-auto h-6 w-6 text-slate-300" aria-hidden />
          <p className="mt-2 text-sm font-medium text-slate-700">Henüz aktarılmış yayın yok</p>
          <p className="mt-1 text-xs text-slate-500">{editable ? 'ORCID iD’nizi girip yayınlarınızı tek tıkla aktarın.' : 'Akademisyen yayınlarını henüz aktarmadı.'}</p>
        </div>
      ) : (
        <>
          {pubs.length > 0 && (
            <section className="mt-5" aria-label="Yayınlar">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">Yayınlar</h3>
                <span className="text-xs text-slate-500">
                  Kaynakta toplam {rec?.total ?? pubs.length} yayın · en güncel {pubs.length} tanesi · {industryCount} sanayi ile ilgili
                </span>
              </div>
              <ul className="divide-y divide-slate-100">
                {pubs.map((p) => (
                  <li key={p.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start">
                    <span className="w-fit shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold tabular-nums text-slate-700">{p.year}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium leading-snug text-slate-900">{p.title}</div>
                      <div className="mt-0.5 break-words text-xs text-slate-500">
                        {p.venue} · {PUB_TYPE[p.type]} · <span className="font-mono">DOI {p.doi}</span> · {p.source}
                      </div>
                    </div>
                    {editable ? (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          aria-pressed={p.industry}
                          aria-label={`Sanayi ile ilgili: ${p.title}`}
                          onClick={() => toggleIndustry(p.id)}
                          className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition', p.industry ? 'bg-primary-50 text-primary-700 ring-primary-200' : 'bg-white text-slate-500 ring-slate-200 hover:text-slate-800')}
                        >
                          <Factory className="h-3.5 w-3.5" aria-hidden /> Sanayi ile ilgili
                        </button>
                        <button type="button" aria-label={`Yayını kaldır: ${p.title}`} onClick={() => removePub(p)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      p.industry && (
                        <span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700 ring-1 ring-primary-200">
                          <Factory className="h-3.5 w-3.5" aria-hidden /> Sanayi ile ilgili
                        </span>
                      )
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {!!rec?.projects.length && (
            <section className="mt-5" aria-label="Projeler">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Projeler · YÖK Akademik</h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {rec.projects.map((p) => (
                  <li key={p.id} className="flex items-start gap-2 rounded-xl border border-slate-200 p-3">
                    <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium leading-snug text-slate-900">{p.title}</div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {p.program} · {p.role} · {p.years}
                      </div>
                    </div>
                    {editable && (
                      <button type="button" aria-label={`Projeyi kaldır: ${p.title}`} onClick={() => removeProject(p.id)} className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </Card>
  );
}

export function PublicationsCompact({ academicId }: { academicId: string }) {
  const { rec } = useScholar(academicId);
  if (!rec?.pubs.length) return null;
  const pubs = sortPubs(rec.pubs);
  const last = pubs[0]!;
  const ind = pubs.filter((p) => p.industry).length;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <BookOpen className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden />
        <span className="min-w-0" title={last.title}>
          Son yayın: <span className="text-slate-700">{clip(last.title, 64)}</span> ({last.year}) · {last.source === 'ORCID' ? 'ORCID' : 'YÖK Akademik'}
        </span>
      </span>
      {ind > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 font-semibold text-primary-700 ring-1 ring-primary-200">
          <Factory className="h-3 w-3" aria-hidden /> {ind} sanayi yayını
        </span>
      )}
    </div>
  );
}
