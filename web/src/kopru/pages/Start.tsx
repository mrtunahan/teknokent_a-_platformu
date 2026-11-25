import { ArrowRight, Building2, Cpu, FlaskConical, GraduationCap, Handshake, Landmark, Network, Users, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandMark } from '@/components/ui';
import { CITIES, ORGS, ROLE_LABEL, type Role } from '../data';

const CARDS: { role: Role; icon: typeof Building2; who: string; does: string }[] = [
  { role: 'firma', icon: Building2, who: 'Kuzey Döküm San. A.Ş. (Çankırı OSB)', does: 'Üretimdeki sorununu ihtiyaç olarak bildirir, önerilen uzmanlarla toplantı yapar, analiz talep eder ve projeyi başlatır.' },
  { role: 'tfirma', icon: Cpu, who: 'Orion Yazılım (ÇAKÜ Teknokent)', does: 'Firma ağında diğer teknokent firmalarıyla eşleşir ve yazışır; sanayiden gelen davetleri yanıtlayıp projeye dönüştürür.' },
  { role: 'akademisyen', icon: GraduationCap, who: 'Doç. Dr. Elif Arslan (ÇAKÜ)', does: 'Gelen davetleri yanıtlar, laboratuvarına gelen analiz taleplerini yönetir, buluş bildirimi yapar, projeyi yürütür.' },
  { role: 'tto', icon: FlaskConical, who: 'ÇAKÜ, KÜ veya KBÜ TTO (kurum seçilebilir)', does: 'İhtiyaçları yönetir, akademisyen davet eder; gizlilik sözleşmesi, TÜBİTAK 1505 başvurusu ve fikri mülkiyet süreçlerini takip eder.' },
  { role: 'osb', icon: Landmark, who: 'Çankırı, Çankırı 2., Kastamonu, Karabük OSB', does: 'Kendi bölgesindeki firmaların ihtiyaçlarını ve çözülme oranını izler.' },
  { role: 'teknokent', icon: Cpu, who: 'ÇAKÜ, Kastamonu, Karabük Teknokent', does: 'Kendi firmalarının sanayiye çözüm katkısını izler.' },
  { role: 'platform', icon: Network, who: 'TeknoOrtak ağ yönetimi', does: 'Tüm illeri ve kurumları, iller arası iş birliklerini tek ekrandan izler.' },
];

const PILLARS: { icon: typeof Building2; title: string; text: string; to: string; cta: string }[] = [
  { icon: Users, title: 'Firma ağı', text: 'Teknokent firmaları birbirini keşfeder, karşılıklı ilgiyle eşleşir ve ortak proje için yazışmaya başlar.', to: '/demo/discover', cta: 'Firma ağını aç' },
  { icon: Handshake, title: 'Sanayi–Akademi köprüsü', text: 'OSB’deki üreticinin sorunu doğru akademisyen, laboratuvar ve teknokent firmasıyla buluşur; TTO süreci uçtan uca yönetir.', to: '/kopru/firma', cta: 'Köprüyü aç' },
  { icon: Video, title: 'Toplantı odaları', text: 'Ön yazışmadan tarayıcıda çalışan görüntülü toplantı odasına geçin; gündem ve kararlar projeye işlenir.', to: '/kopru/firma/toplantilar', cta: 'Toplantılara git' },
];

const STEPS: { text: string; role: Role; to: string }[] = [
  { text: 'Çankırı OSB’deki firma “döküm parçalarında gözenek” sorununu gizli ve tüm ağa açık ihtiyaç olarak bildirir; sistem Çankırı ve Karabük’ten aday uzman önerir.', role: 'firma', to: '/kopru/firma/ihtiyaclar/yeni' },
  { text: 'ÇAKÜ TTO ihtiyacı havuzda görür, incelemeyi üstlenir; kendi akademisyeniyle birlikte Karabük Üniversitesi’nden döküm uzmanını da davet eder (KBÜ TTO bilgilendirilir).', role: 'tto', to: '/kopru/tto' },
  { text: 'Akademisyen gizlilik sözleşmesini e-onayla kabul edince ayrıntıları görür ve daveti kabul eder.', role: 'akademisyen', to: '/kopru/akademisyen' },
  { text: 'Teknokent firması Orion Yazılım sanayi davetini yanıtlar; firma ağında ürününü tamamlayacak ortak firmayı keşfedip mesajlaşır.', role: 'tfirma', to: '/kopru/tfirma' },
  { text: 'Firma, adaylarla ön yazışma yapar ve tek tıkla görüntülü toplantı odası açar; toplantı notları projeye işlenir.', role: 'firma', to: '/kopru/firma/toplantilar' },
  { text: 'Firma, üniversite laboratuvarından numune analizi talep eder; akademisyen talebi onaylayıp sonuç raporunu yükler.', role: 'firma', to: '/kopru/firma/laboratuvar' },
  { text: 'TTO projeyi teklif → sözleşme aşamalarından geçirir ve TÜBİTAK 1505 başvurusunu adım adım takip eder.', role: 'tto', to: '/kopru/tto/destek' },
  { text: 'Akademisyen proje çıktısı için buluş bildirimi yapar; TTO fikri mülkiyet değerlendirmesini başlatır.', role: 'akademisyen', to: '/kopru/akademisyen/fikri-mulkiyet' },
  { text: 'Her rol, kendisini ilgilendiren olayları bildirim merkezinden izler ve tek tıkla ilgili ekrana gider.', role: 'firma', to: '/kopru/firma/bildirimler' },
  { text: 'Platform yönetimi iller arası ağı, kurumları ve şehirler arası eşleşmeleri tek ekrandan izler.', role: 'platform', to: '/kopru/platform' },
];

export default function KopruStart() {
  return (
    <div className="min-h-[100svh] bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="Ana sayfa">
            <BrandMark />
          </Link>
          <Link to="/" className="text-sm font-medium text-slate-500 hover:text-slate-900">
            Ana sayfa
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="max-w-3xl">
          <span className="chip">Demo · örnek veri</span>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">TeknoOrtak</h1>
          <p className="mt-2 font-display text-lg font-semibold text-slate-700">OSB · Teknokent · Üniversite (TTO) iş birliği platformu</p>
          <p className="mt-3 text-base leading-relaxed text-slate-600">
            Teknokent firmaları birbirleriyle eşleşir; OSB’deki üreticinin sorunu üniversitedeki doğru akademisyen ve teknokentteki doğru firmayla buluşur. TTO süreci yönetir; toplantıdan sözleşmeye, destek başvurusundan fikri mülkiyete kadar her adım tek yerden izlenir. Demo ağında {CITIES.length} il ve {ORGS.length} kurum var: {CITIES.join(', ')}.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { icon: Building2, t: 'OSB: sorun ve ihtiyaç sahibi üreticiler' },
              { icon: Cpu, t: 'Teknokent: çözümü ürüne dönüştüren Ar-Ge firmaları' },
              { icon: FlaskConical, t: 'Üniversite · TTO: akademisyen, laboratuvar, sözleşme' },
            ].map((x) => (
              <span key={x.t} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                <x.icon className="h-3.5 w-3.5 text-primary-600" /> {x.t}
              </span>
            ))}
          </div>
        </div>

        {/* Ürünün üç ayağı */}
        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {PILLARS.map((x) => (
            <Link key={x.title} to={x.to} className="glass group flex flex-col rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-card">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-50 text-primary-600">
                <x.icon className="h-5 w-5" />
              </span>
              <div className="mt-4 font-display text-lg font-bold text-slate-900">{x.title}</div>
              <p className="mt-1 flex-1 text-sm text-slate-600">{x.text}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary-600">
                {x.cta} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>

        <h2 className="mt-12 font-display text-xl font-bold text-slate-900">Bir rol seçin</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((c) => (
            <Link key={c.role} to={`/kopru/${c.role}`} aria-label={`${ROLE_LABEL[c.role]} rolüyle gir: ${c.who}`} className="glass group flex flex-col rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-card">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white">
                <c.icon className="h-5 w-5" />
              </span>
              <div className="mt-4 font-display text-lg font-bold text-slate-900">{ROLE_LABEL[c.role]}</div>
              <div className="text-xs font-medium text-slate-500">{c.who}</div>
              <p className="mt-2 flex-1 text-sm text-slate-600">{c.does}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary-600">
                Bu rolle gir <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>

        <h2 className="mt-12 font-display text-xl font-bold text-slate-900">Önerilen demo akışı</h2>
        <p className="mt-1 text-sm text-slate-500">Üst çubuktaki rol düğmeleriyle istediğiniz an rol değiştirebilirsiniz; yapılan her işlem diğer rollere anında yansır.</p>
        <ol className="mt-4 space-y-2">
          {STEPS.map((s, i) => (
            <li key={i}>
              <Link to={s.to} className="glass flex items-start gap-4 rounded-2xl p-4 transition hover:border-primary-300">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-500 text-sm font-bold text-white">{i + 1}</span>
                <span className="flex-1 text-sm text-slate-700">{s.text}</span>
                <span className="hidden shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 sm:block">{ROLE_LABEL[s.role]}</span>
              </Link>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
