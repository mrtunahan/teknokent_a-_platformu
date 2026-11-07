import { Plus, X } from 'lucide-react';
import { useState } from 'react';

export function TagInput({ id, value, onChange, placeholder, suggestions = [], max = 8 }: { id: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string; suggestions?: string[]; max?: number }) {
  const [draft, setDraft] = useState('');
  const add = (t: string) => {
    const v = t.trim();
    if (!v || value.includes(v) || value.length >= max) return;
    onChange([...value, v]);
    setDraft('');
  };
  const rest = suggestions.filter((s) => !value.includes(s)).slice(0, 6);
  return (
    <div>
      <div className="flex min-h-[52px] flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-2 transition focus-within:border-electric-400/60 focus-within:ring-4 focus-within:ring-electric-500/10">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-lg bg-electric-500/15 py-1 pl-2.5 pr-1 text-sm text-electric-300">
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} className="rounded p-0.5 hover:bg-white/10" aria-label={`${t} kaldır`}>
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add(draft);
            } else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => add(draft)}
          placeholder={value.length >= max ? `En fazla ${max} madde` : placeholder}
          disabled={value.length >= max}
          className="min-w-[160px] flex-1 bg-transparent px-2 py-1.5 text-sm text-white outline-none placeholder:text-slate-500"
        />
      </div>
      {rest.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {rest.map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="inline-flex items-center gap-1 rounded-full border border-dashed border-white/15 px-2.5 py-1 text-xs text-slate-400 transition hover:border-electric-400/50 hover:text-white">
              <Plus className="h-3 w-3" /> {s}
            </button>
          ))}
        </div>
      )}
      <p className="mt-1.5 text-[11px] text-slate-500">Enter ile ekleyin · {value.length}/{max}</p>
    </div>
  );
}
