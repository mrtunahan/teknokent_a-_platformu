import { ArrowRight, Building2, Cpu, FlaskConical, GraduationCap, Landmark } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandMark } from '@/components/ui';
import { ROLE_LABEL, type Role } from '../data';

const CARDS: { role: Role; icon: typeof Building2; who: string; does: string }[] = [
  { role: 'firma', icon: Building2, who: 'Kuzey Döküm San. A.Ş. (Çankırı OSB)', does: 'Üretimdeki sorununu ihtiyaç olarak bildirir, önerilen uzmanları görür, projeyi başlatır.' },
  { role: 'akademisyen', icon: GraduationCap, who: 'Doç. Dr. Elif Arslan (ÇAKÜ)', does: 'Gelen davetleri yanıtlar, uzmanlığına uyan ihtiyaçlara ilgi bildirir, projeyi yürütür.' },
  { role: 'tto', icon: FlaskConical, who: 'Uzm. Gökhan Yalçın (ÇAKÜ TTO)', does: 'İhtiyaç havuzunu yönetir, doğru akademisyeni bulur, sözleşme ve destek başvurusunu takip eder.' },
  { role: 'osb', icon: Landmark, who: 'Nurcan Aksoy (Çankırı OSB)', does: 'Bölge firmalarının ihtiyaçlarını ve çözülme oranını izler.' },
  { role: 'teknokent', icon: Cpu, who: 'Selim Yılmaz (ÇAKÜ Teknokent)', does: 'Teknokent firmalarının sanayiye çözüm katkısını izler.' },
];

const STEPS: { text: string; role: Role; to: string }[] = [
  { text: 'OSB firması “döküm parçalarında gözenek” sorununu gizli ihtiyaç olarak bildirir; sistem anında aday uzman önerir.', role: 'firma', to: '/kopru/firma/ihtiyaclar/yeni' },
  { text: 'TTO uzmanı ihtiyacı havuzda görür, incelemeye alır, not düşer ve en uygun akademisyen + teknokent firmasını davet eder.', role: 'tto', to: '/kopru/tto' },
  { text: 'Akademisyen gizlilik taahhüdünü onaylayınca ayrıntıları görür ve daveti kabul eder.', role: 'akademisyen', to: '/kopru/akademisyen' },
  { text: 'Firma kabul eden adaylar arasından seçip projeyi başlatır; taraflar proje alanında yazışır.', role: 'firma', to: '/kopru/firma/ihtiyaclar' },
  { text: 'TTO projeyi teklif → sözleşme → TÜBİTAK 1505 başvurusu → yürütme aşamalarından geçirir.', role: 'tto', to: '/kopru/tto/projeler' },
  { text: 'OSB ve Teknokent yönetimi panellerinde bölgedeki etkiyi canlı görür.', role: 'osb', to: '/kopru/osb' },
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
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Sanayi–Akademi Köprüsü</h1>
          <p className="mt-3 text-base leading-relaxed text-slate-600">
            OSB’deki üreticinin sorunu, üniversitedeki doğru akademisyen ve teknokentteki doğru firmayla buluşur. TTO süreci yönetir; sözleşme ve destek başvurusuna kadar her adım tek yerden izlenir.
          </p>
        </div>

        {/* Üçgen */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            { icon: Building2, t: 'OSB', d: 'Sorun ve ihtiyaç sahibi üreticiler' },
            { icon: FlaskConical, t: 'Üniversite · TTO', d: 'Akademisyen, laboratuvar, sözleşme yönetimi' },
            { icon: Cpu, t: 'Teknokent', d: 'Çözümü ürüne dönüştüren Ar-Ge firmaları' },
          ].map((x) => (
            <div key={x.t} className="glass flex items-center gap-3 rounded-2xl p-4">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-50 text-primary-600">
                <x.icon className="h-5 w-5" />
              </span>
              <div>
                <div className="font-display font-bold text-slate-900">{x.t}</div>
                <div className="text-sm text-slate-500">{x.d}</div>
              </div>
            </div>
          ))}
        </div>

        <h2 className="mt-12 font-display text-xl font-bold text-slate-900">Bir rol seçin</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((c) => (
            <Link key={c.role} to={`/kopru/${c.role}`} className="glass group flex flex-col rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-card">
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
