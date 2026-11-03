import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { Alert, Field, Spinner, useAction } from '../components/ui';

function AuthCard({ title, subtitle, children }) {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand brand-lg">Tekno<span>Match</span></div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

export function Login() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const { run, busy, error } = useAction();
  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      const r = await auth.login(form.email, form.password);
      const role = r.user.role;
      navigate(role === 'technopark_admin' || role === 'super_admin' ? '/panel' : '/feed');
    });
  };
  return (
    <AuthCard title="Giriş yap" subtitle="Teknokentinizdeki iş ortaklarını keşfedin.">
      <form onSubmit={submit} className="stack">
        <Alert error={error} />
        <Field label="Kurumsal e-posta">
          <input type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Şifre">
          <input type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Giriş yapılıyor…' : 'Giriş yap'}</button>
        <div className="auth-links">
          <Link to="/forgot-password">Şifremi unuttum</Link>
          <Link to="/register">Firmanızı kaydedin</Link>
        </div>
      </form>
    </AuthCard>
  );
}

export function Register() {
  const [tps, setTps] = useState([]);
  const [done, setDone] = useState(null);
  const [form, setForm] = useState({
    fullName: '', title: '', email: '', password: '', companyName: '', taxNumber: '', technoparkId: '', kvkk: false, marketing: false,
  });
  const { run, busy, error } = useAction();
  useEffect(() => { api.get('/technoparks').then((r) => setTps(r.technoparks)).catch(() => {}); }, []);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = (e) => {
    e.preventDefault();
    run(async () => {
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
      <AuthCard title="Neredeyse hazır">
        <Alert kind="success">
          {done.message || 'Kayıt tamamlandı.'} {done.company?.claimed && 'Teknokentinizin önceden oluşturduğu firma profilini sahiplendiniz.'}
        </Alert>
        <p>E-postanızı doğruladıktan sonra giriş yapabilirsiniz. {done.company?.verificationStatus !== 'approved'
          && 'Firmanız teknokent yönetimi tarafından onaylandığında akışınız açılır.'}</p>
        <Link className="btn btn-primary" to="/login">Giriş sayfasına git</Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Firmanızı kaydedin" subtitle="Yalnızca kurumsal e-posta adresleri kabul edilir.">
      <form onSubmit={submit} className="stack">
        <Alert error={error} />
        <div className="grid2">
          <Field label="Ad soyad"><input required value={form.fullName} onChange={set('fullName')} /></Field>
          <Field label="Unvan"><input value={form.title} onChange={set('title')} placeholder="Ör. Kurucu ortak" /></Field>
        </div>
        <Field label="Kurumsal e-posta" hint="gmail, hotmail vb. adresler kabul edilmez.">
          <input type="email" required value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Şifre" hint="En az 8 karakter.">
          <input type="password" minLength={8} required autoComplete="new-password" value={form.password} onChange={set('password')} />
        </Field>
        <Field label="Firma unvanı"><input required value={form.companyName} onChange={set('companyName')} /></Field>
        <div className="grid2">
          <Field label="Vergi numarası"><input required inputMode="numeric" pattern="\d{10}" maxLength={10} value={form.taxNumber} onChange={set('taxNumber')} /></Field>
          <Field label="Teknokent">
            <select required value={form.technoparkId} onChange={set('technoparkId')}>
              <option value="">Seçin…</option>
              {tps.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.city})</option>)}
            </select>
          </Field>
        </div>
        <label className="check">
          <input type="checkbox" required checked={form.kvkk} onChange={set('kvkk')} />
          <span>KVKK aydınlatma metnini okudum; kişisel verilerimin yalnızca firma temsilcisi iletişim bilgisi olarak işlenmesini kabul ediyorum.</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={form.marketing} onChange={set('marketing')} />
          <span>Teknokent duyuruları ve çağrılar hakkında e-posta almak istiyorum (isteğe bağlı).</span>
        </label>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Kaydediliyor…' : 'Kayıt ol'}</button>
        <div className="auth-links"><Link to="/login">Zaten hesabım var</Link></div>
      </form>
    </AuthCard>
  );
}

export function VerifyEmail() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState('pending');
  const [error, setError] = useState(null);
  useEffect(() => {
    api.post('/auth/verify-email', { token: params.get('token') || '' })
      .then(() => setStatus('ok'))
      .catch((e) => { setError(e); setStatus('fail'); });
  }, [params]);
  return (
    <AuthCard title="E-posta doğrulama">
      {status === 'pending' && <Spinner label="Doğrulanıyor…" />}
      {status === 'ok' && <><Alert kind="success">E-posta adresiniz doğrulandı.</Alert><Link className="btn btn-primary" to="/login">Giriş yap</Link></>}
      {status === 'fail' && <><Alert error={error} /><ResendVerification /></>}
    </AuthCard>
  );
}

function ResendVerification() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { run, busy } = useAction();
  if (sent) return <Alert kind="success">Hesap varsa yeni doğrulama bağlantısı gönderildi.</Alert>;
  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); run(async () => { await api.post('/auth/resend-verification', { email }); setSent(true); }); }}>
      <Field label="Yeni bağlantı için e-posta"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <button className="btn" disabled={busy}>Tekrar gönder</button>
    </form>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { run, busy, error } = useAction();
  return (
    <AuthCard title="Şifremi unuttum">
      {sent ? <Alert kind="success">Hesap varsa şifre sıfırlama bağlantısı e-postanıza gönderildi.</Alert> : (
        <form className="stack" onSubmit={(e) => { e.preventDefault(); run(async () => { await api.post('/auth/forgot-password', { email }); setSent(true); }); }}>
          <Alert error={error} />
          <Field label="E-posta"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <button className="btn btn-primary" disabled={busy}>Bağlantı gönder</button>
        </form>
      )}
      <div className="auth-links"><Link to="/login">Girişe dön</Link></div>
    </AuthCard>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const { run, busy, error } = useAction();
  return (
    <AuthCard title="Yeni şifre belirleyin">
      {done ? <><Alert kind="success">Şifreniz güncellendi.</Alert><Link className="btn btn-primary" to="/login">Giriş yap</Link></> : (
        <form className="stack" onSubmit={(e) => { e.preventDefault(); run(async () => { await api.post('/auth/reset-password', { token: params.get('token') || '', password }); setDone(true); }); }}>
          <Alert error={error} />
          <Field label="Yeni şifre" hint="En az 8 karakter."><input type="password" minLength={8} required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <button className="btn btn-primary" disabled={busy}>Kaydet</button>
        </form>
      )}
    </AuthCard>
  );
}

export function AcceptInvite() {
  const [params] = useSearchParams();
  const auth = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', title: '', password: '', kvkk: false });
  const { run, busy, error } = useAction();
  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      const r = await api.post('/auth/accept-invite', {
        token: params.get('token') || '', fullName: form.fullName, title: form.title || undefined, password: form.password, kvkkConsent: form.kvkk,
      });
      await auth.acceptToken(r.token);
      navigate('/feed');
    });
  };
  return (
    <AuthCard title="Daveti kabul et" subtitle="Firmanızın TeknoMatch hesabına katılın.">
      <form className="stack" onSubmit={submit}>
        <Alert error={error} />
        <Field label="Ad soyad"><input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
        <Field label="Unvan"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Şifre" hint="En az 8 karakter."><input type="password" minLength={8} required autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        <label className="check">
          <input type="checkbox" required checked={form.kvkk} onChange={(e) => setForm({ ...form, kvkk: e.target.checked })} />
          <span>KVKK aydınlatma metnini okudum ve kabul ediyorum.</span>
        </label>
        <button className="btn btn-primary" disabled={busy}>Hesabı oluştur</button>
      </form>
    </AuthCard>
  );
}
