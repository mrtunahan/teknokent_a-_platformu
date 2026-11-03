import { useMemo, useState } from 'react';

/**
 * Etiket seçici. `multiple` ise dizi, değilse tek id döner.
 * tags: [{id, name, type, parent}]
 */
export default function TagSelect({ tags, value, onChange, multiple = false, placeholder = 'Etiket ara…', max }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const selected = multiple ? value || [] : value ? [value] : [];
  const byId = useMemo(() => new Map(tags.map((t) => [String(t.id), t])), [tags]);
  const norm = (s) => s.toLocaleLowerCase('tr-TR');
  const options = tags.filter((t) => !selected.includes(String(t.id)) && norm(t.name).includes(norm(q))).slice(0, 40);
  const full = multiple && max && selected.length >= max;

  const add = (id) => {
    if (multiple) onChange([...selected, String(id)]);
    else onChange(String(id));
    setQ('');
    setOpen(multiple);
  };
  const remove = (id) => (multiple ? onChange(selected.filter((x) => x !== id)) : onChange(''));

  return (
    <div className="tagselect">
      <div className="tagselect-chips">
        {selected.map((id) => (
          <span key={id} className="chip chip-selected">
            {byId.get(id)?.name || '…'}
            <button type="button" onClick={() => remove(id)} aria-label={`${byId.get(id)?.name} kaldır`}>×</button>
          </span>
        ))}
        {!full && (multiple || !selected.length) && (
          <input
            value={q}
            placeholder={placeholder}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
        )}
      </div>
      {open && options.length > 0 && (
        <ul className="tagselect-menu" role="listbox">
          {options.map((t) => (
            <li key={t.id}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => add(t.id)}>
                {t.parent && byId.get(String(t.parent)) ? <small>{byId.get(String(t.parent)).name} › </small> : null}{t.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
