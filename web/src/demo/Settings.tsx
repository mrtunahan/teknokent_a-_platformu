import { Ban, Download, Eye, FileText, Lock, RotateCcw, ShieldCheck, Trash2, UserX } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '@/store/AppStore';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, CompanyLogo, Modal, Toggle } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import type { PrivacySettings } from '@/types';

function Card({ icon, title, description, children }: { icon: ReactNode; title: string; description?: string; children: ReactNode }) {
  return (
    <section className="glass rounded-3xl p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-electric-300">{icon}</span>
        <div>
          <h2 className="font-display text-lg font-semibold text-white">{title}</h2>
          {description && <p className="text-sm text-slate-400">{description}</p>}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function Settings() {
  const { state, dispatch, companyById } = useStore();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const p = state.privacy;
  const set = (v: Partial<PrivacySettings>) => {
    dispatch({ type: 'setPrivacy', privacy: v });
    toast({ title: 'Tercih kaydedildi', tone: 'info' });
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ profile: state.me, matches: state.matches, messages: state.messages, privacy: state.privacy, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `teknomatch-verilerim-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast({ title: 'Verileriniz indirildi', body: 'KVKK md. 11 kapsamında veri taşınabilirliği talebiniz karşılandı.' });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader title="Hesap Ayarları" description="Gizlilik, görünürlük, güvenlik ve veri tercihleriniz." />

      <Card icon={<Eye className="h-5 w-5" />} title="Profil görünürlüğü" description="Profilinizi keşfet ekranında kimlerin görebileceğini seçin.">
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
          {(
            [
              ['everyone', 'Tüm platform', 'Doğrulanmış tüm firmalar'],
              ['same_technopark', 'Teknokentim', `Yalnızca ${state.me.technopark}`],
              ['matches_only', 'Gizli mod', 'Yalnızca beğendiğiniz firmalar'],
            ] as const
          ).map(([v, t, d]) => (
            <button key={v} role="radio" aria-checked={p.profileVisibility === v} onClick={() => set({ profileVisibility: v })} className={cn('rounded-2xl border p-4 text-left transition', p.profileVisibility === v ? 'border-electric-400/60 bg-electric-500/10' : 'border-white/10 hover:border-white/20')}>
              <div className="text-sm font-medium text-white">{t}</div>
              <div className="mt-0.5 text-xs text-slate-400">{d}</div>
            </button>
          ))}
        </div>
        <div className="mt-4 divide-y divide-white/[0.06]">
          <Toggle checked={p.showInFeatured} onChange={(v) => set({ showInFeatured: v })} label="Öne çıkan firmalarda görün" description="Ana sayfadaki vitrin alanında yer alabilirsiniz." />
        </div>
      </Card>

      <Card icon={<Lock className="h-5 w-5" />} title="Gizlilik & güvenli mesajlaşma">
        <div className="divide-y divide-white/[0.06]">
          <Toggle checked={p.showContactAfterMatch} onChange={(v) => set({ showContactAfterMatch: v })} label="Eşleşme sonrası iletişim bilgilerimi göster" description="Kapalıyken firmalar size yalnızca platform içinden ulaşabilir." />
          <Toggle checked={p.readReceipts} onChange={(v) => set({ readReceipts: v })} label="Okundu bilgisi" description="Kapatırsanız siz de karşı tarafın okundu bilgisini göremezsiniz." />
          <Toggle checked={p.emailNotifications} onChange={(v) => set({ emailNotifications: v })} label="E-posta bildirimleri" description="Yeni eşleşme ve mesajlar için e-posta alın." />
          <Toggle checked={p.allowAnalytics} onChange={(v) => set({ allowAnalytics: v })} label="Anonim kullanım analitiği" description="Ürünü geliştirmemize yardımcı olur; açık rızanıza dayanır, istediğiniz zaman geri alabilirsiniz." />
        </div>
      </Card>

      <Card icon={<UserX className="h-5 w-5" />} title="Engellenen firmalar" description="Engellediğiniz firmalar sizi göremez ve size mesaj gönderemez.">
        {state.blocked.length === 0 ? (
          <p className="text-sm text-slate-500">Engellenmiş firma yok.</p>
        ) : (
          <ul className="space-y-2">
            {state.blocked.map((id) => {
              const c = companyById(id);
              if (!c) return null;
              return (
                <li key={id} className="flex items-center gap-3 rounded-2xl bg-white/[0.03] p-3">
                  <CompanyLogo company={c} size={36} />
                  <span className="flex-1 text-sm text-white">{c.name}</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      dispatch({ type: 'unblock', id });
                      toast({ title: `${c.name} engeli kaldırıldı`, tone: 'info' });
                    }}
                  >
                    <Ban className="h-4 w-4" /> Engeli kaldır
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        {state.reported.length > 0 && <p className="mt-4 text-xs text-slate-500">{state.reported.length} raporunuz moderasyon ekibi tarafından inceleniyor.</p>}
      </Card>

      <Card icon={<ShieldCheck className="h-5 w-5" />} title="KVKK & veri haklarınız" description="6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamındaki haklarınız.">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-slate-400">
          Açık rıza tarihi: <span className="text-slate-200">{state.me.kvkkConsentAt ? new Date(state.me.kvkkConsentAt).toLocaleString('tr-TR') : 'Demo profili (rıza alınmadı)'}</span>
          <br />
          Veri sorumlusu: <span className="text-slate-200">TeknoMatch Platformu</span> · Saklama süresi: hesap aktif olduğu sürece + 2 yıl
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={exportData}>
            <Download className="h-4 w-4" /> Verilerimi indir
          </Button>
          <Link to="/kvkk" className="inline-flex h-9 items-center gap-2 rounded-xl px-3.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white">
            <FileText className="h-4 w-4" /> Aydınlatma metni
          </Link>
          <Button variant="ghost" size="sm" className="!text-rose-300" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" /> Hesabımı sil
          </Button>
        </div>
      </Card>

      <Card icon={<RotateCcw className="h-5 w-5" />} title="Prototip" description="Bu prototip verileri tarayıcınızda saklar.">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            dispatch({ type: 'reset' });
            toast({ title: 'Demo verileri sıfırlandı', tone: 'info' });
          }}
        >
          <RotateCcw className="h-4 w-4" /> Demo verilerini sıfırla
        </Button>
      </Card>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Hesabınızı silmek istiyor musunuz?">
        <p className="text-sm leading-relaxed text-slate-400">Firma profiliniz, eşleşmeleriniz ve mesajlarınız 30 gün içinde kalıcı olarak silinir. Yasal saklama yükümlülüğü olan kayıtlar (ör. fatura) anonimleştirilerek tutulur.</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Vazgeç
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              dispatch({ type: 'reset' });
              setConfirmDelete(false);
              toast({ title: 'Silme talebiniz alındı', body: 'Prototipte demo verileri sıfırlandı.', tone: 'warning' });
            }}
          >
            <Trash2 className="h-4 w-4" /> Kalıcı olarak sil
          </Button>
        </div>
      </Modal>
    </div>
  );
}
