import { Ban, KeyRound, LogOut, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, Modal, Toggle } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { api } from '../api';
import { useAuth } from '../auth';
import { useAction, useLoad } from '../hooks';
import { ROLES, fmtDate } from '../labels';
import { Alert, Field, Logo, Spinner } from '../ui';
import type { OwnCompany } from '../types';

function Card({ icon, title, description, children }: { icon: ReactNode; title: string; description?: string; children: ReactNode }) {
  return (
    <section className="glass rounded-3xl p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-primary-600">{icon}</span>
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900">{title}</h2>
          {description && <p className="text-sm text-slate-500">{description}</p>}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function LiveAccount() {
  const auth = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const u = auth.user!;
  const [f, setF] = useState({ fullName: u.fullName || '', title: u.title || '', phone: u.phone || '', marketingConsent: !!u.consents?.marketing });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [del, setDel] = useState('');
  const [confirm, setConfirm] = useState(false);
  const a1 = useAction();
  const a2 = useAction();
  const a3 = useAction();
  const a4 = useAction();
  const own = useLoad(() => (auth.isCompanyUser ? api.get<{ company: OwnCompany }>('/companies/me') : Promise.resolve(null)), [auth.isCompanyUser]);
  const blocked = (own.data?.company.blockedCompanies ?? []).filter((b): b is { _id: string; name: string; logoUrl?: string } => typeof b !== 'string');

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        title="Hesabım"
        description={`${u.email} · ${ROLES[u.role]}`}
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              auth.logout();
              navigate('/giris', { replace: true });
            }}
          >
            <LogOut className="h-4 w-4" /> Çıkış yap
          </Button>
        }
      />

      <Card icon={<UserRound className="h-5 w-5" />} title="Kişisel bilgiler">
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            void a1.run(async () => {
              await api.patch('/auth/me', f);
              await auth.refresh();
              toast({ title: 'Bilgileriniz güncellendi' });
            });
          }}
        >
          <Alert error={a1.error} />
          <Field label="Ad soyad" htmlFor="a-name">
            <input id="a-name" className="input" required value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Unvan" htmlFor="a-title">
              <input id="a-title" className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
            </Field>
            <Field label="Telefon" htmlFor="a-phone">
              <input id="a-phone" className="input" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            </Field>
          </div>
          <Toggle checked={f.marketingConsent} onChange={(v) => setF({ ...f, marketingConsent: v })} label="Duyuru ve çağrı e-postaları" description="Teknokent etkinlikleri ve destek çağrıları hakkında bilgilendirme (açık rıza)." />
          <div className="flex justify-end">
            <Button type="submit" disabled={a1.busy}>
              Kaydet
            </Button>
          </div>
        </form>
      </Card>

      <Card icon={<KeyRound className="h-5 w-5" />} title="Şifre değiştir">
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            void a2.run(async () => {
              await api.post('/auth/change-password', pw);
              setPw({ currentPassword: '', newPassword: '' });
              toast({ title: 'Şifreniz değiştirildi' });
            });
          }}
        >
          <Alert error={a2.error} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Mevcut şifre" htmlFor="a-cur">
              <input id="a-cur" className="input" type="password" required autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
            </Field>
            <Field label="Yeni şifre" htmlFor="a-new" hint="En az 8 karakter.">
              <input id="a-new" className="input" type="password" minLength={8} required autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="secondary" disabled={a2.busy}>
              Şifreyi değiştir
            </Button>
          </div>
        </form>
      </Card>

      {auth.isCompanyUser && (
        <Card icon={<Ban className="h-5 w-5" />} title="Engellenen firmalar" description="Engellediğiniz firmalar sizi listede göremez ve size ulaşamaz.">
          <Alert error={a4.error || own.error} className="mb-3" />
          {own.loading ? (
            <Spinner className="!py-6" />
          ) : blocked.length === 0 ? (
            <p className="text-sm text-slate-500">Engellenmiş firma yok.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {blocked.map((b) => (
                <li key={b._id} className="flex items-center gap-3 py-3">
                  <Logo company={b} size={36} />
                  <span className="flex-1 text-sm font-medium text-slate-900">{b.name}</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={a4.busy}
                    onClick={() =>
                      a4.run(async () => {
                        await api.del(`/companies/me/blocks/${b._id}`);
                        toast({ title: `${b.name} engeli kaldırıldı`, tone: 'info' });
                        await own.reload();
                      })
                    }
                  >
                    Engeli kaldır
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card icon={<ShieldCheck className="h-5 w-5" />} title="KVKK & veri haklarınız" description="6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamındaki haklarınız.">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          Onaylanan aydınlatma metni: <span className="text-slate-700">{u.consents?.kvkkVersion ?? '—'}</span> sürümü, <span className="text-slate-700">{fmtDate(u.consents?.kvkkAcceptedAt) || '—'}</span>
          <br />
          <Link to="/kvkk" className="text-primary-600 hover:underline">
            Aydınlatma metnini görüntüle
          </Link>
        </div>
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
          <div className="text-sm font-semibold text-rose-700">Hesabı sil</div>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">Kişisel verileriniz kalıcı olarak silinir. Firmanın son kullanıcısıysanız firma profili pasifleşir ve eşleşmeler kapanır.</p>
          <Alert error={a3.error} className="mt-3" />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input type="password" className="input flex-1" placeholder="Onay için şifreniz" autoComplete="current-password" value={del} onChange={(e) => setDel(e.target.value)} aria-label="Onay için şifre" />
            <Button variant="danger" disabled={!del} onClick={() => setConfirm(true)}>
              <Trash2 className="h-4 w-4" /> Hesabımı sil
            </Button>
          </div>
        </div>
      </Card>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Hesabınız kalıcı olarak silinecek">
        <p className="text-sm text-slate-500">Bu işlem geri alınamaz. Emin misiniz?</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirm(false)}>
            Vazgeç
          </Button>
          <Button
            variant="danger"
            disabled={a3.busy}
            onClick={() =>
              a3.run(async () => {
                setConfirm(false);
                await api.del('/auth/me', { password: del });
                auth.logout();
                navigate('/giris', { replace: true });
              })
            }
          >
            Kalıcı olarak sil
          </Button>
        </div>
      </Modal>
    </div>
  );
}
