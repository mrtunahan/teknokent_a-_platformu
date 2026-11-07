import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '@/store/AppStore';
import { Aurora, BrandMark } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { BLANK_PROFILE, ProfileWizard } from '@/components/onboarding/ProfileWizard';

export default function Onboarding() {
  const { saveProfile, dispatch } = useStore();
  const navigate = useNavigate();
  const toast = useToast();
  return (
    <div className="relative min-h-[100svh] overflow-hidden">
      <Aurora className="opacity-60" />
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to="/" aria-label="Ana sayfa">
          <BrandMark />
        </Link>
        <button
          onClick={() => {
            dispatch({ type: 'skipOnboarding' });
            navigate('/demo/discover');
          }}
          className="text-sm text-slate-500 transition hover:text-slate-900"
        >
          Demo profiliyle devam et →
        </button>
      </header>
      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-10 max-w-2xl">
          <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Ana sayfa
          </Link>
          <h1 className="font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Firmanızı <span className="text-gradient">ekosisteme</span> tanıtın.
          </h1>
          <p className="mt-3 text-slate-500">Yaklaşık 3 dakika sürer. Bilgileriniz uyum skorunu hesaplamak ve size en doğru firmaları önermek için kullanılır.</p>
        </motion.div>
        <ProfileWizard
          initial={BLANK_PROFILE}
          onComplete={async (p) => {
            await saveProfile(p);
            toast({ title: 'Profiliniz yayında! 🎉', body: 'Doğrulama için teknokent yönetimine iletildi. Şimdi keşfetmeye başlayın.' });
            navigate('/demo/discover');
          }}
        />
      </main>
    </div>
  );
}
