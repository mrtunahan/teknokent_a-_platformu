import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Compass,
  Handshake,
  HeartHandshake,
  Lock,
  MapPin,
  MessagesSquare,
  Quote,
  Radar,
  ShieldCheck,
  Sparkles,
  UserRoundPlus,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { DEMO_COMPANIES } from '@/data/companies';
import { label, SLOGAN_EN, SLOGAN_TR } from '@/data/options';
import { BrandMark, ButtonLink, Chip, CompanyLogo, Reveal, SectionHeading, VerifiedBadge } from '@/components/ui';
import { TiltCard } from '@/components/ui/TiltCard';

/* ------------------------------- Nasıl Çalışır ------------------------------ */

const steps = [
  { icon: UserRoundPlus, title: 'Profilini oluştur', text: 'Birkaç adımda firmanızı, uzmanlıklarınızı ve aradığınız iş birliğini tanımlayın.' },
  { icon: Compass, title: 'Firmaları keşfet', text: 'Yapay zekâ destekli uyum skoruyla size en uygun teknokent firmalarını kaydırarak inceleyin.' },
  { icon: HeartHandshake, title: 'Eşleşmeni gerçekleştir', text: 'İki taraf da ilgilendiğinde eşleşme gerçekleşir; istenmeyen satış mesajı yok.' },
  { icon: Handshake, title: 'İş birliğine başla', text: 'Güvenli mesajlaşma, dosya paylaşımı ve toplantı planlama ile projeyi başlatın.' },
];

export function HowItWorks() {
  return (
    <section id="nasil-calisir" className="relative scroll-mt-20 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Nasıl Çalışır?" title={<>Dört adımda <span className="text-gradient">doğru ortak</span></>} description="Karmaşık B2B ağ kurma süreçlerini, saniyeler içinde anlaşılan bir deneyime dönüştürdük." />
        <div className="relative mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div aria-hidden className="absolute left-0 right-0 top-[52px] hidden h-px bg-gradient-to-r from-transparent via-electric-400/40 to-transparent lg:block" />
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.08}>
              <div className="glass group relative h-full rounded-3xl p-6 transition hover:-translate-y-1 hover:border-white/15">
                <div className="flex items-center justify-between">
                  <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-ink-800 ring-1 ring-white/10">
                    <div className="absolute inset-0 rounded-2xl bg-brand-gradient opacity-0 blur-lg transition group-hover:opacity-40" />
                    <s.icon className="relative h-5 w-5 text-electric-300" />
                  </div>
                  <span className="font-display text-4xl font-bold text-white/[0.06]">0{i + 1}</span>
                </div>
                <h3 className="mt-6 font-display text-lg font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- Avantajlar -------------------------------- */

export function Advantages() {
  return (
    <section id="avantajlar" className="relative scroll-mt-20 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Platformun Avantajları" title="İş birliği için tasarlandı." description="LinkedIn’in profesyonelliği, modern eşleşme deneyiminin hızı ve kurumsal güvenlik — tek platformda." />
        <div className="mt-16 grid auto-rows-[minmax(200px,auto)] gap-5 md:grid-cols-6">
          <Reveal className="md:col-span-4">
            <div className="glass relative h-full overflow-hidden rounded-3xl p-7 sm:p-9">
              <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-electric-500/20 blur-3xl" />
              <Radar className="h-6 w-6 text-electric-300" />
              <h3 className="mt-5 max-w-md font-display text-2xl font-semibold text-white">Açıklanabilir uyum skoru</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">“Ne sunuyorum / ne arıyorum” beyanlarınız, teknolojik yetkinlikler ve iş birliği türleri karşılaştırılır. Her kartta neden önerildiğini görürsünüz.</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  ['Aradığınız yetkinlik', 92, 'from-electric-400 to-electric-600'],
                  ['Ortak iş birliği hedefi', 81, 'from-violet-400 to-violet-500'],
                  ['Coğrafi yakınlık', 68, 'from-aqua-300 to-aqua-400'],
                ].map(([l, v, g], i) => (
                  <div key={l as string} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>{l}</span>
                      <span className="text-white">%{v}</span>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
                      <motion.div className={`h-full rounded-full bg-gradient-to-r ${g}`} initial={{ width: 0 }} whileInView={{ width: `${v}%` }} viewport={{ once: true }} transition={{ duration: 1.2, delay: 0.2 + i * 0.15, ease: [0.16, 1, 0.3, 1] }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal className="md:col-span-2" delay={0.08}>
            <div className="glass h-full rounded-3xl p-7">
              <ShieldCheck className="h-6 w-6 text-aqua-300" />
              <h3 className="mt-5 font-display text-xl font-semibold text-white">Doğrulanmış firmalar</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">Her firma vergi numarası, kurumsal e-posta ve teknokent yönetimi onayıyla doğrulanır.</p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-electric-400/30 bg-electric-500/10 px-3 py-1.5 text-xs text-electric-300">
                <BadgeCheck className="h-4 w-4" /> Teknokent onaylı
              </div>
            </div>
          </Reveal>
          {[
            { icon: Zap, title: 'Saniyeler içinde keşif', text: 'Kaydır, beğen, geç. Haftalar süren ağ kurma süreci dakikalara iner.', c: 'text-amber-300' },
            { icon: Lock, title: 'KVKK uyumlu & güvenli', text: 'İletişim bilgileri yalnızca karşılıklı eşleşmeden sonra paylaşılır.', c: 'text-violet-400' },
            { icon: MessagesSquare, title: 'Entegre iletişim', text: 'Mesajlaşma, dosya paylaşımı ve toplantı planlama tek yerde.', c: 'text-electric-300' },
          ].map((f, i) => (
            <Reveal key={f.title} className="md:col-span-2" delay={0.1 + i * 0.06}>
              <div className="glass h-full rounded-3xl p-7">
                <f.icon className={`h-6 w-6 ${f.c}`} />
                <h3 className="mt-5 font-display text-xl font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------- Öne çıkan firmalar ---------------------------- */

export function FeaturedCompanies() {
  const featured = DEMO_COMPANIES.filter((c) => c.verified).slice(0, 6);
  return (
    <section id="firmalar" className="relative scroll-mt-20 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading center={false} eyebrow="Öne Çıkan Firmalar" title="Ekosistemin parlayan yıldızları" description="Türkiye’nin dört bir yanındaki teknokentlerden, iş birliğine açık yenilikçi firmalar." />
          <ButtonLink to="/kayit" variant="secondary">
            Tümünü keşfet <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((c, i) => (
            <Reveal key={c.id} delay={(i % 3) * 0.08}>
              <TiltCard className="h-full rounded-3xl">
                <div className="glass relative h-full overflow-hidden rounded-3xl p-6">
                  <div className="absolute inset-x-0 top-0 h-24 opacity-40" style={{ background: `linear-gradient(135deg, ${c.brand[0]}55, ${c.brand[1]}22, transparent)` }} />
                  <div className="relative flex items-start justify-between" style={{ transform: 'translateZ(30px)' }}>
                    <CompanyLogo company={c} size={52} />
                    <Chip tone="blue">{c.sector}</Chip>
                  </div>
                  <h3 className="relative mt-5 flex items-center gap-1.5 font-display text-lg font-semibold text-white">
                    {c.name} {c.verified && <VerifiedBadge />}
                  </h3>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="h-3 w-3" /> {c.technopark} · {c.city}
                  </p>
                  <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-400">{c.tagline}</p>
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {c.expertise.map((e) => (
                      <Chip key={e} className="!text-[11px]">
                        {e}
                      </Chip>
                    ))}
                  </div>
                  <div className="hairline mt-5" />
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>{label.size(c.employeeRange)}</span>
                    <span>{label.stage(c.stage)}</span>
                  </div>
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------- Başarı hikâyeleri ---------------------------- */

const stories = [
  { a: 'c010', b: 'c001', quote: 'İlk görüşmeden 6 hafta sonra ortak ürünümüzü 3 fabrikada pilotladık. Doğru firmayı bulmak hiç bu kadar hızlı olmamıştı.', person: 'Hakan Yurt', role: 'Genel Müdür, Mekatron Endüstri', metric: '6 haftada pilot' },
  { a: 'c004', b: 'c015', quote: 'TÜBİTAK 1501 projemiz için aradığımız biyoinformatik ortağını TeknoMatch’te bulduk. Proje kabul edildi.', person: 'Dr. Zeynep Kaya', role: 'Kurucu, Medisense', metric: '₺4,2M Ar-Ge desteği' },
  { a: 'c007', b: 'c013', quote: 'Konya’dan Ankara’ya uzanan bir tedarik iş birliği kurduk; sensör maliyetlerimiz %30 düştü.', person: 'Ahmet Çelik', role: 'CEO, Toprak AI', metric: '%30 maliyet avantajı' },
];

export function SuccessStories() {
  return (
    <section id="hikayeler" className="relative scroll-mt-20 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Başarı Hikâyeleri" title={<>Eşleşmeler, <span className="text-gradient">gerçek projelere</span> dönüşüyor.</>} />
        <div className="mt-16 grid gap-5 lg:grid-cols-3">
          {stories.map((s, i) => {
            const a = DEMO_COMPANIES.find((c) => c.id === s.a)!;
            const b = DEMO_COMPANIES.find((c) => c.id === s.b)!;
            return (
              <Reveal key={s.person} delay={i * 0.08}>
                <figure className="glass flex h-full flex-col rounded-3xl p-7">
                  <div className="flex items-center">
                    <CompanyLogo company={a} size={40} ring />
                    <div className="-ml-2 grid h-7 w-7 place-items-center rounded-full bg-ink-800 ring-1 ring-white/10">
                      <Sparkles className="h-3.5 w-3.5 text-electric-300" />
                    </div>
                    <CompanyLogo company={b} size={40} ring className="-ml-2" />
                    <span className="ml-auto rounded-full bg-aqua-400/10 px-3 py-1 text-xs font-medium text-aqua-300">{s.metric}</span>
                  </div>
                  <Quote className="mt-6 h-6 w-6 text-white/15" />
                  <blockquote className="mt-2 flex-1 text-[15px] leading-relaxed text-slate-300">{s.quote}</blockquote>
                  <figcaption className="mt-6 border-t border-white/[0.06] pt-5">
                    <div className="text-sm font-semibold text-white">{s.person}</div>
                    <div className="text-xs text-slate-500">{s.role}</div>
                  </figcaption>
                </figure>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------- CTA ----------------------------------- */

export function CallToAction() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="noise relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-ink-850 px-6 py-16 text-center sm:px-16 sm:py-24">
            <div className="absolute inset-0 animate-gradient-shift bg-[length:200%_200%] opacity-30" style={{ backgroundImage: 'linear-gradient(120deg, #1f63e6, #8b5cf6, #14b8a6, #1f63e6)' }} />
            <div className="absolute inset-0 bg-grid opacity-40 mask-radial" />
            <div className="relative">
              <Building2 className="mx-auto h-10 w-10 text-white/80" />
              <h2 className="mx-auto mt-6 max-w-3xl font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">{SLOGAN_TR}</h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-white/70 sm:text-lg">Firmanızın profilini 3 dakikada oluşturun, bugün ilk eşleşmenizi yakalayın.</p>
              <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
                <ButtonLink to="/kayit" size="lg" className="!bg-white !from-white !to-white !text-ink-900 !shadow-[0_10px_40px_-10px_rgba(255,255,255,0.5)]">
                  Ücretsiz Kayıt Ol <ArrowRight className="h-4 w-4" />
                </ButtonLink>
                <ButtonLink to="/demo/discover" variant="secondary" size="lg">
                  Demo ile keşfet
                </ButtonLink>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------- Footer ---------------------------------- */

export function Footer() {
  const cols = [
    { title: 'Platform', links: [['Nasıl Çalışır', '/#nasil-calisir'], ['Demoyu Dene', '/demo/discover'], ['Giriş Yap', '/giris'], ['Başarı Hikâyeleri', '/#hikayeler'], ['Kayıt Ol', '/kayit']] },
    { title: 'Teknokentler', links: [['Teknokent Paneli', '/#avantajlar'], ['Firma Doğrulama', '/#avantajlar'], ['Etkinlikler', '/#'], ['İş Ortaklığı', '/#']] },
    { title: 'Güven', links: [['KVKK Aydınlatma Metni', '/kvkk'], ['Gizlilik Politikası', '/kvkk#gizlilik'], ['Kullanım Koşulları', '/kvkk#kosullar'], ['Çerez Tercihleri', '/kvkk#cerez']] },
  ];
  return (
    <footer className="relative border-t border-white/[0.06] pt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <BrandMark />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-slate-400">{SLOGAN_TR}</p>
            <p className="mt-2 text-sm text-slate-500">{SLOGAN_EN}</p>
            <form className="mt-6 flex max-w-sm gap-2" onSubmit={(e) => e.preventDefault()}>
              <input className="input !py-2.5" type="email" placeholder="Kurumsal e-posta" aria-label="Bülten için e-posta" />
              <button className="rounded-xl bg-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/15">Abone ol</button>
            </form>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="text-sm font-semibold text-white">{c.title}</h4>
              <ul className="mt-4 space-y-3">
                {c.links.map(([l, h]) => (
                  <li key={l}>
                    <Link to={h!} className="text-sm text-slate-400 transition hover:text-white">
                      {l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] py-8 text-xs text-slate-500 sm:flex-row">
          <span>© {new Date().getFullYear()} TeknoMatch. Tüm hakları saklıdır.</span>
          <span className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5" /> Verileriniz Türkiye’deki sunucularda, KVKK kapsamında işlenir.
          </span>
        </div>
      </div>
      <div aria-hidden className="pointer-events-none select-none overflow-hidden">
        <div className="mx-auto -mb-[3vw] max-w-7xl px-4 text-center font-display text-[17vw] font-extrabold leading-none tracking-tighter text-white/[0.025] lg:text-[13rem]">TeknoMatch</div>
      </div>
    </footer>
  );
}
