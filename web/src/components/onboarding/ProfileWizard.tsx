import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Building2, Check, FlaskConical, Handshake, ImagePlus, Mail, Rocket, ShieldCheck, Sparkles } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { COLLABORATION_TYPES, EMPLOYEE_RANGES, EXPERTISE, INTERNATIONAL_GOALS, INVESTMENT_NEEDS, SECTORS, STAGES, TECHNOPARKS } from '@/data/options';
import { cn } from '@/lib/utils';
import { Button, Chip, Toggle } from '@/components/ui';
import { SwipeCardPreview } from './SwipeCardPreview';
import { TagInput } from './TagInput';
import type { MyCompany } from '@/types';

const FREE_DOMAINS = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'yandex.com', 'live.com', 'hotmail.com.tr', 'outlook.com.tr'];

export const BLANK_PROFILE: MyCompany = {
  id: 'me',
  name: '',
  brand: ['#2f7bff', '#8b5cf6'],
  tagline: '',
  description: '',
  foundedYear: new Date().getFullYear() - 2,
  technopark: '',
  city: '',
  website: '',
  sector: '',
  expertise: [],
  products: [],
  seeking: [],
  offering: [],
  collaborationTypes: [],
  rndNeeds: [],
  employeeRange: '6-20',
  stage: 'mvp',
  investmentNeed: 'none',
  seekingInvestor: false,
  seekingProjectPartner: false,
  hasRndCenter: false,
  internationalGoals: [],
  exportFocused: false,
  verified: false,
  contact: { name: '', title: '', email: '', phone: '' },
  cover: 'mesh',
};

const STEPS = [
  { key: 'identity', title: 'Firma kimliği', hint: 'Sizi tanıyalım', icon: Building2 },
  { key: 'about', title: 'Faaliyet alanı', hint: 'Ne yapıyorsunuz?', icon: Sparkles },
  { key: 'tech', title: 'Uzmanlık & ürünler', hint: 'Teknolojik yetkinlikler', icon: FlaskConical },
  { key: 'collab', title: 'İş birliği', hint: 'Ne arıyor, ne sunuyorsunuz?', icon: Handshake },
  { key: 'growth', title: 'Yatırım & büyüme', hint: 'Hedefleriniz', icon: Rocket },
  { key: 'contact', title: 'İletişim & onay', hint: 'Son adım', icon: Mail },
] as const;

const BRANDS: [string, string][] = [
  ['#2f7bff', '#8b5cf6'],
  ['#14b8a6', '#2f7bff'],
  ['#8b5cf6', '#ec4899'],
  ['#f59e0b', '#ef4444'],
  ['#22d3ee', '#10b981'],
  ['#6366f1', '#22d3ee'],
];

function Field({ label, htmlFor, children, hint, error }: { label: string; htmlFor?: string; children: ReactNode; hint?: string; error?: string }) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? <p className="mt-1.5 text-xs text-rose-300">{error}</p> : hint ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export function ProfileWizard({ initial, onComplete, submitLabel = 'Profili Yayınla' }: { initial: MyCompany; onComplete: (p: MyCompany) => Promise<void>; submitLabel?: string }) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [p, setP] = useState<MyCompany>(initial);
  const [kvkk, setKvkk] = useState(!!initial.kvkkConsentAt);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof MyCompany>(k: K, v: MyCompany[K]) => setP((x) => ({ ...x, [k]: v }));

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (p.name.trim().length < 2) e.name = 'Firma adı gerekli.';
      if (!p.technopark) e.technopark = 'Teknokent seçin.';
      if (p.foundedYear < 1950 || p.foundedYear > new Date().getFullYear()) e.foundedYear = 'Geçerli bir yıl girin.';
    }
    if (step === 1) {
      if (!p.sector) e.sector = 'Bir sektör seçin.';
      if (p.description.trim().length < 40) e.description = `Açıklama en az 40 karakter olmalı (${p.description.trim().length}/40).`;
    }
    if (step === 2) {
      if (!p.expertise.length) e.expertise = 'En az bir uzmanlık seçin.';
      if (!p.products.length) e.products = 'En az bir ürün/hizmet ekleyin.';
    }
    if (step === 3) {
      if (!p.seeking.length) e.seeking = 'Aradığınız en az bir alan ekleyin.';
      if (!p.offering.length) e.offering = 'Sunabileceğiniz en az bir imkân ekleyin.';
      if (!p.collaborationTypes.length) e.collaborationTypes = 'En az bir iş birliği türü seçin.';
    }
    if (step === 5) {
      if (!p.contact.name.trim()) e.contactName = 'Yetkili adı gerekli.';
      const domain = p.contact.email.split('@')[1]?.toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.contact.email)) e.email = 'Geçerli bir e-posta girin.';
      else if (domain && FREE_DOMAINS.includes(domain)) e.email = 'Lütfen kurumsal e-posta adresi kullanın.';
      if (!kvkk) e.kvkk = 'Devam etmek için aydınlatma metnini onaylamalısınız.';
    }
    return e;
  }, [p, step, kvkk]);

  const valid = Object.keys(errors).length === 0;
  const err = (k: string) => (touched ? errors[k] : undefined);

  const go = (n: number) => {
    if (n > step && !valid) {
      setTouched(true);
      return;
    }
    setTouched(false);
    setDir(n > step ? 1 : -1);
    setStep(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const finish = async () => {
    if (!valid) return setTouched(true);
    setBusy(true);
    const tagline = p.tagline || p.description.split(/[.!?]/)[0]!.slice(0, 80);
    await onComplete({ ...p, tagline, kvkkConsentAt: p.kvkkConsentAt ?? Date.now() });
    setBusy(false);
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div>
        {/* İlerleme */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Adım <span className="text-white">{step + 1}</span> / {STEPS.length}
            </span>
            <span>%{Math.round(progress)} tamamlandı</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div className="h-full rounded-full bg-brand-gradient" animate={{ width: `${progress}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
          </div>
          <ol className="mt-5 hidden grid-cols-6 gap-2 sm:grid">
            {STEPS.map((s, i) => (
              <li key={s.key}>
                <button type="button" onClick={() => i < step && go(i)} disabled={i > step} className={cn('flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-xs transition', i === step ? 'bg-white/[0.06] text-white' : i < step ? 'text-slate-300 hover:bg-white/[0.03]' : 'text-slate-600')}>
                  <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-lg', i < step ? 'bg-aqua-400/20 text-aqua-300' : i === step ? 'bg-electric-500 text-white' : 'bg-white/5')}>
                    {i < step ? <Check className="h-3.5 w-3.5" /> : <s.icon className="h-3.5 w-3.5" />}
                  </span>
                  <span className="hidden truncate xl:inline">{s.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className="relative overflow-hidden">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={step}
              custom={dir}
              initial={{ opacity: 0, x: dir * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -40 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mb-8">
                <span className="text-xs font-medium uppercase tracking-wider text-electric-300">{STEPS[step]!.hint}</span>
                <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-white">{STEPS[step]!.title}</h2>
              </div>

              <div className="space-y-6">
                {step === 0 && (
                  <>
                    <div className="flex items-center gap-5">
                      <label className="group relative grid h-24 w-24 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-3xl border border-dashed border-white/20 bg-white/[0.03] transition hover:border-electric-400/60">
                        {p.logoUrl ? <img src={p.logoUrl} alt="Logo önizleme" className="h-full w-full object-cover" /> : <ImagePlus className="h-7 w-7 text-slate-500 transition group-hover:text-electric-300" />}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml,image/webp"
                          className="sr-only"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (!f || f.size > 2 * 1024 * 1024) return;
                            const r = new FileReader();
                            r.onload = () => set('logoUrl', String(r.result));
                            r.readAsDataURL(f);
                          }}
                        />
                      </label>
                      <div>
                        <div className="text-sm font-medium text-white">Firma logosu</div>
                        <p className="mt-1 text-xs text-slate-500">PNG, JPG veya SVG · en fazla 2 MB. Logo yoksa renk temanızla monogram oluşturulur.</p>
                        <div className="mt-3 flex gap-2">
                          {BRANDS.map((b) => (
                            <button key={b.join()} type="button" onClick={() => set('brand', b)} aria-label="Renk teması" className={cn('h-6 w-6 rounded-full ring-2 ring-offset-2 ring-offset-ink-950 transition', p.brand.join() === b.join() ? 'ring-white' : 'ring-transparent')} style={{ background: `linear-gradient(135deg, ${b[0]}, ${b[1]})` }} />
                          ))}
                          {p.logoUrl && (
                            <button type="button" className="ml-2 text-xs text-slate-400 hover:text-white" onClick={() => set('logoUrl', undefined)}>
                              Logoyu kaldır
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <Field label="Firma adı" htmlFor="f-name" error={err('name')}>
                      <input id="f-name" className="input" value={p.name} onChange={(e) => set('name', e.target.value)} placeholder="Örn. Orion Yazılım A.Ş." autoFocus />
                    </Field>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <Field label="Teknopark / Teknokent" htmlFor="f-park" error={err('technopark')}>
                        <select
                          id="f-park"
                          className="input [color-scheme:dark]"
                          value={p.technopark}
                          onChange={(e) => {
                            const t = TECHNOPARKS.find((x) => x.name === e.target.value);
                            setP((x) => ({ ...x, technopark: e.target.value, city: t?.city ?? x.city }));
                          }}
                        >
                          <option value="">Seçin</option>
                          {TECHNOPARKS.map((t) => (
                            <option key={t.name} value={t.name}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Şehir" htmlFor="f-city" hint="Teknokente göre otomatik doldurulur">
                        <input id="f-city" className="input" value={p.city} onChange={(e) => set('city', e.target.value)} />
                      </Field>
                      <Field label="Kuruluş yılı" htmlFor="f-year" error={err('foundedYear')}>
                        <input id="f-year" type="number" inputMode="numeric" className="input" value={p.foundedYear} onChange={(e) => set('foundedYear', Number(e.target.value))} />
                      </Field>
                      <Field label="Web sitesi" htmlFor="f-web">
                        <input id="f-web" className="input" value={p.website} onChange={(e) => set('website', e.target.value.replace(/^https?:\/\//, ''))} placeholder="firmaniz.com.tr" />
                      </Field>
                    </div>
                  </>
                )}

                {step === 1 && (
                  <>
                    <Field label="Faaliyet sektörü" error={err('sector')}>
                      <div className="flex flex-wrap gap-2">
                        {SECTORS.map((s) => (
                          <Chip key={s} active={p.sector === s} onClick={() => set('sector', s)}>
                            {s}
                          </Chip>
                        ))}
                      </div>
                    </Field>
                    <Field label="Firma açıklaması" htmlFor="f-desc" error={err('description')} hint={`${p.description.length}/600 · Ne yaptığınızı ve neden iş birliği aradığınızı anlatın`}>
                      <textarea id="f-desc" className="input min-h-[140px]" maxLength={600} value={p.description} onChange={(e) => set('description', e.target.value)} placeholder="Firmamız … alanında … geliştiriyor. … konusunda iş birliği yapabileceğimiz ortaklar arıyoruz." />
                    </Field>
                    <Field label="Tek cümlelik slogan (isteğe bağlı)" htmlFor="f-tag">
                      <input id="f-tag" className="input" maxLength={80} value={p.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="Örn. Fabrikalar için gerçek zamanlı veri platformu" />
                    </Field>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <Field label="Firma büyüklüğü">
                        <div className="grid grid-cols-2 gap-2">
                          {EMPLOYEE_RANGES.map((r) => (
                            <button key={r.value} type="button" onClick={() => set('employeeRange', r.value)} className={cn('rounded-xl border px-3 py-2.5 text-sm transition', p.employeeRange === r.value ? 'border-electric-400/60 bg-electric-500/15 text-white' : 'border-white/10 text-slate-400 hover:border-white/20')}>
                              {r.label}
                            </button>
                          ))}
                        </div>
                      </Field>
                      <Field label="Proje / ürün aşaması">
                        <div className="flex flex-wrap gap-2">
                          {STAGES.map((s) => (
                            <Chip key={s.value} active={p.stage === s.value} onClick={() => set('stage', s.value)}>
                              {s.label}
                            </Chip>
                          ))}
                        </div>
                      </Field>
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <Field label="Teknolojik uzmanlıklar" error={err('expertise')} hint="En fazla 5 seçin">
                      <div className="flex flex-wrap gap-2">
                        {EXPERTISE.map((s) => (
                          <Chip key={s} active={p.expertise.includes(s)} onClick={() => (p.expertise.includes(s) || p.expertise.length < 5) && set('expertise', toggle(p.expertise, s))}>
                            {s}
                          </Chip>
                        ))}
                      </div>
                    </Field>
                    <Field label="Ürün ve hizmetler" htmlFor="f-products" error={err('products')}>
                      <TagInput id="f-products" value={p.products} onChange={(v) => set('products', v)} placeholder="Ürün veya hizmet adı yazıp Enter’a basın" max={6} />
                    </Field>
                  </>
                )}

                {step === 3 && (
                  <>
                    <Field label="İş birliği yapmak istediğiniz alanlar" htmlFor="f-seek" error={err('seeking')}>
                      <TagInput id="f-seek" value={p.seeking} onChange={(v) => set('seeking', v)} placeholder="Örn. Bilgisayarlı görü ortağı" suggestions={['Pilot müşteri', 'Donanım tedarikçisi', 'Yazılım geliştirme ortağı', 'Distribütör', 'Akademik danışman']} max={5} />
                    </Field>
                    <Field label="Firmalara sunabileceğiniz imkânlar" htmlFor="f-offer" error={err('offering')}>
                      <TagInput id="f-offer" value={p.offering} onChange={(v) => set('offering', v)} placeholder="Örn. Test laboratuvarı, saha ekibi" suggestions={['Laboratuvar erişimi', 'Teknik danışmanlık', 'Satış ağı', 'Test altyapısı', 'Veri seti']} max={5} />
                    </Field>
                    <Field label="İş birliği türleri" error={err('collaborationTypes')}>
                      <div className="flex flex-wrap gap-2">
                        {COLLABORATION_TYPES.map((t) => (
                          <Chip key={t.value} active={p.collaborationTypes.includes(t.value)} onClick={() => set('collaborationTypes', toggle(p.collaborationTypes, t.value))}>
                            {t.label}
                          </Chip>
                        ))}
                      </div>
                    </Field>
                    <Field label="Ar-Ge ihtiyaçlarınız" htmlFor="f-rnd" hint="İsteğe bağlı">
                      <TagInput id="f-rnd" value={p.rndNeeds} onChange={(v) => set('rndNeeds', v)} placeholder="Örn. Edge AI model sıkıştırma" max={4} />
                    </Field>
                  </>
                )}

                {step === 4 && (
                  <>
                    <Field label="Yatırım ihtiyacı">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {INVESTMENT_NEEDS.map((i) => (
                          <button key={i.value} type="button" onClick={() => setP((x) => ({ ...x, investmentNeed: i.value, seekingInvestor: i.value !== 'none' }))} className={cn('flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left text-sm transition', p.investmentNeed === i.value ? 'border-electric-400/60 bg-electric-500/10 text-white' : 'border-white/10 text-slate-400 hover:border-white/20')}>
                            {i.label}
                            {p.investmentNeed === i.value && <Check className="h-4 w-4 text-electric-300" />}
                          </button>
                        ))}
                      </div>
                    </Field>
                    <div className="glass divide-y divide-white/[0.06] rounded-2xl px-5">
                      <Toggle checked={p.seekingInvestor} onChange={(v) => set('seekingInvestor', v)} label="Yatırımcı arıyoruz" description="Melek yatırımcı, GSYF ve kurumsal girişim sermayesi profilinizi görebilir." />
                      <Toggle checked={p.seekingProjectPartner} onChange={(v) => set('seekingProjectPartner', v)} label="Proje ortaklığı arıyoruz" description="TÜBİTAK 1501/1507/1511, KOSGEB, Horizon Europe vb." />
                      <Toggle checked={p.hasRndCenter} onChange={(v) => set('hasRndCenter', v)} label="Tescilli Ar-Ge / tasarım merkezimiz var" />
                      <Toggle checked={p.exportFocused} onChange={(v) => set('exportFocused', v)} label="İhracat ve uluslararasılaşma hedefimiz var" />
                    </div>
                    <Field label="Uluslararası iş birliği hedefleri">
                      <div className="flex flex-wrap gap-2">
                        {INTERNATIONAL_GOALS.map((g) => (
                          <Chip key={g} active={p.internationalGoals.includes(g)} onClick={() => set('internationalGoals', toggle(p.internationalGoals, g))}>
                            {g}
                          </Chip>
                        ))}
                      </div>
                    </Field>
                  </>
                )}

                {step === 5 && (
                  <>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <Field label="Yetkili adı soyadı" htmlFor="f-cname" error={err('contactName')}>
                        <input id="f-cname" className="input" value={p.contact.name} onChange={(e) => set('contact', { ...p.contact, name: e.target.value })} autoComplete="name" />
                      </Field>
                      <Field label="Unvan" htmlFor="f-ctitle">
                        <input id="f-ctitle" className="input" value={p.contact.title} onChange={(e) => set('contact', { ...p.contact, title: e.target.value })} placeholder="Örn. İş Geliştirme Müdürü" />
                      </Field>
                      <Field label="Kurumsal e-posta" htmlFor="f-email" error={err('email')} hint="Gmail, Hotmail gibi kişisel adresler kabul edilmez">
                        <input id="f-email" type="email" className="input" value={p.contact.email} onChange={(e) => set('contact', { ...p.contact, email: e.target.value })} autoComplete="email" placeholder="ad@firmaniz.com.tr" />
                      </Field>
                      <Field label="Telefon (isteğe bağlı)" htmlFor="f-phone">
                        <input id="f-phone" type="tel" className="input" value={p.contact.phone ?? ''} onChange={(e) => set('contact', { ...p.contact, phone: e.target.value })} autoComplete="tel" placeholder="+90 5xx xxx xx xx" />
                      </Field>
                    </div>
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                      <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        <ShieldCheck className="h-4 w-4 text-aqua-300" /> Verileriniz nasıl işlenir?
                      </div>
                      <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-slate-400">
                        <li>• İletişim bilgileriniz yalnızca karşılıklı eşleştiğiniz firmalarla paylaşılır.</li>
                        <li>• Firma profiliniz teknokent yönetimi tarafından doğrulanır; doğrulama için vergi numarası ayrıca istenir.</li>
                        <li>• Hesabınızı dilediğiniz an silebilir, verilerinizin bir kopyasını talep edebilirsiniz.</li>
                      </ul>
                      <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-slate-300">
                        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-electric-500" checked={kvkk} onChange={(e) => setKvkk(e.target.checked)} />
                        <span>
                          <Link to="/kvkk" target="_blank" className="text-electric-300 underline-offset-2 hover:underline">
                            KVKK Aydınlatma Metni
                          </Link>
                          ’ni okudum; kişisel verilerimin eşleştirme hizmeti kapsamında işlenmesini kabul ediyorum.
                        </span>
                      </label>
                      {err('kvkk') && <p className="mt-2 text-xs text-rose-300">{err('kvkk')}</p>}
                      <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm text-slate-400">
                        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-electric-500" checked={!!p.marketingConsent} onChange={(e) => set('marketingConsent', e.target.checked)} />
                        Etkinlik, çağrı ve fırsatlar hakkında e-posta almak istiyorum (isteğe bağlı).
                      </label>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-10 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-6">
          <Button variant="ghost" onClick={() => go(step - 1)} disabled={step === 0}>
            <ArrowLeft className="h-4 w-4" /> Geri
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => go(step + 1)}>
              Devam <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={finish} disabled={busy}>
              {busy ? 'Kaydediliyor…' : submitLabel} <Check className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Canlı önizleme */}
      <aside className="hidden lg:block">
        <div className="sticky top-8">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-aqua-300" /> Canlı kart önizlemesi
          </div>
          <SwipeCardPreview company={p} />
          <p className="mt-3 text-center text-xs text-slate-500">Diğer firmalar profilinizi bu şekilde görecek.</p>
        </div>
      </aside>
    </div>
  );
}
