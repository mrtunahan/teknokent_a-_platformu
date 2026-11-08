import { MapPin } from 'lucide-react';
import { label } from '@/data/options';
import { Chip, CompanyLogo, VerifiedBadge } from '@/components/ui';
import { TiltCard } from '@/components/ui/TiltCard';
import { CoverArt } from '@/components/discover/CoverArt';
import type { Company } from '@/types';

/** Kaydırma kartının statik, eğilebilir önizlemesi (onboarding ve profil sayfası). */
export function SwipeCardPreview({ company }: { company: Company }) {
  const name = company.name || 'Firma Adınız';
  return (
    <TiltCard className="rounded-[2rem]" max={8}>
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-card">
        <div className="relative h-36">
          <CoverArt company={company} className="absolute inset-0 h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />
          {company.sector && (
            <div className="absolute left-4 top-4">
              <Chip className="!border-white/15 !bg-black/30 !text-white backdrop-blur-md">{company.sector}</Chip>
            </div>
          )}
          <div className="absolute -bottom-6 left-5">
            <CompanyLogo company={{ ...company, name }} size={64} className="ring-4 ring-white" />
          </div>
        </div>
        <div className="px-5 pb-6 pt-9">
          <div className="flex items-center gap-1.5 font-display text-xl font-bold text-slate-900">
            {name} {company.verified && <VerifiedBadge />}
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="h-3 w-3" /> {company.technopark || 'Teknokent'} {company.city && `· ${company.city}`}
          </div>
          <p className="mt-3 line-clamp-3 min-h-[3.75rem] text-sm leading-relaxed text-slate-600">{company.description || 'Firma açıklamanız burada görünecek.'}</p>
          <div className="mt-3 flex min-h-[28px] flex-wrap gap-1.5">
            {company.expertise.map((e) => (
              <Chip key={e} tone="blue" className="!text-[11px]">
                {e}
              </Chip>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-xl bg-slate-50 p-2.5">
              <div className="font-medium uppercase tracking-wider text-blue-600">Arıyor</div>
              <div className="mt-1 line-clamp-2 text-slate-600">{company.seeking.join(', ') || '—'}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-2.5">
              <div className="font-medium uppercase tracking-wider text-emerald-600">Sunuyor</div>
              <div className="mt-1 line-clamp-2 text-slate-600">{company.offering.join(', ') || '—'}</div>
            </div>
          </div>
          <div className="mt-4 flex justify-between text-xs text-slate-500">
            <span>{label.size(company.employeeRange)}</span>
            <span>{label.stage(company.stage)}</span>
          </div>
        </div>
      </div>
    </TiltCard>
  );
}
