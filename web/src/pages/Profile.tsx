import { CalendarDays, Globe, Mail, MapPin, Pencil, Rocket, ShieldCheck, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { label } from '@/data/options';
import { useStore } from '@/store/AppStore';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, Chip, CompanyLogo, VerifiedBadge } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { CoverArt } from '@/components/discover/CoverArt';
import { ProfileWizard } from '@/components/onboarding/ProfileWizard';
import { SwipeCardPreview } from '@/components/onboarding/SwipeCardPreview';

function completion(p: ReturnType<typeof useStore>['state']['me']) {
  const checks = [p.name, p.logoUrl, p.description.length > 80, p.expertise.length, p.products.length, p.seeking.length, p.offering.length, p.collaborationTypes.length, p.website, p.contact.email, p.internationalGoals.length, p.rndNeeds.length];
  const done = checks.filter(Boolean).length;
  return { pct: Math.round((done / checks.length) * 100), missing: [!p.logoUrl && 'Logo', !p.internationalGoals.length && 'Uluslararası hedefler', !p.rndNeeds.length && 'Ar-Ge ihtiyaçları'].filter(Boolean) as string[] };
}

export default function Profile() {
  const { state } = useStore();
  const navigate = useNavigate();
  const me = state.me;
  const c = completion(me);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        title="Firma Profilim"
        description="Diğer firmaların sizi nasıl gördüğünü yönetin."
        actions={
          <Button onClick={() => navigate('/app/profile/edit')}>
            <Pencil className="h-4 w-4" /> Profili düzenle
          </Button>
        }
      />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="glass overflow-hidden rounded-3xl">
            <div className="relative h-40 sm:h-48">
              <CoverArt company={me} className="absolute inset-0 h-full w-full" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-ink-900/90" />
            </div>
            <div className="relative -mt-12 px-5 pb-6 sm:px-8">
              <CompanyLogo company={me} size={96} className="ring-4 ring-ink-900" />
              <h2 className="mt-4 flex flex-wrap items-center gap-2 font-display text-2xl font-bold text-white sm:text-3xl">
                {me.name} {me.verified ? <VerifiedBadge withLabel className="text-base" /> : <Chip tone="violet">Doğrulama bekliyor</Chip>}
              </h2>
              <p className="mt-1 text-slate-400">{me.tagline}</p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" /> {me.technopark}, {me.city}
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" /> {me.foundedYear}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" /> {label.size(me.employeeRange)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Rocket className="h-4 w-4" /> {label.stage(me.stage)}
                </span>
                {me.website && (
                  <span className="flex items-center gap-1.5">
                    <Globe className="h-4 w-4" /> {me.website}
                  </span>
                )}
              </div>
              <p className="mt-6 leading-relaxed text-slate-300">{me.description}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              ['Teknolojik uzmanlıklar', me.expertise, 'blue'],
              ['Ürün ve hizmetler', me.products, 'default'],
              ['İş birliği aradığı alanlar', me.seeking, 'violet'],
              ['Sunabileceği imkânlar', me.offering, 'aqua'],
              ['İş birliği türleri', me.collaborationTypes.map(label.collab), 'default'],
              ['Ar-Ge ihtiyaçları', me.rndNeeds, 'default'],
              ['Uluslararası hedefler', me.internationalGoals, 'aqua'],
            ].map(([t, items, tone]) => (
              <div key={t as string} className="glass rounded-3xl p-5">
                <h3 className="label">{t as string}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {(items as string[]).length ? (
                    (items as string[]).map((i) => (
                      <Chip key={i} tone={tone as 'blue'}>
                        {i}
                      </Chip>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">Henüz eklenmedi</span>
                  )}
                </div>
              </div>
            ))}
            <div className="glass rounded-3xl p-5">
              <h3 className="label">Yatırım & ortaklık</h3>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">Yatırım ihtiyacı</dt>
                  <dd className="text-white">{label.investment(me.investmentNeed)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Yatırımcı arayışı</dt>
                  <dd className="text-white">{me.seekingInvestor ? 'Evet' : 'Hayır'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Proje ortaklığı</dt>
                  <dd className="text-white">{me.seekingProjectPartner ? 'Arıyor' : 'Hayır'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">İhracat hedefi</dt>
                  <dd className="text-white">{me.exportFocused ? 'Var' : 'Yok'}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="glass rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Profil gücü</h3>
              <span className="font-display text-2xl font-bold text-white">%{c.pct}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full bg-brand-gradient transition-all duration-700" style={{ width: `${c.pct}%` }} />
            </div>
            {c.missing.length > 0 && (
              <p className="mt-4 text-sm text-slate-400">
                Eksikler: <span className="text-slate-200">{c.missing.join(', ')}</span>. Tam profiller %3 kat daha fazla eşleşme alır.
              </p>
            )}
          </div>
          <div className="glass rounded-3xl p-6">
            <h3 className="flex items-center gap-2 font-semibold text-white">
              <ShieldCheck className="h-4 w-4 text-aqua-300" /> İletişim (yalnızca eşleşmelere)
            </h3>
            <div className="mt-3 text-sm text-slate-300">
              <div>{me.contact.name}</div>
              <div className="text-slate-500">{me.contact.title}</div>
              <div className="mt-1 flex items-center gap-1.5 text-electric-300">
                <Mail className="h-3.5 w-3.5" /> {me.contact.email}
              </div>
            </div>
          </div>
          <div>
            <div className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">Diğer firmalar sizi böyle görüyor</div>
            <SwipeCardPreview company={me} />
          </div>
        </aside>
      </div>
    </div>
  );
}

export function ProfileEdit() {
  const { state, saveProfile } = useStore();
  const navigate = useNavigate();
  const toast = useToast();
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader title="Profili düzenle" description="Değişiklikler kaydedildiğinde uyum skorları yeniden hesaplanır." />
      <div className="mt-8">
        <ProfileWizard
          initial={state.me}
          submitLabel="Değişiklikleri kaydet"
          onComplete={async (p) => {
            await saveProfile(p);
            toast({ title: 'Profil güncellendi' });
            navigate('/app/profile');
          }}
        />
      </div>
    </div>
  );
}
