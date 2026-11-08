import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { uid } from '@/lib/utils';

type Tone = 'success' | 'info' | 'warning';
interface Toast {
  id: string;
  title: string;
  body?: string;
  tone: Tone;
  /** İsteğe bağlı aksiyon düğmesi (ör. "Mesaj gönder", "Geri al") */
  action?: { label: string; onClick: () => void };
}

const Ctx = createContext<(t: Omit<Toast, 'id' | 'tone'> & { tone?: Tone }) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, 'id' | 'tone'> & { tone?: Tone }) => {
    const id = uid('t');
    setItems((v) => [...v, { id, tone: 'success', ...t }]);
    setTimeout(() => setItems((v) => v.filter((x) => x.id !== id)), t.action ? 6000 : 3600);
  }, []);
  const icons = { success: CheckCircle2, info: Info, warning: TriangleAlert };
  const colors = { success: 'text-emerald-600', info: 'text-primary-600', warning: 'text-amber-600' };
  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[120] flex flex-col items-center gap-2 px-4 lg:bottom-8 lg:items-end lg:pr-8">
        <AnimatePresence>
          {items.map((t) => {
            const Icon = icons[t.tone];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                className="glass-strong pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl px-4 py-3"
              >
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${colors[t.tone]}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-900">{t.title}</div>
                  {t.body && <div className="mt-0.5 text-xs text-slate-500">{t.body}</div>}
                </div>
                {t.action && (
                  <button
                    onClick={() => {
                      t.action!.onClick();
                      setItems((v) => v.filter((x) => x.id !== t.id));
                    }}
                    className="shrink-0 rounded-lg bg-primary-50 px-2.5 py-1.5 text-xs font-bold text-primary-600 hover:bg-primary-100"
                  >
                    {t.action.label}
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
