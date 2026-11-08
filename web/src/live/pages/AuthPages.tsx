import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, Eye, EyeOff, KeyRound, Lock, Mail, Search, ShieldCheck, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { SLOGAN_EN, SLOGAN_TR } from '@/data/options';
import { BrandMark, Button, ButtonLink } from '@/components/ui';
import { api, type ApiError } from '../api';
import { homeFor, useAuth } from '../auth';
import { useAction } from '../hooks';
import { Alert, Field, Spinner } from '../ui';
import { cn } from '@/lib/utils';

const FREE_DOMAINS = new Set(['gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.com.tr', 'outlook.com', 'outlook.com.tr', 'live.com', 'yahoo.com', 'yahoo.com.tr', 'icloud.com', 'yandex.com', 'yandex.com.tr', 'mynet.com', 'proton.me', 'protonmail.com']);

/** Kimlik doğrulama sayfaları için iki sütunlu, markalı kabuk. */

/** Kimlik doğrulama sayfaları: dar bir marka şeridi + formu öne çıkaran geniş çalışma alanı. */
function AuthLayout({ title, subtitle, children, wide }: { title: string; subtitle?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <div className="relative grid min-h-[100svh] bg-slate-50 lg:grid-cols-[minmax(0,380px)_1fr] xl:grid-cols-[420px_1fr]">
      <aside className="relative hidden overflow-hidden bg-slate-900 lg:block">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary-500/30 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-primary-500/15 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Link to="/" aria-label="Ana sayfa" className="[&_span]:!text-white [&_span_span]:!text-primary-400">
            <BrandMark />
          </Link>
          <div>
            <h2 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-white">{SLOGAN_TR}</h2>
            <p className="mt-2 text-sm text-slate-400">{SLOGAN_EN}</p>
            <ul className="mt-8 space-y-3.5 text-sm text-slate-300">
              {[
                [ShieldCheck, 'Teknokent yönetimince doğrulanan firmalar'],
                [Lock, 'İletişim bilgileri yalnızca eşleşmeden sonra paylaşılır'],
                [Building2, 'Türkiye genelindeki teknokentlerden iş ortakları'],
              ].map(([Icon, t]) => {
                const I = Icon as typeof Lock;
                return (
                  <li key={t as string} className="flex items-center gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-primary-400">
                      <I className="h-4 w-4" />
                    </span>
                    {t as string}
                  </li>
                );
              })}
            </ul>
          </div>
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} TeknoOrtak</p>
        </div>
      </aside>
      <main className="relative flex flex-col px-4 py-6 sm:px-8 lg:py-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="lg:hidden" aria-label="Ana sayfa">
            <BrandMark />
          </Link>
          <Link to="/" className="ml-auto hidden items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 sm:inline-flex">
            <ArrowLeft className="h-4 w-4" /> Ana sayfa
          </Link>
        </div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} className={cn('m-auto w-full py-8', wide ? 'max-w-2xl' : 'max-w-md')}>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card sm:p-10">
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
            <div className="mt-8">{children}</div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

const submitWith = (fn: () => void) => (e: FormEvent) => {
  e.preventDefault();
  fn();
};

/* ---------------------------------- Giriş ----------------------------------- */

export function Login() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const { run, busy, error } = useAction();
  const resend = useAction();
  const [resent, setResent] = useState(false);
  const from = (location.state as { from?: string } | null)?.from;
  const unverified = (error as ApiError | null)?.status === 403;

  return (
    <AuthLayout
      title="Tekrar hoş geldiniz"
      subtitle={
        <>
          Hesabınız yok mu?{' '}
          <Link to="/kayit" className="text-primary-600 hover:underline">
            Firmanızı kaydedin
          </Link>
        </>
      }
    >
      <form
        className="space-y-5"
        onSubmit={submitWith(() =>
          run(async () => {
            const r = await auth.login(form.email, form.password);
            const panel = r.user.role === 'technopark_admin' || r.user.role === 'super_admin';
            navigate(from && from.startsWith('/app') ? from : homeFor({ isPanelUser: panel }), { replace: true });
          }),
        )}
      >
        <Alert error={error}>
          {unverified && !resent && (
            <button
              type="button"
              disabled={resend.busy || !form.email}
              onClick={() =>
                resend.run(async () => {
                  await api.post('/auth/resend-verification', { email: form.email });
                  setResent(true);
                })
              }
              className="mt-2 block font-semibold underline underline-offset-2"
            >
              Doğrulama e-postasını tekrar gönder
            </button>
          )}
        </Alert>
        {resent && (
          <Alert kind="success">
            Hesap varsa yeni doğrulama bağlantısı gönderildi. E-posta gelmezse teknokent yönetiminiz hesabınızı panelden doğrulayabilir.
          </Alert>
        )}
        <Field label="Kurumsal e-posta" htmlFor="l-email">
          <input id="l-email" className="input" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ad@firmaniz.com.tr" />
        </Field>
        <Field label="Şifre" htmlFor="l-pass">
          <input id="l-pass" className="input" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm text-slate-500 hover:text-slate-900">
            Şifremi unuttum
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? 'Giriş yapılıyor…' : 'Giriş yap'} <ArrowRight className="h-4 w-4" />
        </Button>
        <p className="text-center text-xs text-slate-500">
          Önce denemek mi istiyorsunuz?{' '}
          <Link to="/demo/discover" className="text-slate-600 hover:underline">
            Demo ile keşfedin
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

/* ---------------------------------- Kayıt ----------------------------------- */


/* ---------------------------------- Kayıt ----------------------------------- */

/** Vergi kimlik numarası (VKN) kontrol hanesi doğrulaması — backend'deki isValidVkn ile aynı algoritma. */
function isValidVkn(vkn: string) {
  if (!/^\d{10}$/.test(vkn)) return false;
  const d = vkn.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    const tmp = (d[i]! + (9 - i)) % 10;
    let v = (tmp * 2 ** (9 - i)) % 9;
    if (tmp !== 0 && v === 0) v = 9;
    sum += v;
  }
  return (10 - (sum % 10)) % 10 === d[9];
}

/** 0-4 arası şifre gücü */
function passwordScore(p: string) {
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[a-zçğıöşü]/.test(p) && /[A-ZÇĞİÖŞÜ]/.test(p)) s++;
  if (/\d/.test(p) && /[^\p{L}\d]/u.test(p)) s++;
  return Math.min(4, s);
}
const STRENGTH = [
  ['Çok zayıf', 'bg-rose-500'],
  ['Zayıf', 'bg-rose-500'],
  ['Orta', 'bg-amber-500'],
  ['İyi', 'bg-emerald-500'],
  ['Güçlü', 'bg-emerald-600'],
] as const;

function Input({ id, ok, error, right, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { ok?: boolean; error?: boolean; right?: ReactNode }) {
  return (
    <div className="relative">
      <input id={id} {...rest} className={cn('input pr-10', error && '!border-rose-300 focus:!ring-rose-500/10', ok && '!border-emerald-300')} aria-invalid={error || undefined} />
      <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {right}
        {ok && !right && <Check className="h-4 w-4 text-emerald-600" aria-hidden />}
      </span>
    </div>
  );
}

const STEPS = [
  { title: 'Hesap', hint: 'Yetkili bilgileri', icon: UserRound },
  { title: 'Firma', hint: 'Firma ve teknokent', icon: Building2 },
  { title: 'Onay', hint: 'Özet ve KVKK', icon: ShieldCheck },
] as const;

export function Register() {
  const [tps, setTps] = useState<{ id: string; name: string; city: string }[]>([]);
  const [done, setDone] = useState<{ message?: string; company?: { claimed?: boolean; verificationStatus?: string } } | null>(null);
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showPw, setShowPw] = useState(false);
  const [tpQuery, setTpQuery] = useState('');
  const [form, setForm] = useState({ fullName: '', title: '', email: '', password: '', companyName: '', taxNumber: '', technoparkId: '', kvkk: false, marketing: false });
  const { run, busy, error } = useAction();
  useEffect(() => {
    api
      .get<{ technoparks: { id: string; name: string; city: string }[] }>('/technoparks')
      .then((r) => setTps(r.technoparks))
      .catch(() => {});
  }, []);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const touch = (k: string) => setTouched((t) => ({ ...t, [k]: true }));

  const domain = form.email.split('@')[1]?.toLowerCase() ?? '';
  const emailFormatOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email);
  const errs: Record<string, string> = {};
  if (form.fullName.trim().length < 2) errs.fullName = 'Ad soyad gerekli.';
  if (!emailFormatOk) errs.email = 'Geçerli bir e-posta girin.';
  else if (FREE_DOMAINS.has(domain)) errs.email = 'Kurumsal e-posta kullanın (gmail, hotmail vb. kabul edilmez).';
  if (form.password.length < 8) errs.password = 'Şifre en az 8 karakter olmalı.';
  if (form.companyName.trim().length < 2) errs.companyName = 'Firma unvanı gerekli.';
  if (!/^\d{10}$/.test(form.taxNumber)) errs.taxNumber = 'Vergi numarası 10 haneli olmalı.';
  else if (!isValidVkn(form.taxNumber)) errs.taxNumber = 'Vergi numarası geçersiz görünüyor (kontrol hanesi tutmuyor).';
  if (!form.technoparkId) errs.technoparkId = 'Teknokent seçin.';
  if (!form.kvkk) errs.kvkk = 'Devam etmek için aydınlatma metnini onaylayın.';
  const stepFields = [['fullName', 'email', 'password'], ['companyName', 'taxNumber', 'technoparkId'], ['kvkk']][step]!;
  const stepValid = stepFields.every((k) => !errs[k]);
  const err = (k: string) => (touched[k] ? errs[k] : undefined);
  const ok = (k: string) => touched[k] && !errs[k];

  const pw = passwordScore(form.password);
  const tp = tps.find((t) => t.id === form.technoparkId);
  const tpList = useMemo(() => {
    const q = tpQuery.toLocaleLowerCase('tr');
    return tps.filter((t) => !q || `${t.name} ${t.city}`.toLocaleLowerCase('tr').includes(q));
  }, [tps, tpQuery]);

  const next = () => {
    if (!stepValid) {
      setTouched((t) => ({ ...t, ...Object.fromEntries(stepFields.map((k) => [k, true])) }));
      return;
    }
    if (step < 2) return setStep(step + 1);
    void run(async () => {
      const r = await api.post('/auth/register', {
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        title: form.title || undefined,
        kvkkConsent: form.kvkk,
        marketingConsent: form.marketing,
        company: { name: form.companyName, taxNumber: form.taxNumber, technoparkId: form.technoparkId },
      });
      setDone(r);
    });
  };

  if (done) {
    return (
      <AuthLayout title="Neredeyse hazır" subtitle="Kaydınız alındı.">
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary-50 text-primary-500">
              <Mail className="h-8 w-8" />
            </span>
            <p className="mt-4 font-semibold text-slate-900">{done.message || 'E-posta adresinize bir doğrulama bağlantısı gönderdik.'}</p>
            <p className="mt-1 text-sm text-slate-500">
              <span className="font-medium text-slate-700">{form.email}</span> adresine gelen bağlantıya tıklayın.
            </p>
          </div>
          <ol className="space-y-3 rounded-2xl bg-slate-50 p-5 text-sm">
            {[
              ['E-postanızı doğrulayın', 'Bağlantı 48 saat geçerlidir.'],
              ['Teknokent onayı', done.company?.verificationStatus === 'approved' ? 'Firmanız zaten onaylı.' : 'Teknokent yönetimi firmanızı onaylar.'],
              ['Profilinizi tamamlayın ve keşfedin', 'Sunduğunuz ve aradığınız alanları ekleyin.'],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-slate-700 ring-1 ring-slate-200">{i + 1}</span>
                <span>
                  <span className="block font-semibold text-slate-900">{t}</span>
                  <span className="text-slate-500">{d}</span>
                </span>
              </li>
            ))}
          </ol>
          {done.company?.claimed && <Alert kind="success">Teknokentinizin önceden oluşturduğu firma profilini sahiplendiniz.</Alert>}
          <ButtonLink to="/giris" size="lg" className="w-full">
            Giriş sayfasına git
          </ButtonLink>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      wide
      title="Firmanızı kaydedin"
      subtitle={
        <>
          Zaten hesabınız var mı?{' '}
          <Link to="/giris" className="font-semibold text-primary-600 hover:underline">
            Giriş yapın
          </Link>
        </>
      }
    >
      {/* Adım göstergesi */}
      <ol className="mb-8 grid grid-cols-3 gap-2" aria-label="Kayıt adımları">
        {STEPS.map((s, i) => {
          const state = i < step ? 'done' : i === step ? 'current' : 'todo';
          return (
            <li key={s.title}>
              <button type="button" disabled={i > step} onClick={() => i < step && setStep(i)} className="w-full text-left" aria-current={state === 'current' ? 'step' : undefined}>
                <div className={cn('h-1.5 rounded-full transition-colors', state === 'todo' ? 'bg-slate-200' : 'bg-primary-500')} />
                <div className="mt-2.5 flex items-center gap-2">
                  <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold', state === 'done' ? 'bg-primary-50 text-primary-600' : state === 'current' ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-400')}>
                    {state === 'done' ? <Check className="h-4 w-4" /> : <s.icon className="h-3.5 w-3.5" />}
                  </span>
                  <span className="min-w-0">
                    <span className={cn('block truncate text-sm font-semibold', state === 'todo' ? 'text-slate-400' : 'text-slate-900')}>{s.title}</span>
                    <span className="hidden truncate text-xs text-slate-500 sm:block">{s.hint}</span>
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ol>

      <form
        className="space-y-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
      >
        <Alert error={error} />
        <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} className="space-y-5">
          {step === 0 && (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Ad soyad" htmlFor="r-name" error={err('fullName')}>
                  <Input id="r-name" autoComplete="name" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} onBlur={() => touch('fullName')} ok={ok('fullName')} error={!!err('fullName')} autoFocus />
                </Field>
                <Field label="Unvan (isteğe bağlı)" htmlFor="r-title">
                  <Input id="r-title" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Ör. Kurucu ortak" />
                </Field>
              </div>
              <Field label="Kurumsal e-posta" htmlFor="r-email" error={err('email')} hint={ok('email') ? `@${domain} alan adı firmanızla eşleştirilecek.` : 'Gmail, Hotmail gibi kişisel adresler kabul edilmez.'}>
                <Input id="r-email" type="email" autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value.trim())} onBlur={() => touch('email')} placeholder="ad@firmaniz.com.tr" ok={ok('email')} error={!!err('email')} />
              </Field>
              <Field label="Şifre" htmlFor="r-pass" error={err('password')}>
                <Input
                  id="r-pass"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  onBlur={() => touch('password')}
                  error={!!err('password')}
                  right={
                    <button type="button" onClick={() => setShowPw((v) => !v)} className="rounded p-1 text-slate-400 hover:text-slate-700" aria-label={showPw ? 'Şifreyi gizle' : 'Şifreyi göster'}>
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />
                {form.password && (
                  <div className="mt-2.5">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <span key={i} className={cn('h-1.5 flex-1 rounded-full transition-colors', i < pw ? STRENGTH[pw][1] : 'bg-slate-200')} />
                      ))}
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">
                      Şifre gücü: <span className="font-semibold text-slate-700">{STRENGTH[pw][0]}</span> · en az 8 karakter; büyük/küçük harf, rakam ve sembol önerilir
                    </p>
                  </div>
                )}
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <Field label="Firma unvanı" htmlFor="r-company" error={err('companyName')}>
                <Input id="r-company" value={form.companyName} onChange={(e) => set('companyName', e.target.value)} onBlur={() => touch('companyName')} placeholder="Ör. Orion Yazılım A.Ş." ok={ok('companyName')} error={!!err('companyName')} autoFocus />
              </Field>
              <Field label="Vergi kimlik numarası" htmlFor="r-vkn" error={err('taxNumber')} hint="10 haneli VKN; firma doğrulamasında kullanılır, diğer firmalara gösterilmez.">
                <Input id="r-vkn" inputMode="numeric" maxLength={10} value={form.taxNumber} onChange={(e) => set('taxNumber', e.target.value.replace(/\D/g, ''))} onBlur={() => touch('taxNumber')} placeholder="0000000000" ok={ok('taxNumber')} error={!!err('taxNumber')} />
              </Field>
              <Field label="Teknokent" error={err('technoparkId')}>
                <div className={cn('overflow-hidden rounded-xl border', err('technoparkId') ? 'border-rose-300' : 'border-slate-200')}>
                  <label className="relative flex items-center border-b border-slate-200">
                    <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" />
                    <input value={tpQuery} onChange={(e) => setTpQuery(e.target.value)} placeholder="Teknokent veya şehir ara…" aria-label="Teknokent ara" className="h-11 w-full bg-white pl-10 pr-3 text-sm outline-none placeholder:text-slate-400" />
                  </label>
                  <ul className="max-h-52 overflow-y-auto bg-white p-1.5" role="listbox" aria-label="Teknokent">
                    {tpList.map((t) => {
                      const on = t.id === form.technoparkId;
                      return (
                        <li key={t.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={on}
                            onClick={() => {
                              set('technoparkId', t.id);
                              touch('technoparkId');
                            }}
                            className={cn('flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition', on ? 'bg-primary-50 font-semibold text-primary-700' : 'text-slate-700 hover:bg-slate-50')}
                          >
                            <span>
                              {t.name} <span className="font-normal text-slate-400">· {t.city}</span>
                            </span>
                            {on && <Check className="h-4 w-4" />}
                          </button>
                        </li>
                      );
                    })}
                    {!tpList.length && <li className="px-3 py-4 text-center text-sm text-slate-500">{tps.length ? 'Sonuç yok.' : 'Teknokentler yükleniyor…'}</li>}
                  </ul>
                </div>
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { title: 'Yetkili', icon: UserRound, rows: [form.fullName, form.title, form.email], go: 0 },
                  { title: 'Firma', icon: Building2, rows: [form.companyName, `VKN ${form.taxNumber}`, tp ? `${tp.name} · ${tp.city}` : ''], go: 1 },
                ].map((b) => (
                  <div key={b.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <b.icon className="h-3.5 w-3.5" /> {b.title}
                      </span>
                      <button type="button" onClick={() => setStep(b.go)} className="text-xs font-semibold text-primary-600 hover:underline">
                        Düzenle
                      </button>
                    </div>
                    <ul className="mt-2 space-y-0.5 text-sm">
                      {b.rows.filter(Boolean).map((r, i) => (
                        <li key={i} className={cn('truncate', i === 0 ? 'font-semibold text-slate-900' : 'text-slate-600')}>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary-500" checked={form.kvkk} onChange={(e) => { set('kvkk', e.target.checked); touch('kvkk'); }} />
                  <span>
                    <Link to="/kvkk" target="_blank" className="font-semibold text-primary-600 hover:underline">
                      KVKK aydınlatma metnini
                    </Link>{' '}
                    okudum; kişisel verilerimin firma temsilcisi iletişim bilgisi olarak işlenmesini kabul ediyorum.
                  </span>
                </label>
                {err('kvkk') && <p className="text-xs text-rose-600">{err('kvkk')}</p>}
                <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-500">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary-500" checked={form.marketing} onChange={(e) => set('marketing', e.target.checked)} />
                  Teknokent duyuruları ve destek çağrıları hakkında e-posta almak istiyorum (isteğe bağlı).
                </label>
              </div>
              <p className="flex items-center gap-2 text-xs text-slate-500">
                <Lock className="h-3.5 w-3.5 shrink-0" /> Firmanız teknokent yönetimi tarafından onaylandıktan sonra diğer firmalarca görünür olur.
              </p>
            </>
          )}
        </motion.div>

        <div className="flex gap-3 pt-2">
          {step > 0 && (
            <Button type="button" variant="secondary" size="lg" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="h-4 w-4" /> Geri
            </Button>
          )}
          <Button type="submit" size="lg" className="flex-1" disabled={busy}>
            {step < 2 ? (
              <>
                Devam <ArrowRight className="h-4 w-4" />
              </>
            ) : busy ? (
              'Kaydediliyor…'
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" /> Kaydı tamamla
              </>
            )}
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}

export function VerifyEmail() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<'pending' | 'ok' | 'fail'>('pending');
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    api
      .post('/auth/verify-email', { token: params.get('token') || '' })
      .then(() => setStatus('ok'))
      .catch((e) => {
        setError(e);
        setStatus('fail');
      });
  }, [params]);
  return (
    <AuthLayout title="E-posta doğrulama">
      {status === 'pending' && <Spinner label="Doğrulanıyor…" />}
      {status === 'ok' && (
        <div className="space-y-5">
          <Alert kind="success">E-posta adresiniz doğrulandı.</Alert>
          <ButtonLink to="/giris" size="lg" className="w-full">
            Giriş yap
          </ButtonLink>
        </div>
      )}
      {status === 'fail' && (
        <div className="space-y-5">
          <Alert error={error} />
          <ResendVerification />
        </div>
      )}
    </AuthLayout>
  );
}

function ResendVerification() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { run, busy, error } = useAction();
  if (sent) return <Alert kind="success">Hesap varsa yeni doğrulama bağlantısı gönderildi.</Alert>;
  return (
    <form
      className="space-y-4"
      onSubmit={submitWith(() =>
        run(async () => {
          await api.post('/auth/resend-verification', { email });
          setSent(true);
        }),
      )}
    >
      <Alert error={error} />
      <Field label="Yeni bağlantı için e-posta" htmlFor="v-email">
        <input id="v-email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Button type="submit" variant="secondary" className="w-full" disabled={busy}>
        Bağlantıyı tekrar gönder
      </Button>
    </form>
  );
}

/* ------------------------------ Şifre işlemleri ----------------------------- */

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { run, busy, error } = useAction();
  return (
    <AuthLayout title="Şifremi unuttum" subtitle="E-posta adresinize bir sıfırlama bağlantısı gönderelim.">
      {sent ? (
        <Alert kind="success">Hesap varsa şifre sıfırlama bağlantısı e-postanıza gönderildi.</Alert>
      ) : (
        <form
          className="space-y-5"
          onSubmit={submitWith(() =>
            run(async () => {
              await api.post('/auth/forgot-password', { email });
              setSent(true);
            }),
          )}
        >
          <Alert error={error} />
          <Field label="E-posta" htmlFor="f-email">
            <input id="f-email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            <KeyRound className="h-4 w-4" /> Bağlantı gönder
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link to="/giris" className="text-slate-500 hover:text-slate-900">
          Girişe dön
        </Link>
      </p>
    </AuthLayout>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const { run, busy, error } = useAction();
  return (
    <AuthLayout title="Yeni şifre belirleyin">
      {done ? (
        <div className="space-y-5">
          <Alert kind="success">Şifreniz güncellendi.</Alert>
          <ButtonLink to="/giris" size="lg" className="w-full">
            Giriş yap
          </ButtonLink>
        </div>
      ) : (
        <form
          className="space-y-5"
          onSubmit={submitWith(() =>
            run(async () => {
              await api.post('/auth/reset-password', { token: params.get('token') || '', password });
              setDone(true);
            }),
          )}
        >
          <Alert error={error} />
          <Field label="Yeni şifre" htmlFor="rp-pass" hint="En az 8 karakter.">
            <input id="rp-pass" className="input" type="password" minLength={8} required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            Kaydet
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

export function AcceptInvite() {
  const [params] = useSearchParams();
  const auth = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', title: '', password: '', kvkk: false });
  const { run, busy, error } = useAction();
  return (
    <AuthLayout title="Daveti kabul edin" subtitle="Firmanızın TeknoOrtak hesabına katılın.">
      <form
        className="space-y-5"
        onSubmit={submitWith(() =>
          run(async () => {
            const r = await api.post<{ token: string }>('/auth/accept-invite', {
              token: params.get('token') || '',
              fullName: form.fullName,
              title: form.title || undefined,
              password: form.password,
              kvkkConsent: form.kvkk,
            });
            await auth.acceptToken(r.token);
            navigate('/app', { replace: true });
          }),
        )}
      >
        <Alert error={error} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Ad soyad" htmlFor="i-name">
            <input id="i-name" className="input" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </Field>
          <Field label="Unvan" htmlFor="i-title">
            <input id="i-title" className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
        </div>
        <Field label="Şifre" htmlFor="i-pass" hint="En az 8 karakter.">
          <input id="i-pass" className="input" type="password" minLength={8} required autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-600">
          <input type="checkbox" required className="mt-0.5 h-4 w-4 accent-primary-500" checked={form.kvkk} onChange={(e) => setForm({ ...form, kvkk: e.target.checked })} />
          <span>
            <Link to="/kvkk" target="_blank" className="text-primary-600 hover:underline">
              KVKK aydınlatma metnini
            </Link>{' '}
            okudum ve kabul ediyorum.
          </span>
        </label>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          Hesabı oluştur
        </Button>
      </form>
    </AuthLayout>
  );
}
