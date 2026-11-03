import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { closeSocket } from '../socket';
import { Alert, Field, useAction } from '../components/ui';
import { ROLES, fmtDate } from '../labels';

export default function Account() {
  const auth = useAuth();
  const navigate = useNavigate();
  const u = auth.user;
  const [f, setF] = useState({ fullName: u.fullName || '', title: u.title || '', phone: u.phone || '', marketingConsent: !!u.consents?.marketing });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [del, setDel] = useState('');
  const [msg, setMsg] = useState(null);
  const a1 = useAction();
  const a2 = useAction();
  const a3 = useAction();

  return (
    <div className="stack narrow">
      <h1>Hesabım</h1>
      <p className="muted">{u.email} · {ROLES[u.role]}</p>
      {msg && <Alert kind="success">{msg}</Alert>}
      <form className="panel stack" onSubmit={(e) => { e.preventDefault(); a1.run(async () => { await api.patch('/auth/me', f); await auth.refresh(); setMsg('Bilgileriniz güncellendi.'); }); }}>
        <h3>Kişisel bilgiler</h3>
        <Alert error={a1.error} />
        <Field label="Ad soyad"><input required value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></Field>
        <div className="grid2">
          <Field label="Unvan"><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Telefon"><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        </div>
        <label className="check"><input type="checkbox" checked={f.marketingConsent} onChange={(e) => setF({ ...f, marketingConsent: e.target.checked })} /><span>Duyuru ve çağrı e-postaları almak istiyorum</span></label>
        <div><button className="btn btn-primary" disabled={a1.busy}>Kaydet</button></div>
      </form>

      <form className="panel stack" onSubmit={(e) => { e.preventDefault(); a2.run(async () => { await api.post('/auth/change-password', pw); setPw({ currentPassword: '', newPassword: '' }); setMsg('Şifreniz değiştirildi.'); }); }}>
        <h3>Şifre değiştir</h3>
        <Alert error={a2.error} />
        <div className="grid2">
          <Field label="Mevcut şifre"><input type="password" required autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>
          <Field label="Yeni şifre"><input type="password" minLength={8} required autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field>
        </div>
        <div><button className="btn" disabled={a2.busy}>Değiştir</button></div>
      </form>

      <div className="panel stack danger">
        <h3>Hesabı sil (KVKK)</h3>
        <p className="small">Kişisel verileriniz kalıcı olarak silinir. Firmanın son kullanıcısıysanız firma profili pasifleşir ve eşleşmeler kapanır.
          KVKK onayı: {u.consents?.kvkkVersion} sürümü, {fmtDate(u.consents?.kvkkAcceptedAt)}.</p>
        <Alert error={a3.error} />
        <div className="row wrap">
          <input type="password" placeholder="Onay için şifreniz" value={del} onChange={(e) => setDel(e.target.value)} />
          <button type="button" className="btn btn-no" disabled={a3.busy || !del} onClick={() => a3.run(async () => {
            if (!window.confirm('Hesabınız kalıcı olarak silinecek. Emin misiniz?')) return;
            await api.del('/auth/me', { password: del });
            closeSocket();
            auth.logout();
            navigate('/login');
          })}>Hesabımı sil</button>
        </div>
      </div>
    </div>
  );
}
