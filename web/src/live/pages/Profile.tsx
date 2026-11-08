import { FileText, ImagePlus, Plus, Trash2, Upload, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { COLLABORATION_TYPES, EMPLOYEE_RANGES, STAGES } from '@/data/options';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, Chip, Modal, VerifiedBadge } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import type { CollaborationType } from '@/types';
import { api } from '../api';
import { useAuth } from '../auth';
import { useAction, useLoad } from '../hooks';
import { CERTIFICATES, MISSING, REGION, ROLES, URGENCY, VERIFICATION, VISIBILITY, toDateInput } from '../labels';
import type { CertificateType, Member, OwnCompany, Region, Role, Tag, Urgency, Visibility } from '../types';
import { Alert, Field, Logo, Select, Spinner, Tabs, TagSelect } from '../ui';

const TABS = [
  ['general', 'Genel'],
  ['offers', 'Sunuyorum'],
  ['needs', 'Arıyorum'],
  ['certs', 'Belgeler'],
  ['refs', 'Referanslar'],
  ['prefs', 'Eşleşme tercihleri'],
  ['team', 'Ekip'],
] as const;
type TabKey = (typeof TABS)[number][0];

type Saved = (c: OwnCompany) => void;

export default function LiveProfile() {
  const auth = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState<TabKey>('general');
  const profile = useLoad(() => api.get<{ company: OwnCompany }>('/companies/me'), []);
  const tags = useLoad(() => api.get<{ tags: Tag[] }>('/tags'), []);

  const byType = useMemo(() => {
    const all = tags.data?.tags ?? [];
    return {
      sector: all.filter((t) => t.type === 'sector'),
      technology: all.filter((t) => t.type === 'technology'),
      competence: all.filter((t) => t.type === 'competence' || t.type === 'technology'),
    };
  }, [tags.data]);

  if (profile.loading || tags.loading) return <Spinner className="min-h-[60vh]" />;
  if (profile.error || !profile.data)
    return (
      <div className="p-6">
        <Alert error={profile.error} />
      </div>
    );
  const c = profile.data.company;
  const readOnly = !auth.isCompanyAdmin;
  const onSaved: Saved = (company) => {
    profile.setData({ company });
    toast({ title: 'Kaydedildi', body: 'Önerileriniz güncelleniyor.' });
    void auth.refresh();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader title="Firma Profilim" description="Diğer firmaların sizi nasıl gördüğünü yönetin." />

      <div className="glass flex flex-col gap-5 rounded-3xl p-5 sm:flex-row sm:items-center sm:p-6">
        <Logo company={c} size={72} />
        <div className="min-w-0 flex-1">
          <h2 className="flex flex-wrap items-center gap-2 font-display text-2xl font-bold text-slate-900">
            {c.name} {c.verificationStatus === 'approved' && <VerifiedBadge withLabel className="text-base" />}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <Chip tone={c.verificationStatus === 'approved' ? 'aqua' : 'violet'}>{VERIFICATION[c.verificationStatus]}</Chip>
            {c.underReview && <Chip>İnceleme altında</Chip>}
            <span className="text-slate-500">VKN {c.taxNumber}</span>
          </div>
          {c.verificationStatus === 'rejected' && c.verificationNote && <p className="mt-2 text-sm text-rose-600">Ret nedeni: {c.verificationNote}</p>}
        </div>
        <div className="sm:w-64">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Profil gücü</span>
            <span className="font-semibold text-slate-900">%{c.completion.percent}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-gradient transition-all duration-700" style={{ width: `${c.completion.percent}%` }} />
          </div>
          {c.completion.missing.length > 0 && <p className="mt-2 text-xs text-slate-500">Eksik: {c.completion.missing.map((k) => MISSING[k] ?? k).join(', ')}</p>}
        </div>
      </div>

      {readOnly && <Alert kind="info">Profili yalnızca firma yöneticisi düzenleyebilir.</Alert>}
      <Tabs id="profile" tabs={TABS} value={tab} onChange={setTab} />

      <div className="glass rounded-3xl p-5 sm:p-7">
        <fieldset disabled={readOnly && tab !== 'team'} className="min-w-0">
          {tab === 'general' && <General c={c} tags={byType} onSaved={onSaved} />}
          {tab === 'offers' && <Statements kind="offers" c={c} tags={byType.competence} onSaved={onSaved} />}
          {tab === 'needs' && <Statements kind="needs" c={c} tags={byType.competence} onSaved={onSaved} />}
          {tab === 'certs' && <Certificates c={c} onSaved={onSaved} />}
          {tab === 'refs' && <References c={c} onSaved={onSaved} />}
          {tab === 'prefs' && <Preferences c={c} tags={byType.sector} onSaved={onSaved} />}
          {tab === 'team' && <Team />}
        </fieldset>
      </div>
    </div>
  );
}

function SaveBar({ busy, children }: { busy: boolean; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-5">
      {children}
      <Button type="submit" disabled={busy}>
        {busy ? 'Kaydediliyor…' : 'Kaydet'}
      </Button>
    </div>
  );
}

/* ---------------------------------- Genel ----------------------------------- */

function LogoUpload({ c, onSaved }: { c: OwnCompany; onSaved: Saved }) {
  const input = useRef<HTMLInputElement>(null);
  const { run, busy, error } = useAction();
  const reload = async () => onSaved((await api.get<{ company: OwnCompany }>('/companies/me')).company);
  return (
    <div className="flex items-center gap-5">
      <button type="button" onClick={() => input.current?.click()} className="group relative shrink-0" aria-label="Logo yükle">
        <Logo company={c} size={88} />
        <span className="absolute inset-0 grid place-items-center rounded-[26px] bg-black/50 opacity-0 transition group-hover:opacity-100">
          <ImagePlus className="h-6 w-6 text-slate-900" />
        </span>
      </button>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => input.current?.click()}>
            <Upload className="h-4 w-4" /> {busy ? 'Yükleniyor…' : 'Logo yükle'}
          </Button>
          {c.logoUrl && (
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => run(async () => { await api.del('/companies/me/logo'); await reload(); })}>
              Kaldır
            </Button>
          )}
        </div>
        <p className="text-xs text-slate-500">PNG, JPEG veya WEBP · en fazla 2 MB · kare görsel önerilir</p>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void run(async () => { await api.upload('/companies/me/logo', f); await reload(); });
            e.target.value = '';
          }}
        />
        <Alert error={error} />
      </div>
    </div>
  );
}

function General({ c, tags, onSaved }: { c: OwnCompany; tags: { sector: Tag[]; technology: Tag[] }; onSaved: Saved }) {
  const [f, setF] = useState({
    name: c.name || '',
    website: c.website || '',
    foundedYear: c.foundedYear ? String(c.foundedYear) : '',
    employeeRange: c.employeeRange || '',
    stage: c.stage || '',
    city: c.city || '',
    description: c.description || '',
    sectors: c.sectors.map((s) => String(s.id)),
    technologies: c.technologies.map((s) => String(s.id)),
  });
  const { run, busy, error } = useAction();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void run(async () => {
          const website = f.website && !/^https?:\/\//.test(f.website) ? `https://${f.website}` : f.website;
          const body: Record<string, unknown> = { ...f, website, foundedYear: f.foundedYear ? Number(f.foundedYear) : undefined };
          for (const k of ['employeeRange', 'stage']) if (!body[k]) delete body[k];
          onSaved((await api.patch<{ company: OwnCompany }>('/companies/me', body)).company);
        });
      }}
    >
      <LogoUpload c={c} onSaved={onSaved} />
      <Alert error={error} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Firma adı" htmlFor="g-name">
          <input id="g-name" className="input" required value={f.name} onChange={set('name')} />
        </Field>
        <Field label="Web sitesi" htmlFor="g-web">
          <input id="g-web" className="input" placeholder="https://firmaniz.com.tr" value={f.website} onChange={set('website')} />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Kuruluş yılı" htmlFor="g-year">
          <input id="g-year" className="input" type="number" min={1900} max={2100} value={f.foundedYear} onChange={set('foundedYear')} />
        </Field>
        <Field label="Çalışan sayısı" htmlFor="g-emp">
          <Select id="g-emp" value={f.employeeRange} onChange={set('employeeRange')}>
            <option value="">Seçin…</option>
            {EMPLOYEE_RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Aşama" htmlFor="g-stage">
          <Select id="g-stage" value={f.stage} onChange={set('stage')}>
            <option value="">Seçin…</option>
            {STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Şehir" htmlFor="g-city">
        <input id="g-city" className="input" value={f.city} onChange={set('city')} />
      </Field>
      <Field label="Sektörler" htmlFor="g-sectors">
        <TagSelect id="g-sectors" multiple max={10} tags={tags.sector} value={f.sectors} onChange={(v: string[]) => setF({ ...f, sectors: v })} />
      </Field>
      <Field label="Teknolojiler" htmlFor="g-tech">
        <TagSelect id="g-tech" multiple max={15} tags={tags.technology} value={f.technologies} onChange={(v: string[]) => setF({ ...f, technologies: v })} />
      </Field>
      <Field label="Firma açıklaması" htmlFor="g-desc" hint={`${f.description.length}/3000 · Ne yaptığınızı somut anlatın; açıklama eşleşme skoruna katkı sağlar.`}>
        <textarea id="g-desc" className="input min-h-[140px]" maxLength={3000} value={f.description} onChange={set('description')} />
      </Field>
      <SaveBar busy={busy} />
    </form>
  );
}

/* ------------------------------ Sunuyorum / Arıyorum ------------------------------ */

interface Row {
  tag: string;
  collaborationType: CollaborationType;
  description: string;
  urgency: Urgency;
  visibility: Visibility;
  expiresAt: string;
  budgetMin: string;
  budgetMax: string;
}

const emptyRow = (): Row => ({ tag: '', collaborationType: 'joint_rnd', description: '', urgency: 'general', visibility: 'public', expiresAt: '', budgetMin: '', budgetMax: '' });

function Statements({ kind, c, tags, onSaved }: { kind: 'offers' | 'needs'; c: OwnCompany; tags: Tag[]; onSaved: Saved }) {
  const isNeed = kind === 'needs';
  const [list, setList] = useState<Row[]>(() =>
    (isNeed ? c.needs : c.offers).map((x) => {
      const n = x as OwnCompany['needs'][number];
      return {
        ...emptyRow(),
        tag: String(x.tag?.id ?? ''),
        collaborationType: x.collaborationType,
        description: x.description ?? '',
        urgency: n.urgency ?? 'general',
        visibility: n.visibility ?? 'public',
        expiresAt: toDateInput(n.expiresAt),
        budgetMin: n.budgetRange?.min != null ? String(n.budgetRange.min) : '',
        budgetMax: n.budgetRange?.max != null ? String(n.budgetRange.max) : '',
      };
    }),
  );
  const { run, busy, error } = useAction();
  const upd = (i: number, patch: Partial<Row>) => setList(list.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void run(async () => {
          const payload = list
            .filter((x) => x.tag)
            .map((x) => {
              const o: Record<string, unknown> = { tag: x.tag, collaborationType: x.collaborationType, description: x.description };
              if (isNeed) {
                Object.assign(o, { urgency: x.urgency, visibility: x.visibility, expiresAt: x.expiresAt ? new Date(x.expiresAt).toISOString() : null });
                if (x.budgetMin !== '' || x.budgetMax !== '')
                  o.budgetRange = { ...(x.budgetMin !== '' ? { min: Number(x.budgetMin) } : {}), ...(x.budgetMax !== '' ? { max: Number(x.budgetMax) } : {}) };
              }
              return o;
            });
          onSaved((await api.put<{ company: OwnCompany }>(`/companies/me/${kind}`, { [kind]: payload })).company);
        });
      }}
    >
      <p className="text-sm text-slate-500">
        {isNeed
          ? 'Neye ihtiyacınız var? En fazla 5 madde. “Yalnızca eşleşince görünür” seçilen maddeler skora katılır ama kartınızda gösterilmez.'
          : 'Neyi en iyi yapıyorsunuz? En fazla 5 madde. Örnek: “Görüntü işleme — taşeron — endüstriyel kalite kontrol için hata tespiti modelleri”.'}
      </p>
      <Alert error={error} />
      {list.map((x, i) => (
        <div key={i} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {isNeed ? 'İhtiyaç' : 'Yetkinlik'} {i + 1}
            </span>
            <button type="button" onClick={() => setList(list.filter((_, j) => j !== i))} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-rose-600" aria-label="Maddeyi kaldır">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={isNeed ? 'İhtiyaç alanı' : 'Yetkinlik'}>
              <TagSelect tags={tags} value={x.tag} onChange={(v: string) => upd(i, { tag: v })} />
            </Field>
            <Field label="İş birliği türü" htmlFor={`st-ct-${i}`}>
              <Select id={`st-ct-${i}`} value={x.collaborationType} onChange={(e) => upd(i, { collaborationType: e.target.value as CollaborationType })}>
                {COLLABORATION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Kısa açıklama" htmlFor={`st-d-${i}`}>
            <textarea id={`st-d-${i}`} rows={2} maxLength={500} className="input" value={x.description} onChange={(e) => upd(i, { description: e.target.value })} />
          </Field>
          {isNeed && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Aciliyet" htmlFor={`st-u-${i}`}>
                  <Select id={`st-u-${i}`} value={x.urgency} onChange={(e) => upd(i, { urgency: e.target.value as Urgency })}>
                    {Object.entries(URGENCY).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Görünürlük" htmlFor={`st-v-${i}`}>
                  <Select id={`st-v-${i}`} value={x.visibility} onChange={(e) => upd(i, { visibility: e.target.value as Visibility })}>
                    {Object.entries(VISIBILITY).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Bitiş tarihi" htmlFor={`st-e-${i}`}>
                  <input id={`st-e-${i}`} type="date" className="input [color-scheme:dark]" value={x.expiresAt} onChange={(e) => upd(i, { expiresAt: e.target.value })} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Bütçe alt sınırı (TRY)" htmlFor={`st-bmin-${i}`}>
                  <input id={`st-bmin-${i}`} type="number" min={0} className="input" value={x.budgetMin} onChange={(e) => upd(i, { budgetMin: e.target.value })} />
                </Field>
                <Field label="Bütçe üst sınırı (TRY)" htmlFor={`st-bmax-${i}`}>
                  <input id={`st-bmax-${i}`} type="number" min={0} className="input" value={x.budgetMax} onChange={(e) => upd(i, { budgetMax: e.target.value })} />
                </Field>
              </div>
            </>
          )}
        </div>
      ))}
      <SaveBar busy={busy}>
        {list.length < 5 && (
          <Button type="button" variant="secondary" onClick={() => setList([...list, emptyRow()])} className="mr-auto">
            <Plus className="h-4 w-4" /> Madde ekle
          </Button>
        )}
      </SaveBar>
    </form>
  );
}

/* --------------------------------- Belgeler --------------------------------- */

interface CertRow {
  id?: string;
  type: CertificateType;
  title: string;
  validUntil: string;
  document?: OwnCompany['certificates'][number]['document'];
}

function Certificates({ c, onSaved }: { c: OwnCompany; onSaved: Saved }) {
  const toRows = (x: OwnCompany) => x.certificates.map((y) => ({ id: y.id, type: y.type, title: y.title ?? '', validUntil: toDateInput(y.validUntil), document: y.document }));
  const [list, setList] = useState<CertRow[]>(() => toRows(c));
  useEffect(() => {
    setList((cur) => cur.map((x) => ({ ...x, document: c.certificates.find((y) => String(y.id) === String(x.id))?.document ?? x.document })));
  }, [c.certificates]);
  const { run, busy, error } = useAction();
  const upd = (i: number, patch: Partial<CertRow>) => setList(list.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const reload = async () => onSaved((await api.get<{ company: OwnCompany }>('/companies/me')).company);
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void run(async () => {
          const r = await api.put<{ company: OwnCompany }>('/companies/me/certificates', {
            certificates: list.map((x) => ({ ...(x.id ? { id: x.id } : {}), type: x.type, title: x.title, validUntil: x.validUntil ? new Date(x.validUntil).toISOString() : null })),
          });
          onSaved(r.company);
          setList(toRows(r.company));
        });
      }}
    >
      <p className="text-sm text-slate-500">ISO, Ar-Ge merkezi, tesis güvenlik belgesi gibi belgeler bazı firmalar için zorunlu filtredir. Dosyaları yalnızca onaylı firmalar görüntüleyebilir.</p>
      <Alert error={error} />
      {list.map((x, i) => (
        <div key={x.id ?? `new-${i}`} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Tür" htmlFor={`c-t-${i}`}>
              <Select id={`c-t-${i}`} value={x.type} onChange={(e) => upd(i, { type: e.target.value as CertificateType })}>
                {Object.entries(CERTIFICATES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Başlık / numara" htmlFor={`c-n-${i}`}>
              <input id={`c-n-${i}`} className="input" value={x.title} onChange={(e) => upd(i, { title: e.target.value })} />
            </Field>
            <Field label="Geçerlilik" htmlFor={`c-v-${i}`}>
              <input id={`c-v-${i}`} type="date" className="input [color-scheme:dark]" value={x.validUntil} onChange={(e) => upd(i, { validUntil: e.target.value })} />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {x.id ? (
              <>
                {x.document ? (
                  <>
                    <button type="button" className="inline-flex items-center gap-1.5 text-primary-600 hover:underline" onClick={() => run(() => api.openFile(`/companies/${c.id}/certificates/${x.id}/document`))}>
                      <FileText className="h-4 w-4" /> {x.document.name}
                    </button>
                    <button type="button" className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100" onClick={() => run(async () => { await api.del(`/companies/me/certificates/${x.id}/document`); await reload(); })}>
                      Dosyayı kaldır
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-slate-500">Dosya yüklenmedi</span>
                )}
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100">
                  <Upload className="h-3.5 w-3.5" /> {x.document ? 'Dosyayı değiştir' : 'Dosya yükle'}
                  <input
                    type="file"
                    accept="application/pdf,image/png,image/jpeg"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void run(async () => { await api.upload(`/companies/me/certificates/${x.id}/document`, f); await reload(); });
                      e.target.value = '';
                    }}
                  />
                </label>
                <span className="text-xs text-slate-500">PDF/PNG/JPEG · en fazla 10 MB</span>
              </>
            ) : (
              <span className="text-xs text-slate-500">Dosya yüklemek için önce kaydedin.</span>
            )}
            <button type="button" onClick={() => setList(list.filter((_, j) => j !== i))} className="ml-auto rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-rose-600" aria-label="Belgeyi kaldır">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
      <SaveBar busy={busy}>
        <Button type="button" variant="secondary" className="mr-auto" onClick={() => setList([...list, { type: 'iso_9001', title: '', validUntil: '' }])}>
          <Plus className="h-4 w-4" /> Belge ekle
        </Button>
      </SaveBar>
    </form>
  );
}

/* -------------------------------- Referanslar ------------------------------- */

function References({ c, onSaved }: { c: OwnCompany; onSaved: Saved }) {
  const [list, setList] = useState(() => c.references.map((r) => ({ title: r.title, client: r.client ?? '', description: r.description ?? '', hidden: !!r.hidden })));
  const { run, busy, error } = useAction();
  const upd = (i: number, patch: Partial<(typeof list)[number]>) => setList(list.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void run(async () => onSaved((await api.put<{ company: OwnCompany }>('/companies/me/references', { references: list.filter((x) => x.title.trim()) })).company));
      }}
    >
      <p className="text-sm text-slate-500">Tamamladığınız projeler güven sinyalidir. Gizli işaretlenen referansları yalnızca siz görürsünüz.</p>
      <Alert error={error} />
      {list.map((x, i) => (
        <div key={i} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Proje" htmlFor={`rf-t-${i}`}>
              <input id={`rf-t-${i}`} className="input" value={x.title} onChange={(e) => upd(i, { title: e.target.value })} />
            </Field>
            <Field label="Müşteri" htmlFor={`rf-c-${i}`}>
              <input id={`rf-c-${i}`} className="input" value={x.client} onChange={(e) => upd(i, { client: e.target.value })} />
            </Field>
          </div>
          <Field label="Açıklama" htmlFor={`rf-d-${i}`}>
            <textarea id={`rf-d-${i}`} rows={2} className="input" value={x.description} onChange={(e) => upd(i, { description: e.target.value })} />
          </Field>
          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" className="h-4 w-4 accent-primary-500" checked={x.hidden} onChange={(e) => upd(i, { hidden: e.target.checked })} /> Gizle (yalnızca siz görürsünüz)
            </label>
            <button type="button" onClick={() => setList(list.filter((_, j) => j !== i))} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-rose-600" aria-label="Referansı kaldır">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
      <SaveBar busy={busy}>
        <Button type="button" variant="secondary" className="mr-auto" onClick={() => setList([...list, { title: '', client: '', description: '', hidden: false }])}>
          <Plus className="h-4 w-4" /> Referans ekle
        </Button>
      </SaveBar>
    </form>
  );
}

/* ---------------------------- Eşleşme tercihleri ---------------------------- */

function Preferences({ c, tags, onSaved }: { c: OwnCompany; tags: Tag[]; onSaved: Saved }) {
  const [p, setP] = useState({
    region: (c.preferences?.region ?? 'turkey') as Region,
    requiredCertificates: c.preferences?.requiredCertificates ?? [],
    blockedSectors: (c.preferences?.blockedSectors ?? []).map((s) => String(typeof s === 'string' ? s : s.id ?? (s as { _id?: string })._id)),
  });
  const { run, busy, error } = useAction();
  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void run(async () => onSaved((await api.patch<{ company: OwnCompany }>('/companies/me', { preferences: p })).company));
      }}
    >
      <p className="text-sm text-slate-500">Bu filtreler kesindir: uymayan firmalar akışınızda hiç gösterilmez.</p>
      <Alert error={error} />
      <Field label="Bölge">
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
          {(Object.entries(REGION) as [Region, string][]).map(([k, v]) => (
            <button type="button" role="radio" aria-checked={p.region === k} key={k} onClick={() => setP({ ...p, region: k })} className={cn('rounded-xl border px-4 py-3 text-sm transition', p.region === k ? 'border-primary-400 bg-primary-50 text-slate-900' : 'border-slate-200 text-slate-500 hover:border-slate-300')}>
              {v}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Karşı firmada zorunlu belgeler">
        <div className="flex flex-wrap gap-2">
          {(Object.entries(CERTIFICATES) as [CertificateType, string][]).map(([k, v]) => (
            <Chip key={k} active={p.requiredCertificates.includes(k)} onClick={() => setP({ ...p, requiredCertificates: p.requiredCertificates.includes(k) ? p.requiredCertificates.filter((x) => x !== k) : [...p.requiredCertificates, k] })}>
              {v}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Rakip sektörler (akışta gösterme)" htmlFor="pf-sec">
        <TagSelect id="pf-sec" multiple tags={tags} value={p.blockedSectors} onChange={(v: string[]) => setP({ ...p, blockedSectors: v })} />
      </Field>
      <SaveBar busy={busy} />
    </form>
  );
}

/* ----------------------------------- Ekip ----------------------------------- */

function Team() {
  const auth = useAuth();
  const toast = useToast();
  const members = useLoad(() => api.get<{ members: Member[] }>('/companies/me/members'), []);
  const [invite, setInvite] = useState<{ email: string; role: Role }>({ email: '', role: 'company_member' });
  const [removing, setRemoving] = useState<Member | null>(null);
  const { run, busy, error } = useAction();
  const isMe = (m: Member) => String(m._id) === String(auth.user?._id);
  return (
    <div className="space-y-6">
      <Alert error={error || members.error} />
      {members.loading ? (
        <Spinner />
      ) : (
        <ul className="divide-y divide-slate-100">
          {members.data?.members.map((m) => (
            <li key={m._id} className="flex flex-wrap items-center gap-3 py-3">
              <Logo company={{ name: m.fullName }} size={38} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-900">
                  {m.fullName} {isMe(m) && <span className="text-xs text-slate-500">(siz)</span>}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {m.email}
                  {m.title && ` · ${m.title}`}
                </div>
              </div>
              {auth.isCompanyAdmin && !isMe(m) ? (
                <>
                  <Select
                    aria-label={`${m.fullName} rolü`}
                    className="!w-auto !py-2"
                    value={m.role}
                    onChange={(e) => run(async () => { await api.patch(`/companies/me/members/${m._id}`, { role: e.target.value }); await members.reload(); })}
                  >
                    <option value="company_admin">{ROLES.company_admin}</option>
                    <option value="company_member">{ROLES.company_member}</option>
                  </Select>
                  <button onClick={() => setRemoving(m)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-rose-600" aria-label={`${m.fullName} ekipten çıkar`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <Chip>{ROLES[m.role]}</Chip>
              )}
            </li>
          ))}
        </ul>
      )}
      {auth.isCompanyAdmin && (
        <form
          className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await api.post('/companies/me/invitations', invite);
              toast({ title: 'Davet gönderildi', body: invite.email });
              setInvite({ email: '', role: 'company_member' });
            });
          }}
        >
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <UserPlus className="h-4 w-4 text-primary-600" /> Ekip arkadaşı davet et
          </h3>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input type="email" required className="input flex-1" placeholder="ad.soyad@firmaniz.com.tr" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} aria-label="Davet e-postası" />
            <Select className="sm:!w-48" value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value as Role })} aria-label="Rol">
              <option value="company_member">{ROLES.company_member}</option>
              <option value="company_admin">{ROLES.company_admin}</option>
            </Select>
            <Button type="submit" disabled={busy}>
              Davet gönder
            </Button>
          </div>
        </form>
      )}
      <Modal open={!!removing} onClose={() => setRemoving(null)} title={`${removing?.fullName ?? ''} ekipten çıkarılsın mı?`}>
        <p className="text-sm text-slate-500">Bu kişi firmanızın hesabına artık erişemez.</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRemoving(null)}>
            Vazgeç
          </Button>
          <Button
            variant="danger"
            onClick={() =>
              run(async () => {
                await api.del(`/companies/me/members/${removing!._id}`);
                setRemoving(null);
                await members.reload();
              })
            }
          >
            Çıkar
          </Button>
        </div>
      </Modal>
    </div>
  );
}
