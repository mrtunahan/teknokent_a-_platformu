import { useEffect, useState } from 'react';
import { fileUrl } from '../api';

export function Spinner({ label = 'Yükleniyor…' }) {
  return <div className="spinner" role="status"><span className="spinner-dot" />{label}</div>;
}

export function Alert({ error, kind = 'error', children }) {
  if (!error && !children) return null;
  const msg = error ? (error.message || String(error)) : null;
  return (
    <div className={`alert alert-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {msg}{error?.details ? <div className="alert-details">{error.details}</div> : null}
      {children}
    </div>
  );
}

export function Empty({ title, children }) {
  return <div className="empty"><h3>{title}</h3>{children}</div>;
}

export function Field({ label, hint, children, error }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

export function Chip({ children, tone }) {
  return <span className={`chip ${tone ? `chip-${tone}` : ''}`}>{children}</span>;
}

export function Logo({ company, size = 56 }) {
  const [broken, setBroken] = useState(false);
  const src = fileUrl(company?.logoUrl);
  const initials = (company?.name || '?').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toLocaleUpperCase('tr-TR');
  if (src && !broken) {
    return <img className="logo" src={src} alt={`${company.name} logosu`} width={size} height={size} onError={() => setBroken(true)} />;
  }
  return <div className="logo logo-fallback" style={{ width: size, height: size, fontSize: size / 2.6 }} aria-hidden>{initials}</div>;
}

export function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Kapat">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Asenkron işlemleri yöneten küçük yardımcı: { run, busy, error, setError } */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const run = async (fn) => {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(err);
      return undefined;
    } finally {
      setBusy(false);
    }
  };
  return { run, busy, error, setError };
}

/** GET isteğini yükleyen hook: { data, error, loading, reload, setData } */
export function useLoad(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn().then(
      (data) => alive && setState({ data, error: null, loading: false }),
      (error) => alive && setState({ data: null, error, loading: false }),
    );
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return {
    ...state,
    reload: () => setTick((t) => t + 1),
    setData: (d) => setState((s) => ({ ...s, data: typeof d === 'function' ? d(s.data) : d })),
  };
}
