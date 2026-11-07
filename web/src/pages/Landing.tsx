import { motion, useScroll, useSpring } from 'framer-motion';
import { Hero } from '@/components/landing/Hero';
import { LandingNav } from '@/components/landing/LandingNav';
import { Advantages, CallToAction, FeaturedCompanies, Footer, HowItWorks, SuccessStories } from '@/components/landing/Sections';

export default function Landing() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  return (
    <div className="relative overflow-x-clip">
      <motion.div className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-brand-gradient" style={{ scaleX: progress }} aria-hidden />
      <LandingNav />
      <main>
        <Hero />
        <LogoStrip />
        <HowItWorks />
        <Advantages />
        <FeaturedCompanies />
        <SuccessStories />
        <CallToAction />
      </main>
      <Footer />
    </div>
  );
}

function LogoStrip() {
  const parks = ['ODTÜ Teknokent', 'İTÜ ARI Teknokent', 'Bilkent Cyberpark', 'Teknopark İstanbul', 'Hacettepe Teknokent', 'Yıldız Teknopark', 'İzmir Teknopark', 'ULUTEK', 'Erciyes Teknopark', 'ÇAKÜ Teknokent'];
  return (
    <section aria-label="Platformdaki teknokentler" className="relative border-y border-white/[0.05] py-8">
      <p className="mb-6 text-center text-xs uppercase tracking-[0.2em] text-slate-500">Türkiye’nin önde gelen teknokentlerinden firmalar</p>
      <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_15%,black_85%,transparent)]">
        <div className="flex w-max animate-[marquee_40s_linear_infinite] gap-12 motion-reduce:animate-none">
          {[...parks, ...parks].map((p, i) => (
            <span key={i} className="whitespace-nowrap font-display text-lg font-semibold text-white/25">
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
