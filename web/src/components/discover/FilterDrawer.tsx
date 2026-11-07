import { RotateCcw } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { COLLABORATION_TYPES, CITIES, EMPLOYEE_RANGES, EXPERTISE, SECTORS, TECHNOPARKS } from '@/data/options';
import { activeFilterCount, EMPTY_FILTERS, useStore } from '@/store/AppStore';
import { Button, Chip, Drawer, Toggle } from '@/components/ui';
import type { Filters } from '@/types';

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-white/[0.06] py-5 first:pt-0 last:border-0">
      <h3 className="label">{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export function FilterDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const [draft, setDraft] = useState<Filters>(state.filters);
  useEffect(() => {
    if (open) setDraft(state.filters);
  }, [open, state.filters]);

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const count = activeFilterCount(draft);
  const visibleParks = draft.cities.length ? TECHNOPARKS.filter((t) => draft.cities.includes(t.city)) : TECHNOPARKS;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Akıllı Filtreler"
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setDraft(EMPTY_FILTERS)} disabled={!count}>
            <RotateCcw className="h-4 w-4" /> Temizle
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              dispatch({ type: 'setFilters', filters: draft });
              onClose();
            }}
          >
            Uygula {count > 0 && <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{count}</span>}
          </Button>
        </div>
      }
    >
      <Group title="Sektör">
        {SECTORS.map((s) => (
          <Chip key={s} active={draft.sectors.includes(s)} onClick={() => set('sectors', toggle(draft.sectors, s))}>
            {s}
          </Chip>
        ))}
      </Group>
      <Group title="Teknolojik uzmanlık">
        {EXPERTISE.map((s) => (
          <Chip key={s} active={draft.expertise.includes(s)} onClick={() => set('expertise', toggle(draft.expertise, s))}>
            {s}
          </Chip>
        ))}
      </Group>
      <Group title="Şehir">
        {CITIES.map((s) => (
          <Chip key={s} active={draft.cities.includes(s)} onClick={() => set('cities', toggle(draft.cities, s))}>
            {s}
          </Chip>
        ))}
      </Group>
      <Group title="Teknokent">
        {visibleParks.map((t) => (
          <Chip key={t.name} active={draft.technoparks.includes(t.name)} onClick={() => set('technoparks', toggle(draft.technoparks, t.name))}>
            {t.name}
          </Chip>
        ))}
      </Group>
      <Group title="Firma büyüklüğü">
        {EMPLOYEE_RANGES.map((s) => (
          <Chip key={s.value} active={draft.sizes.includes(s.value)} onClick={() => set('sizes', toggle(draft.sizes, s.value))}>
            {s.label}
          </Chip>
        ))}
      </Group>
      <Group title="İş birliği türü">
        {COLLABORATION_TYPES.map((s) => (
          <Chip key={s.value} active={draft.collaborationTypes.includes(s.value)} onClick={() => set('collaborationTypes', toggle(draft.collaborationTypes, s.value))}>
            {s.label}
          </Chip>
        ))}
      </Group>
      <Group title="Yatırım ihtiyacı">
        {(
          [
            ['any', 'Fark etmez'],
            ['needs', 'Yatırım arıyor'],
            ['none', 'Yatırım ihtiyacı yok'],
          ] as const
        ).map(([v, l]) => (
          <Chip key={v} active={draft.investmentNeed === v} onClick={() => set('investmentNeed', v)}>
            {l}
          </Chip>
        ))}
      </Group>
      <div className="py-2">
        <Toggle checked={draft.projectPartnership} onChange={(v) => set('projectPartnership', v)} label="Proje ortaklığı arayanlar" description="TÜBİTAK, KOSGEB, Horizon Europe ortaklıkları" />
        <Toggle checked={draft.rndCapable} onChange={(v) => set('rndCapable', v)} label="Ar-Ge merkezi olanlar" description="Tescilli Ar-Ge / tasarım merkezi" />
        <Toggle checked={draft.exportFocused} onChange={(v) => set('exportFocused', v)} label="İhracat & uluslararasılaşma hedefi" />
      </div>
    </Drawer>
  );
}
