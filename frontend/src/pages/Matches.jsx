import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { useSocketEvent } from '../socket';
import {
  Alert, Chip, Empty, Logo, Spinner, useLoad,
} from '../components/ui';
import { OUTCOMES, fmtDateTime } from '../labels';

export default function Matches() {
  const auth = useAuth();
  const { data, error, loading, reload } = useLoad(() => (auth.approved ? api.get('/matches') : Promise.resolve({ matches: [] })), [auth.approved]);
  useSocketEvent('message:new', reload);
  useSocketEvent('match:new', reload);

  if (loading) return <Spinner />;
  if (error) return <Alert error={error} />;
  const due = data.matches.filter((m) => m.outcomeDue);

  return (
    <div className="stack">
      <h1>Eşleşmeler</h1>
      {due.length > 0 && (
        <Alert kind="info">
          {due.length} eşleşmeniz için iş sonucu bekleniyor. Cevabınız önerilerin kalitesini artırır.
        </Alert>
      )}
      {!data.matches.length ? (
        <Empty title="Henüz eşleşme yok">
          <p>İki taraf da ilgilendiğinde eşleşme oluşur. <Link to="/feed">Keşfet</Link> sayfasından başlayın.</p>
        </Empty>
      ) : (
        <ul className="match-list">
          {data.matches.map((m) => (
            <li key={m.id}>
              <Link to={`/matches/${m.id}`} className={`match-row ${m.status === 'closed' ? 'closed' : ''}`}>
                <Logo company={m.company} size={48} />
                <div className="match-main">
                  <div className="match-name">
                    <strong>{m.company?.name || 'Firma'}</strong>
                    <span className="muted">%{m.matchPercent} uyum</span>
                  </div>
                  <div className="muted small">{m.reasons.slice(0, 2).join(' · ')}</div>
                </div>
                <div className="match-meta">
                  {m.unreadCount > 0 && <span className="pill">{m.unreadCount} yeni</span>}
                  {m.pendingMeetings > 0 && <Chip tone="blue">Toplantı</Chip>}
                  {m.outcome && <Chip tone="green">{OUTCOMES[m.outcome]}</Chip>}
                  {m.outcomeDue && <Chip tone="amber">Sonuç bekleniyor</Chip>}
                  {m.status === 'closed' && <Chip>Kapalı</Chip>}
                  <span className="muted small">{fmtDateTime(m.lastMessageAt || m.createdAt)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
