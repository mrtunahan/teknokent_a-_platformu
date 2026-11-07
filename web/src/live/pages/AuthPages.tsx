import { motion } from 'framer-motion';
import { ArrowRight, Building2, CheckCircle2, KeyRound, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { SLOGAN_EN, SLOGAN_TR } from '@/data/options';
import { Aurora, BrandMark, Button, ButtonLink } from '@/components/ui';
import { api } from '../api';
import { homeFor, useAuth } from '../auth';
import { useAction } from '../hooks';
import { Alert, Field, Select, Spinner } from '../ui';

const FREE_DOMAINS = new Set(['gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.com.tr', 'outlook.com', 'outlook.com.tr', 'live.com', 'yahoo.com', 'yahoo.com.tr', 'icloud.com', 'yandex.com', 'yandex.com.tr', 'mynet.com', 'proton.me', 'protonmail.com']);

/** Kimlik doğrulama sayfaları için iki sütunlu, markalı kabuk. */
function AuthLayout({ title, subtitle, children, wide }: { title: string; subtitle?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <div className="relative grid min-h-[100svh] lg:grid-cols-[1fr_minmax(0,560px)]">
      <aside className="noise relative hidden overflow-hidden border-r border-white/[0.06] bg-ink-900 lg:block">
        <Aurora />
        <div className="absolute inset-0 bg-grid opacity-40 mask-radial" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/" aria-label="Ana sayfa">
            <BrandMark />
          </Link>
          <div>
            <h2 className="max-w-md font-display text-4xl font-bold leading-tight tracking-tight text-white">{SLOGAN_TR}</h2>
            <p className="mt-3 text-slate-400">{SLOGAN_EN}</p>
            <ul className="mt-10 space-y-4 text-sm text-slate-300">
              {[
                [ShieldCheck, 'Teknokent yönetimi tarafından doğrulanmış firmalar'],
                [Lock, 'İletişim bilgileri yalnızca karşılıklı eşleşmeden sonra paylaşılır'],
                [Building2, 'Türkiye genelindeki teknokentlerden iş ortakları'],
              ].map(([Icon, t]) => {
                const I = Icon as typeof Lock;
                return (
                  <li key={t as string} className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.05] text-electric-300 ring-1 ring-white/10">
                      <I className="h-4 w-4" />
                    </span>
                    {t as string}
                  </li>
                );
              })}
            </ul>
          </div>
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} TeknoMatch</p>
        </div>
      </aside>
      <main className="relative flex flex-col px-4 py-8 sm:px-10">
        <Link to="/" className="mb-10 lg:hidden" aria-label="Ana sayfa">
          <BrandMark />
        </Link>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className={`m-auto w-full ${wide ? 'max-w-xl' : 'max-w-md'}`}>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-slate-400">{subtitle}</p>}
          <div className="mt-8">{children}</div>
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
  const from = (location.state as { from?: string } | null)?.from;

  return (
    <AuthLayout
      title="Tekrar hoş geldiniz"
      subtitle={
        <>
          Hesabınız yok mu?{' '}
          <Link to="/kayit" className="text-electric-300 hover:underline">
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
        <Alert error={error} />
        <Field label="Kurumsal e-posta" htmlFor="l-email">
          <input id="l-email" className="input" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ad@firmaniz.com.tr" />
        </Field>
        <Field label="Şifre" htmlFor="l-pass">
          <input id="l-pass" className="input" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm text-slate-400 hover:text-white">
            Şifremi unuttum
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? 'Giriş yapılıyor…' : 'Giriş yap'} <ArrowRight className="h-4 w-4" />
        </Button>
        <p className="text-center text-xs text-slate-500">
          Önce denemek mi istiyorsunuz?{' '}
          <Link to="/demo/discover" className="text-slate-300 hover:underline">
            Demo ile keşfedin
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

/* ---------------------------------- Kayıt ----------------------------------- */

export function Register() {
  const [tps, setTps] = useState<{ id: string; name: string; city: string }[]>([]);
  const [done, setDone] = useState<{ message?: string; company?: { claimed?: boolean; verificationStatus?: string } } | null>(null);
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState(false);
  const [form, setForm] = useState({ fullName: '', title: '', email: '', password: '', companyName: '', taxNumber: '', technoparkId: '', kvkk: false, marketing: false });
  const { run, busy, error } = useAction();
  useEffect(() => {
    api
      .get<{ technoparks: { id: string; name: string; city: string }[] }>('/technoparks')
      .then((r) => setTps(r.technoparks))
      .catch(() => {});
  }, []);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value });

  const domain = form.email.split('@')[1]?.toLowerCase();
  const errs: Record<string, string> = {};
  if (step === 0) {
    if (form.fullName.trim().length < 2) errs.fullName = 'Ad soyad gerekli.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) errs.email = 'Geçerli bir e-posta girin.';
    else if (domain && FREE_DOMAINS.has(domain)) errs.email = 'Kurumsal e-posta kullanın (gmail, hotmail vb. kabul edilmez).';
    if (form.password.length < 8) errs.password = 'Şifre en az 8 karakter olmalı.';
  } else {
    if (form.companyName.trim().length < 2) errs.companyName = 'Firma unvanı gerekli.';
    if (!/^\d{10}$/.test(form.taxNumber)) errs.taxNumber = 'Vergi numarası 10 haneli olmalı.';
    if (!form.technoparkId) errs.technoparkId = 'Teknokent seçin.';
    if (!form.kvkk) errs.kvkk = 'Devam etmek için aydınlatma metnini onaylayın.';
  }
  const err = (k: string) => (touched ? errs[k] : undefined);
  const valid = !Object.keys(errs).length;

  if (done) {
    return (
      <AuthLayout title="Neredeyse hazır" subtitle="Kaydınız alındı.">
        <div className="space-y-5">
          <div className="glass flex gap-4 rounded-3xl p-6">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-aqua-400/15 text-aqua-300">
              <Mail className="h-5 w-5" />
            </span>
            <div className="text-sm leading-relaxed text-slate-300">
              <p className="font-medium text-white">{done.message || 'E-posta adresinize bir doğrulama bağlantısı gönderdik.'}</p>
              {done.company?.claimed && <p className="mt-2">Teknokentinizin önceden oluşturduğu firma profilini sahiplendiniz.</p>}
              <p className="mt-2 text-slate-400">
                E-postanızı doğruladıktan sonra giriş yapabilirsiniz.
                {done.company?.verificationStatus !== 'approved' && ' Firmanız teknokent yönetimi tarafından onaylandığında keşfet akışınız açılır.'}
              </p>
            </div>
          </div>
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
          <Link to="/giris" className="text-electric-300 hover:underline">
            Giriş yapın
          </Link>
        </>
      }
    >
      <div className="mb-8 flex items-center gap-3 text-xs">
        {['Yetkili bilgileri', 'Firma bilgileri'].map((l, i) => (
          <div key={l} className="flex flex-1 items-center gap-2">
            <span className={`grid h-7 w-7 place-items-center rounded-lg ${i < step ? 'bg-aqua-400/20 text-aqua-300' : i === step ? 'bg-electric-500 text-white' : 'bg-white/5 text-slate-500'}`}>
              {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </span>
            <span className={i === step ? 'text-white' : 'text-slate-500'}>{l}</span>
            {i === 0 && <span className="h-px flex-1 bg-white/10" />}
          </div>
        ))}
      </div>
      <form
        className="space-y-5"
        noValidate
        onSubmit={submitWith(() => {
          if (!valid) return setTouched(true);
          if (step === 0) {
            setTouched(false);
            return setStep(1);
          }
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
        })}
      >
        <Alert error={error} />
        {step === 0 ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Ad soyad" htmlFor="r-name" error={err('fullName')}>
                <input id="r-name" className="input" autoComplete="name" value={form.fullName} onChange={set('fullName')} />
              </Field>
              <Field label="Unvan" htmlFor="r-title">
                <input id="r-title" className="input" value={form.title} onChange={set('title')} placeholder="Ör. Kurucu ortak" />
              </Field>
            </div>
            <Field label="Kurumsal e-posta" htmlFor="r-email" error={err('email')} hint="Gmail, Hotmail gibi kişisel adresler kabul edilmez.">
              <input id="r-email" className="input" type="email" autoComplete="email" value={form.email} onChange={set('email')} placeholder="ad@firmaniz.com.tr" />
            </Field>
            <Field label="Şifre" htmlFor="r-pass" error={err('password')} hint="En az 8 karakter.">
              <input id="r-pass" className="input" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} />
            </Field>
            <Button type="submit" size="lg" className="w-full">
              Devam <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <Field label="Firma unvanı" htmlFor="r-company" error={err('companyName')}>
              <input id="r-company" className="input" value={form.companyName} onChange={set('companyName')} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Vergi numarası" htmlFor="r-vkn" error={err('taxNumber')}>
                <input id="r-vkn" className="input" inputMode="numeric" maxLength={10} value={form.taxNumber} onChange={(e) => setForm({ ...form, taxNumber: e.target.value.replace(/\D/g, '') })} />
              </Field>
              <Field label="Teknokent" htmlFor="r-tp" error={err('technoparkId')}>
                <Select id="r-tp" value={form.technoparkId} onChange={set('technoparkId')}>
                  <option value="">Seçin…</option>
                  {tps.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.city})
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
              <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-300">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-electric-500" checked={form.kvkk} onChange={set('kvkk')} />
                <span>
                  <Link to="/kvkk" target="_blank" className="text-electric-300 hover:underline">
                    KVKK aydınlatma metnini
                  </Link>{' '}
                  okudum; kişisel verilerimin firma temsilcisi iletişim bilgisi olarak işlenmesini kabul ediyorum.
                </span>
              </label>
              {err('kvkk') && <p className="mt-2 text-xs text-rose-300">{err('kvkk')}</p>}
              <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm text-slate-400">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-electric-500" checked={form.marketing} onChange={set('marketing')} />
                Teknokent duyuruları ve çağrılar hakkında e-posta almak istiyorum (isteğe bağlı).
              </label>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="ghost" size="lg" onClick={() => setStep(0)}>
                Geri
              </Button>
              <Button type="submit" size="lg" className="flex-1" disabled={busy}>
                {busy ? 'Kaydediliyor…' : 'Kaydı tamamla'}
              </Button>
            </div>
          </>
        )}
      </form>
    </AuthLayout>
  );
}

/* ---------------------------- E-posta doğrulama ---------------------------- */

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
        <Link to="/giris" className="text-slate-400 hover:text-white">
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
    <AuthLayout title="Daveti kabul edin" subtitle="Firmanızın TeknoMatch hesabına katılın.">
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
        <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-300">
          <input type="checkbox" required className="mt-0.5 h-4 w-4 accent-electric-500" checked={form.kvkk} onChange={(e) => setForm({ ...form, kvkk: e.target.checked })} />
          <span>
            <Link to="/kvkk" target="_blank" className="text-electric-300 hover:underline">
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
