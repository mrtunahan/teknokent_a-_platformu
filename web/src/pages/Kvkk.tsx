import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Aurora, BrandMark } from '@/components/ui';

const sections = [
  {
    id: 'aydinlatma',
    title: 'KVKK Aydınlatma Metni',
    body: [
      'TeknoOrtak (“Platform”), 6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca veri sorumlusu sıfatıyla, firma yetkililerine ait kişisel verileri bu metinde açıklanan amaçlarla ve hukuka uygun şekilde işler.',
      'İşlenen veriler: ad-soyad, unvan, kurumsal e-posta, telefon (isteğe bağlı), firma ve teknokent bilgileri, platform içi etkileşim kayıtları (beğeni, eşleşme, mesaj meta verileri) ve güvenlik kayıtları.',
      'İşleme amaçları: firma eşleştirme hizmetinin sunulması, uyum skorunun hesaplanması, firma doğrulaması, platform güvenliğinin sağlanması ve yasal yükümlülüklerin yerine getirilmesi.',
      'Hukuki sebepler: sözleşmenin kurulması ve ifası (KVKK m.5/2-c), meşru menfaat (m.5/2-f), hukuki yükümlülük (m.5/2-ç); analitik ve pazarlama iletişimi için açık rıza (m.5/1).',
    ],
  },
  {
    id: 'aktarim',
    title: 'Aktarım ve paylaşım',
    body: [
      'İletişim bilgileriniz yalnızca karşılıklı eşleştiğiniz firmalarla ve gizlilik ayarlarınız izin verdiği ölçüde paylaşılır.',
      'Firma doğrulaması amacıyla bağlı olduğunuz teknokent yönetim şirketi ile sınırlı bilgi paylaşılır. Veriler Türkiye’deki sunucularda barındırılır; yurt dışına aktarım yapılmaz.',
    ],
  },
  {
    id: 'haklar',
    title: 'Haklarınız (KVKK m.11)',
    body: [
      'Kişisel verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltilmesini veya silinmesini isteme, aktarıldığı üçüncü kişileri bilme ve işlemenin kanuna aykırılığı nedeniyle zarara uğramanız hâlinde zararın giderilmesini talep etme haklarına sahipsiniz.',
      'Taleplerinizi Hesap Ayarları > KVKK & veri haklarınız bölümünden veya kvkk@teknoortak.example.com adresinden iletebilirsiniz. Başvurular en geç 30 gün içinde sonuçlandırılır.',
    ],
  },
  { id: 'gizlilik', title: 'Gizlilik ve güvenlik', body: ['Mesajlar aktarım sırasında TLS ile şifrelenir. Şifreler tek yönlü özetlenerek saklanır. Engelleme ve raporlama mekanizmaları istenmeyen iletişime karşı koruma sağlar; 3 ve üzeri rapor alan profiller otomatik olarak incelemeye alınır.'] },
  { id: 'kosullar', title: 'Kullanım koşulları', body: ['Platform yalnızca doğrulanmış tüzel kişiler içindir. Toplu satış mesajı, sahte profil ve yanıltıcı beyanlar yasaktır ve hesabın askıya alınmasına neden olur.'] },
  { id: 'cerez', title: 'Çerez tercihleri', body: ['Zorunlu çerezler oturum ve güvenlik için kullanılır. Analitik çerezler yalnızca açık rızanızla etkinleşir ve Hesap Ayarları’ndan kapatılabilir.'] },
];

export default function Kvkk() {
  return (
    <div className="relative min-h-[100svh] overflow-hidden">
      <Aurora className="opacity-40" />
      <header className="relative z-10 mx-auto flex max-w-4xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to="/" aria-label="Ana sayfa">
          <BrandMark />
        </Link>
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Ana sayfa
        </Link>
      </header>
      <main className="relative z-10 mx-auto max-w-4xl px-4 pb-24 pt-8 sm:px-6">
        <span className="eyebrow">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Güven Merkezi
        </span>
        <h1 className="mt-5 font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Verileriniz, sizin kontrolünüzde.</h1>
        <p className="mt-4 text-slate-500">Son güncelleme: 1 Kasım 2026 · Sürüm 2026-11-01</p>
        <nav className="glass mt-10 flex flex-wrap gap-2 rounded-2xl p-3 text-sm">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900">
              {s.title}
            </a>
          ))}
        </nav>
        <div className="mt-10 space-y-10">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-8">
              <h2 className="font-display text-2xl font-semibold text-slate-900">{s.title}</h2>
              <div className="mt-4 space-y-3 leading-relaxed text-slate-500">
                {s.body.map((b) => (
                  <p key={b.slice(0, 24)}>{b}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
