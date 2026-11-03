import { useMemo, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import {
  Alert, Chip, Field, Spinner, useAction, useLoad,
} from '../components/ui';
import { OUTCOMES, REPORT_REASONS, VERIFICATION, fmtDate, fmtMoney } from '../labels';
import NetworkGraph from '../components/NetworkGraph';

const TABS = [
  ['stats', 'Genel bakış'], ['companies', 'Firmalar'], ['import', 'Toplu yükleme'], ['gap', 'Talep–arz boşluğu'],
  ['network', 'Ağ haritası'], ['reports', 'Raporlar'],
];

export default function Panel() {
  const auth = useAuth();
  const [tab, setTab] = useState('stats');
  const tps = useLoad(() => (auth.isSuperAdmin ? api.get('/technoparks') : Promise.resolve(null)), [auth.isSuperAdmin]);
  const [tp, setTp] = useState('');
  const q = tp ? `technoparkId=${tp}` : '';

  return (
    <div className="stack">
      <div className="row wrap">
        <h1>Teknokent paneli</h1>
        <span className="spacer" />
        {auth.isSuperAdmin && tps.data && (
          <select value={tp} onChange={(e) => setTp(e.target.value)} aria-label="Teknokent">
            <option value="">Tüm teknokentler</option>
            {tps.data.technoparks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>
      <div className="tabs" role="tablist">
        {TABS.map(([k, v]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{v}</button>)}
        {auth.isSuperAdmin && <button type="button" role="tab" aria-selected={tab === 'admin'} className={tab === 'admin' ? 'on' : ''} onClick={() => setTab('admin')}>Platform</button>}
      </div>
      {tab === 'stats' && <Stats q={q} />}
      {tab === 'companies' && <Companies q={q} />}
      {tab === 'import' && <Import tp={tp} needsTp={auth.isSuperAdmin} />}
      {tab === 'gap' && <Gap q={q} />}
      {tab === 'network' && <Network q={q} />}
      {tab === 'reports' && <Reports q={q} />}
      {tab === 'admin' && <PlatformAdmin onChanged={tps.reload} technoparks={tps.data?.technoparks || []} />}
    </div>
  );
}

function Stat({ label, value, sub }) {
  return <div className="stat"><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong>{sub && <span className="muted small">{sub}</span>}</div>;
}

function Stats({ q }) {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const [range, setRange] = useState({ from: monthAgo, to: today });
  const qs = `from=${range.from}&to=${range.to}T23:59:59${q ? `&${q}` : ''}`;
  const { data, error, loading } = useLoad(() => api.get(`/panel/stats?${qs}`), [qs]);
  const act = useAction();
  const max = useMemo(() => Math.max(1, ...(data?.monthly || []).map((m) => Math.max(m.matches, m.meetings, m.outcomes))), [data]);

  return (
    <div className="stack">
      <div className="row wrap">
        <Field label="Başlangıç"><input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></Field>
        <Field label="Bitiş"><input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></Field>
        <span className="spacer" />
        <button type="button" className="btn" disabled={act.busy} onClick={() => act.run(() => api.download(`/panel/stats/export.csv?${qs}`, `teknomatch-rapor-${range.to}.csv`))}>
          Excel/CSV olarak indir
        </button>
      </div>
      <Alert error={error || act.error} />
      {loading ? <Spinner /> : data && (
        <>
          <div className="stats">
            <Stat label="Toplantı (kuzey yıldızı)" value={data.metrics.meetings} sub="eşleşme sonrası gerçekleşen/kabul edilen" />
            <Stat label="Eşleşme" value={data.metrics.matches} />
            <Stat label="Belgeli iş birliği" value={data.metrics.documentedCollaborations} sub="teklif + sözleşme" />
            <Stat label="Tahmini değer" value={fmtMoney(data.metrics.estimatedValue)} />
            <Stat label="Onaylı firma" value={data.companies.approved} sub={`${data.companies.pending} onay bekliyor · ${data.companies.prefilledUnclaimed} sahiplenilmedi`} />
            <Stat label="Haftalık aktif firma" value={data.metrics.weeklyActiveCompanies} sub={`%${data.metrics.weeklyActiveRate} · hedef %30`} />
            <Stat label="Profil tamamlama" value={`%${data.metrics.profileCompletionRate}`} sub="hedef %70" />
            <Stat label="Sağa kaydırma oranı" value={`%${data.metrics.rightSwipeRate}`} sub={`${data.metrics.swipes.total} kaydırma · sağlıklı aralık %15–30`} />
            <Stat label="Eşleşme → mesaj" value={`%${data.metrics.matchToMessageRate}`} sub="hedef %50" />
            <Stat label="Mesaj → toplantı" value={`%${data.metrics.messageToMeetingRate}`} sub="hedef %25" />
          </div>
          <div className="panel">
            <h3>İş sonuçları</h3>
            <div className="row wrap">{Object.entries(data.metrics.outcomes).map(([k, v]) => <Chip key={k}>{OUTCOMES[k]}: {v}</Chip>)}</div>
          </div>
          {data.monthly.length > 0 && (
            <div className="panel">
              <h3>Aylık</h3>
              <div className="bars" role="img" aria-label="Aylık eşleşme, toplantı ve iş sonucu sayıları">
                {data.monthly.map((m) => (
                  <div key={m.month} className="bar-group">
                    <div className="bar-stack">
                      <span className="bar b1" style={{ height: `${(m.matches / max) * 100}%` }} title={`Eşleşme: ${m.matches}`} />
                      <span className="bar b2" style={{ height: `${(m.meetings / max) * 100}%` }} title={`Toplantı: ${m.meetings}`} />
                      <span className="bar b3" style={{ height: `${(m.outcomes / max) * 100}%` }} title={`İş sonucu: ${m.outcomes}`} />
                    </div>
                    <span className="small muted">{m.month}</span>
                  </div>
                ))}
              </div>
              <div className="legend"><span className="lg b1" />Eşleşme <span className="lg b2" />Toplantı <span className="lg b3" />İş sonucu</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Companies({ q }) {
  const [status, setStatus] = useState('pending');
  const [search, setSearch] = useState('');
  const qs = `${status ? `status=${status}&` : ''}${search ? `q=${encodeURIComponent(search)}&` : ''}limit=200${q ? `&${q}` : ''}`;
  const list = useLoad(() => api.get(`/panel/companies?${qs}`), [qs]);
  const inactive = useLoad(() => api.get(`/panel/companies/inactive${q ? `?${q}` : ''}`), [q]);
  const act = useAction();
  const review = (c, action) => act.run(async () => {
    const note = action === 'reject' ? window.prompt('Ret nedeni (firmaya iletilir):') ?? undefined : undefined;
    await api.post(`/panel/companies/${c.id}/review`, { action, note: note || undefined });
    list.reload();
  });
  return (
    <div className="stack">
      <div className="row wrap">
        <div className="tabs tabs-sm">
          {[['pending', 'Onay bekleyen'], ['approved', 'Onaylı'], ['rejected', 'Reddedilen'], ['', 'Tümü']].map(([k, v]) => (
            <button key={k} type="button" className={status === k ? 'on' : ''} onClick={() => setStatus(k)}>{v}</button>
          ))}
        </div>
        <input placeholder="Firma ara…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Alert error={list.error || act.error} />
      {list.loading ? <Spinner /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Firma</th><th>VKN</th><th>Alan adı</th><th>Durum</th><th>Profil</th><th>Kullanıcı</th><th>Kayıt</th><th /></tr></thead>
            <tbody>
              {list.data.companies.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong>{c.prefilled && <div className="muted small">Önceden yüklendi, sahiplenilmedi</div>}{c.underReview && <Chip tone="red">İncelemede</Chip>}</td>
                  <td>{c.taxNumber}</td>
                  <td>{c.emailDomain}</td>
                  <td><Chip tone={c.verificationStatus === 'approved' ? 'green' : c.verificationStatus === 'pending' ? 'amber' : 'red'}>{VERIFICATION[c.verificationStatus]}</Chip></td>
                  <td>%{c.completion}</td>
                  <td>{c.userCount}</td>
                  <td className="small">{fmtDate(c.createdAt)}</td>
                  <td className="nowrap">
                    {c.verificationStatus !== 'approved' && <button type="button" className="btn btn-sm btn-yes" disabled={act.busy} onClick={() => review(c, 'approve')}>Onayla</button>}
                    {c.verificationStatus !== 'rejected' && <button type="button" className="btn btn-sm btn-ghost" disabled={act.busy} onClick={() => review(c, 'reject')}>Reddet</button>}
                  </td>
                </tr>
              ))}
              {!list.data.companies.length && <tr><td colSpan={8} className="muted center">Kayıt yok.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {inactive.data?.companies.length > 0 && (
        <div className="panel">
          <h3>Son 30 günde pasif firmalar ({inactive.data.companies.length})</h3>
          <p className="muted small">{inactive.data.companies.map((c) => c.name).join(', ')}</p>
        </div>
      )}
    </div>
  );
}

/** Basit CSV ayrıştırıcı (; veya , ayraçlı, tırnak destekli). */
function parseCsv(text) {
  const firstLine = text.split(/\r?\n/)[0] || '';
  const sep = (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ';' : ',';
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; } else if (ch === '"') quoted = false; else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

const COLS = { ad: 'name', unvan: 'name', name: 'name', vkn: 'taxNumber', vergi_no: 'taxNumber', taxnumber: 'taxNumber', alan_adi: 'emailDomain', emaildomain: 'emailDomain', sehir: 'city', city: 'city', web: 'website', website: 'website', aciklama: 'description', description: 'description', calisan: 'employeeRange', employeerange: 'employeeRange', sektorler: 'sectors', sectors: 'sectors', teknolojiler: 'technologies', technologies: 'technologies' };
const normHead = (h) => h.trim().toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/\s+/g, '_');

function Import({ tp, needsTp }) {
  const [rows, setRows] = useState(null);
  const [result, setResult] = useState(null);
  const { run, busy, error, setError } = useAction();
  const onFile = async (file) => {
    setResult(null);
    const text = (await file.text()).replace(/^﻿/, '');
    const [head, ...body] = parseCsv(text);
    const keys = head.map((h) => COLS[normHead(h)]);
    if (!keys.includes('name') || !keys.includes('taxNumber')) {
      setError(new Error('CSV başlığında en az "ad" ve "vkn" sütunları olmalı.'));
      return;
    }
    setRows(body.map((r) => {
      const o = {};
      keys.forEach((k, i) => {
        if (!k || !r[i]?.trim()) return;
        o[k] = ['sectors', 'technologies'].includes(k) ? r[i].split('|').map((s) => s.trim()).filter(Boolean) : r[i].trim();
      });
      return o;
    }));
  };
  const submit = () => run(async () => {
    setResult(await api.post('/panel/companies/import', { companies: rows, ...(tp ? { technoparkId: tp } : {}) }));
    setRows(null);
  });
  return (
    <div className="panel stack">
      <h3>Firma listesini yükleyin</h3>
      <p className="muted">Teknokentteki firmaları önceden yükleyin; firmalar kurumsal e-postayla kayıt olduklarında profillerini sahiplenir (soğuk başlangıç çözümü).
        Yüklenen firmalar onaylı sayılır.</p>
      <p className="small">CSV sütunları: <code>ad; vkn; alan_adi; sehir; web; aciklama; calisan; sektorler; teknolojiler</code> — sektör/teknoloji birden fazlaysa <code>|</code> ile ayırın. Çalışan: 1-5, 6-20, 21-50, 50+.</p>
      {needsTp && !tp && <Alert kind="info">Yüklemeden önce yukarıdan bir teknokent seçin.</Alert>}
      <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files[0] && onFile(e.target.files[0])} />
      <Alert error={error} />
      {rows && (
        <>
          <p><strong>{rows.length}</strong> satır okundu. İlk satırlar:</p>
          <div className="table-wrap">
            <table className="table"><thead><tr><th>Ad</th><th>VKN</th><th>Alan adı</th><th>Sektörler</th></tr></thead>
              <tbody>{rows.slice(0, 8).map((r, i) => <tr key={i}><td>{r.name}</td><td>{r.taxNumber}</td><td>{r.emailDomain}</td><td>{(r.sectors || []).join(', ')}</td></tr>)}</tbody>
            </table>
          </div>
          <div><button type="button" className="btn btn-primary" disabled={busy || (needsTp && !tp)} onClick={submit}>İçe aktar</button></div>
        </>
      )}
      {result && (
        <Alert kind="success">
          {result.created} firma eklendi, {result.skipped} firma zaten kayıtlıydı.
          {result.errors.length > 0 && <div className="alert-details">Hatalı satırlar: {result.errors.map((e) => `#${e.row + 2} (${e.taxNumber}): ${e.error}`).join(' · ')}</div>}
        </Alert>
      )}
    </div>
  );
}

function Gap({ q }) {
  const { data, error, loading } = useLoad(() => api.get(`/panel/supply-demand${q ? `?${q}` : ''}`), [q]);
  if (loading) return <Spinner />;
  if (error) return <Alert error={error} />;
  const max = Math.max(1, ...data.items.map((x) => Math.max(x.demand, x.supply)));
  return (
    <div className="panel stack">
      <h3>En çok aranan, en az sunulan yetkinlikler</h3>
      <p className="muted small">Yeni firma kabulü ve kuluçka programı için doğrudan veri: pozitif boşluk = teknokentte karşılanmayan talep.</p>
      <table className="table">
        <thead><tr><th>Etiket</th><th>Talep</th><th>Arz</th><th>Boşluk</th><th className="w40" /></tr></thead>
        <tbody>
          {data.items.map((x) => (
            <tr key={x.tag._id}>
              <td>{x.tag.name || '—'}</td><td>{x.demand}</td><td>{x.supply}</td>
              <td><strong className={x.gap > 0 ? 'text-red' : 'text-green'}>{x.gap > 0 ? `+${x.gap}` : x.gap}</strong></td>
              <td>
                <div className="gapbar"><span className="d" style={{ width: `${(x.demand / max) * 100}%` }} /><span className="s" style={{ width: `${(x.supply / max) * 100}%` }} /></div>
              </td>
            </tr>
          ))}
          {!data.items.length && <tr><td colSpan={5} className="muted center">Henüz veri yok.</td></tr>}
        </tbody>
      </table>
      <div className="legend"><span className="lg d" />Talep <span className="lg s" />Arz</div>
    </div>
  );
}

function Network({ q }) {
  const { data, error, loading } = useLoad(() => api.get(`/panel/network${q ? `?${q}` : ''}`), [q]);
  if (loading) return <Spinner />;
  if (error) return <Alert error={error} />;
  return (
    <div className="panel stack">
      <h3>Ağ haritası</h3>
      <p className="muted small">{data.nodes.length} firma · {data.edges.length} eşleşme · {data.isolated} firma henüz kimseyle eşleşmedi (gri).</p>
      <NetworkGraph nodes={data.nodes} edges={data.edges} />
    </div>
  );
}

function Reports({ q }) {
  const { data, error, loading, reload } = useLoad(() => api.get(`/panel/reports${q ? `?${q}` : ''}`), [q]);
  const act = useAction();
  const moderate = (id, action) => act.run(async () => {
    if (action === 'deactivate' && !window.confirm('Firma pasifleştirilsin mi? Eşleşmeleri kapanır.')) return;
    await api.post(`/panel/companies/${id}/moderate`, { action });
    reload();
  });
  if (loading) return <Spinner />;
  if (error) return <Alert error={error} />;
  const byTarget = new Map();
  for (const r of data.reports) {
    const k = String(r.targetCompany?._id);
    byTarget.set(k, [...(byTarget.get(k) || []), r]);
  }
  return (
    <div className="stack">
      <Alert error={act.error} />
      {!byTarget.size && <p className="muted">Açık rapor yok.</p>}
      {[...byTarget.entries()].map(([id, rs]) => (
        <div key={id} className="panel">
          <div className="panel-head">
            <h3>{rs[0].targetCompany?.name} {rs[0].targetCompany?.underReview && <Chip tone="red">İncelemede</Chip>}</h3>
            <div className="row">
              <button type="button" className="btn btn-sm" onClick={() => moderate(id, 'restore')}>Raporları reddet, yayına al</button>
              <button type="button" className="btn btn-sm btn-no" onClick={() => moderate(id, 'deactivate')}>Pasifleştir</button>
            </div>
          </div>
          <ul className="list">
            {rs.map((r) => <li key={r._id}><Chip>{REPORT_REASONS[r.reason]}</Chip> {r.reporterCompany?.name} · {fmtDate(r.createdAt)}{r.details && <p>{r.details}</p>}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}

function PlatformAdmin({ technoparks, onChanged }) {
  const [tp, setTp] = useState({ name: '', city: '' });
  const [adm, setAdm] = useState({ technoparkId: '', email: '', fullName: '' });
  const [msg, setMsg] = useState(null);
  const { run, busy, error } = useAction();
  return (
    <div className="grid2">
      <form className="panel stack" onSubmit={(e) => { e.preventDefault(); run(async () => { await api.post('/technoparks', tp); setTp({ name: '', city: '' }); setMsg('Teknokent eklendi.'); onChanged(); }); }}>
        <h3>Teknokent ekle</h3>
        <Field label="Ad"><input required value={tp.name} onChange={(e) => setTp({ ...tp, name: e.target.value })} /></Field>
        <Field label="Şehir"><input required value={tp.city} onChange={(e) => setTp({ ...tp, city: e.target.value })} /></Field>
        <button className="btn btn-primary" disabled={busy}>Ekle</button>
      </form>
      <form className="panel stack" onSubmit={(e) => { e.preventDefault(); run(async () => { await api.post(`/technoparks/${adm.technoparkId}/admins`, { email: adm.email, fullName: adm.fullName }); setMsg(`${adm.email} için şifre belirleme bağlantısı gönderildi.`); setAdm({ technoparkId: '', email: '', fullName: '' }); }); }}>
        <h3>Teknokent yöneticisi ekle</h3>
        <Field label="Teknokent">
          <select required value={adm.technoparkId} onChange={(e) => setAdm({ ...adm, technoparkId: e.target.value })}>
            <option value="">Seçin…</option>{technoparks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="Ad soyad"><input required value={adm.fullName} onChange={(e) => setAdm({ ...adm, fullName: e.target.value })} /></Field>
        <Field label="E-posta"><input type="email" required value={adm.email} onChange={(e) => setAdm({ ...adm, email: e.target.value })} /></Field>
        <button className="btn btn-primary" disabled={busy}>Davet et</button>
      </form>
      <div className="span2"><Alert error={error} />{msg && <Alert kind="success">{msg}</Alert>}</div>
    </div>
  );
}
