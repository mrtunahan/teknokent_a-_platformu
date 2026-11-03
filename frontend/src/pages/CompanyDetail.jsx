import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import CompanyCard from '../components/CompanyCard';
import {
  Alert, Field, Modal, Spinner, useAction, useLoad,
} from '../components/ui';
import { CERTIFICATES, REPORT_REASONS, fmtDate } from '../labels';

export default function CompanyDetail() {
  const { id } = useParams();
  const auth = useAuth();
  const navigate = useNavigate();
  const { data, error, loading } = useLoad(() => api.get(`/companies/${id}`), [id]);
  const [reportOpen, setReportOpen] = useState(false);
  const [report, setReport] = useState({ reason: 'spam', details: '' });
  const [msg, setMsg] = useState(null);
  const act = useAction();

  if (loading) return <Spinner />;
  if (error) return <Alert error={error} />;
  const c = data.company;
  const own = String(c.id) === String(auth.company?._id);

  const swipe = (direction) => act.run(async () => {
    const r = await api.post('/swipes', { targetCompanyId: c.id, direction });
    if (r.matched) navigate(`/matches/${r.matchId}`);
    else setMsg(direction === 'right' ? 'İlginiz kaydedildi. Karşı taraf da ilgilenirse eşleşirsiniz.' : 'Bu firmayı bir süre görmeyeceksiniz.');
  });
  const block = () => act.run(async () => {
    if (!window.confirm(`${c.name} engellensin mi? Birbirinizi akışta görmezsiniz ve varsa eşleşmeniz kapanır.`)) return;
    await api.post(`/companies/me/blocks/${c.id}`);
    navigate('/feed');
  });
  const sendReport = () => act.run(async () => {
    await api.post('/reports', { targetCompanyId: c.id, reason: report.reason, details: report.details || undefined });
    setReportOpen(false);
    setMsg('Raporunuz teknokent yönetimine iletildi.');
  });

  return (
    <div className="detail">
      <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>← Geri</button>
      <Alert error={act.error} />
      {msg && <Alert kind="success">{msg}</Alert>}
      <div className="panel"><CompanyCard card={c} /></div>

      {c.description && <div className="panel"><h3>Hakkında</h3><p className="prewrap">{c.description}</p></div>}

      <div className="grid2">
        <div className="panel">
          <h3>Bilgiler</h3>
          <dl className="dl">
            {c.foundedYear && <><dt>Kuruluş</dt><dd>{c.foundedYear}</dd></>}
            {c.website && <><dt>Web</dt><dd><a href={c.website} target="_blank" rel="noreferrer noopener">{c.website}</a></dd></>}
            {c.technologies?.length > 0 && <><dt>Teknolojiler</dt><dd>{c.technologies.map((t) => t.name).join(', ')}</dd></>}
          </dl>
          {c.matched && <p className="muted">Eşleştiğiniz için gizli ihtiyaçlar da görünüyor.</p>}
        </div>
        <div className="panel">
          <h3>Belgeler</h3>
          {c.certificates?.length ? (
            <ul className="list">
              {c.certificates.map((x) => (
                <li key={x.id}>
                  <strong>{CERTIFICATES[x.type]}</strong>{x.title ? ` — ${x.title}` : ''}
                  {x.validUntil && <span className="muted"> · {fmtDate(x.validUntil)} tarihine kadar</span>}
                  {x.document && (
                    <button type="button" className="btn btn-link" onClick={() => act.run(() => api.openFile(`/companies/${c.id}/certificates/${x.id}/document`))}>
                      Belgeyi görüntüle
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : <p className="muted">Belge eklenmemiş.</p>}
        </div>
      </div>

      {c.references?.length > 0 && (
        <div className="panel">
          <h3>Referanslar</h3>
          <ul className="list">
            {c.references.map((r) => <li key={r.title}><strong>{r.title}</strong>{r.client && ` · ${r.client}`}{r.description && <p>{r.description}</p>}</li>)}
          </ul>
        </div>
      )}

      {!own && (
        <div className="row">
          {!c.matched && (
            <>
              <button type="button" className="btn btn-no" disabled={act.busy} onClick={() => swipe('left')}>Şimdilik değil</button>
              <button type="button" className="btn btn-yes" disabled={act.busy} onClick={() => swipe('right')}>İlgileniyorum</button>
            </>
          )}
          <span className="spacer" />
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReportOpen(true)}>Raporla</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={block}>Engelle</button>
        </div>
      )}

      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title={`${c.name} firmasını raporla`}>
        <div className="stack">
          <Field label="Neden">
            <select value={report.reason} onChange={(e) => setReport({ ...report, reason: e.target.value })}>
              {Object.entries(REPORT_REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Açıklama (isteğe bağlı)"><textarea rows={3} maxLength={1000} value={report.details} onChange={(e) => setReport({ ...report, details: e.target.value })} /></Field>
          <button type="button" className="btn btn-primary" disabled={act.busy} onClick={sendReport}>Gönder</button>
        </div>
      </Modal>
    </div>
  );
}
