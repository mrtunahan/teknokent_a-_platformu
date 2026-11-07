import { AnimatePresence, motion, type HTMLMotionProps } from 'framer-motion';
import { BadgeCheck, X } from 'lucide-react';
import { forwardRef, useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, type LinkProps } from 'react-router-dom';
import { cn, initials } from '@/lib/utils';
import type { Company } from '@/types';

/* ---------------------------------- Button --------------------------------- */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const base =
  'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background,box-shadow,color,border-color] duration-200 disabled:pointer-events-none disabled:opacity-40';
const variants: Record<Variant, string> = {
  primary:
    'text-white bg-gradient-to-b from-electric-400 to-electric-600 shadow-glow hover:from-electric-300 hover:to-electric-500 before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-white/20',
  secondary: 'text-white glass hover:bg-white/[0.07] hover:border-white/15',
  ghost: 'text-slate-300 hover:text-white hover:bg-white/[0.05]',
  danger: 'text-white bg-rose-500/90 hover:bg-rose-500',
};
const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm rounded-xl',
  md: 'h-11 px-5 text-sm rounded-xl',
  lg: 'h-14 px-7 text-base rounded-2xl',
};

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', className?: string) =>
  cn(base, variants[variant], sizes[size], className);

type ButtonProps = HTMLMotionProps<'button'> & { variant?: Variant; size?: Size };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className, ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={buttonClass(variant, size, className)}
      {...rest}
    />
  );
});

export function ButtonLink({ variant = 'primary', size = 'md', className, ...rest }: LinkProps & { variant?: Variant; size?: Size }) {
  return <Link className={cn(buttonClass(variant, size, className), 'hover:-translate-y-px active:scale-[0.98] transition-transform')} {...rest} />;
}

/* ---------------------------------- Badges --------------------------------- */

export function Chip({
  children,
  active,
  onClick,
  className,
  tone = 'default',
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  tone?: 'default' | 'blue' | 'violet' | 'aqua';
}) {
  const tones = {
    default: 'border-white/10 bg-white/[0.04] text-slate-300',
    blue: 'border-electric-400/25 bg-electric-500/10 text-electric-300',
    violet: 'border-violet-400/25 bg-violet-500/10 text-violet-400',
    aqua: 'border-aqua-400/25 bg-aqua-400/10 text-aqua-300',
  } as const;
  const Comp = onClick ? 'button' : 'span';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? !!active : undefined}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition',
        active ? 'border-electric-400/60 bg-electric-500/20 text-white shadow-[0_0_0_3px_rgba(47,123,255,0.12)]' : tones[tone],
        onClick && !active && 'hover:border-white/20 hover:text-white',
        className,
      )}
    >
      {children}
    </Comp>
  );
}

export function VerifiedBadge({ className, withLabel }: { className?: string; withLabel?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-electric-300', className)} title="Teknokent yönetimi tarafından doğrulanmış firma">
      <BadgeCheck className="h-[1.1em] w-[1.1em] fill-electric-500/25" aria-hidden />
      {withLabel ? <span className="text-xs font-medium">Doğrulanmış</span> : <span className="sr-only">Doğrulanmış firma</span>}
    </span>
  );
}

/* ------------------------------- Company logo ------------------------------ */

export function CompanyLogo({ company, size = 48, className, ring, onImgError }: { company: Pick<Company, 'name' | 'brand' | 'logoUrl'>; size?: number; className?: string; ring?: boolean; onImgError?: () => void }) {
  const [a, b] = company.brand;
  return (
    <div
      className={cn('relative grid shrink-0 place-items-center overflow-hidden font-display font-bold text-white', ring && 'ring-2 ring-white/15', className)}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: `linear-gradient(135deg, ${a}, ${b})`,
        fontSize: size * 0.36,
        boxShadow: `0 8px 24px -8px ${a}88`,
      }}
      aria-hidden
    >
      {company.logoUrl ? (
        <img src={company.logoUrl} alt="" className="h-full w-full bg-white object-cover" onError={onImgError} />
      ) : (
        <>
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.45),transparent_55%)]" />
          <span className="relative tracking-tight">{initials(company.name)}</span>
        </>
      )}
    </div>
  );
}

/* --------------------------------- Brand mark ------------------------------- */

export function BrandMark({ className, withText = true }: { className?: string; withText?: boolean }) {
  // Her örnek kendi gradyan kimliğini kullanır: gizli (display:none) bir kopyadaki <defs> diğerlerini bozmasın
  const gid = `bm${useId().replace(/:/g, '')}`;
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4d94ff" />
            <stop offset=".55" stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#2dd4bf" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="38" height="38" rx="11" fill="#0b1020" stroke="rgba(255,255,255,.1)" />
        <circle cx="16" cy="20" r="7.5" fill="none" stroke={`url(#${gid})`} strokeWidth="3" />
        <circle cx="24" cy="20" r="7.5" fill="none" stroke={`url(#${gid})`} strokeWidth="3" />
      </svg>
      {withText && (
        <span className="font-display text-lg font-bold tracking-tight text-white">
          Tekno<span className="text-gradient">Match</span>
        </span>
      )}
    </span>
  );
}

/* ---------------------------------- Toggle --------------------------------- */

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3">
      <span>
        <span className="block text-sm font-medium text-white">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-slate-400">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn('relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-electric-500' : 'bg-white/10')}
      >
        <motion.span layout transition={{ type: 'spring', stiffness: 600, damping: 35 }} className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow', checked ? 'right-0.5' : 'left-0.5')} />
      </button>
    </label>
  );
}

/* ------------------------------ Modal & Sheet ------------------------------ */

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
}

export function Modal({ open, onClose, title, children, className }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; className?: string }) {
  useEscape(open, onClose);
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] grid place-items-end p-0 sm:place-items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={cn('glass-strong relative max-h-[90vh] w-full overflow-y-auto rounded-t-3xl p-6 sm:max-w-lg sm:rounded-3xl', className)}
          >
            {title && (
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="font-display text-lg font-semibold text-white">{title}</h2>
                <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white" aria-label="Kapat">
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function Drawer({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  useEscape(open, onClose);
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={onClose} />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 36 }}
            className="glass-strong absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-white/10"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
              <h2 className="font-display text-lg font-semibold text-white">{title}</h2>
              <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white" aria-label="Kapat">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && <div className="safe-bottom border-t border-white/[0.06] px-6 py-4">{footer}</div>}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* ---------------------------------- Misc ----------------------------------- */

export function SectionHeading({ eyebrow, title, description, center = true }: { eyebrow?: string; title: ReactNode; description?: string; center?: boolean }) {
  return (
    <div className={cn('max-w-2xl', center && 'mx-auto text-center')}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">{title}</h2>
      {description && <p className="mt-4 text-base leading-relaxed text-slate-400 sm:text-lg">{description}</p>}
    </div>
  );
}

export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="glass flex flex-col items-center rounded-3xl px-6 py-14 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-electric-500/20 to-violet-500/20 text-electric-300 ring-1 ring-white/10">{icon}</div>
      <h3 className="mt-5 font-display text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-slate-400">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/** Ölçülü, yavaş hareket eden ışık lekeleri — sayfa arka planı */
export function Aurora({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-electric-500/20 blur-[120px] animate-float" />
      <div className="absolute -right-32 top-20 h-[30rem] w-[30rem] rounded-full bg-violet-500/15 blur-[120px] animate-float [animation-delay:-3s]" />
      <div className="absolute bottom-[-12rem] left-1/3 h-[28rem] w-[28rem] rounded-full bg-aqua-400/10 blur-[120px] animate-float [animation-delay:-5s]" />
    </div>
  );
}
