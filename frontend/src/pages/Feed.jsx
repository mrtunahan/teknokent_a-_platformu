import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import CompanyCard from '../components/CompanyCard';
import {
  Alert, Empty, Modal, Spinner, useLoad,
} from '../components/ui';

const THRESHOLD = 110;

export default function Feed() {
  const auth = useAuth();
  const navigate = useNavigate();
  const feed = useLoad(() => (auth.approved ? api.get('/feed') : Promise.resolve(null)), [auth.approved]);
  const [cards, setCards] = useState([]);
  const [error, setError] = useState(null);
  const [match, setMatch] = useState(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false, leaving: null });
  const start = useRef(null);

  useEffect(() => { if (feed.data) setCards(feed.data.cards); }, [feed.data]);
  const top = cards[0];

  const swipe = useCallback(async (direction) => {
    if (!top || busy) return;
    setBusy(true);
    setError(null);
    setDrag((d) => ({ ...d, leaving: direction }));
    try {
      const r = await api.post('/swipes', { targetCompanyId: top.id, direction });
      if (r.matched) setMatch({ card: top, matchId: r.matchId });
      setTimeout(() => {
        setCards((c) => c.slice(1));
        setDrag({ x: 0, y: 0, active: false, leaving: null });
        setBusy(false);
      }, 220);
    } catch (err) {
      setError(err);
      setDrag({ x: 0, y: 0, active: false, leaving: null });
      setBusy(false);
      if (err.status === 409) setCards((c) => c.slice(1));
    }
  }, [top, busy]);

  useEffect(() => {
    const onKey = (e) => {
      if (match || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'ArrowLeft') swipe('left');
      if (e.key === 'ArrowRight') swipe('right');
      if (e.key === 'ArrowUp' && top) navigate(`/companies/${top.id}`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [swipe, top, match, navigate]);

  if (!auth.approved) {
    return (
      <Empty title="Akışınız onaydan sonra açılacak">
        <p>Teknokent yönetimi firmanızı onayladığında size uygun firmalar burada listelenecek.</p>
        <Link className="btn btn-primary" to="/profile">Profilimi tamamla</Link>
      </Empty>
    );
  }
  if (feed.loading) return <Spinner />;
  if (feed.error) return <Alert error={feed.error} />;

  const onDown = (e) => {
    if (busy || e.button > 0 || e.target.closest('button, a')) return;
    start.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ x: 0, y: 0, active: true, leaving: null });
  };
  const onMove = (e) => {
    if (!start.current) return;
    setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y, active: true, leaving: null });
  };
  const onUp = () => {
    if (!start.current) return;
    start.current = null;
    if (drag.x > THRESHOLD) swipe('right');
    else if (drag.x < -THRESHOLD) swipe('left');
    else if (drag.y < -THRESHOLD && top) navigate(`/companies/${top.id}`);
    else setDrag({ x: 0, y: 0, active: false, leaving: null });
  };

  const leaveX = drag.leaving === 'right' ? 700 : drag.leaving === 'left' ? -700 : drag.x;
  const style = {
    transform: `translate(${leaveX}px, ${drag.leaving ? 0 : drag.y * 0.3}px) rotate(${leaveX / 22}deg)`,
    transition: drag.active && !drag.leaving ? 'none' : 'transform .22s ease',
  };
  const hint = drag.x > 40 ? 'right' : drag.x < -40 ? 'left' : null;

  return (
    <div className="feed">
      <div className="feed-head">
        <h1>Keşfet</h1>
        <span className="muted">
          Bugün {feed.data.shownToday}/{feed.data.dailyLimit} kart · kartı sağa kaydırın: İlgileniyorum, sola: Şimdilik değil, yukarı: detay
        </span>
      </div>
      <Alert error={error} />
      {!top ? (
        <Empty title="Bugünlük bu kadar">
          <p>Yeni öneriler yarın gelecek. Bu arada eşleşmelerinize göz atın veya profilinizi güçlendirin: daha net "arıyorum"
            maddeleri daha iyi eşleşme demek.</p>
          <div className="row"><Link className="btn" to="/matches">Eşleşmelerim</Link><Link className="btn" to="/profile">Profilim</Link></div>
        </Empty>
      ) : (
        <>
          <div className="deck">
            {cards[1] && <div className="swipe-card under"><CompanyCard card={cards[1]} compact /></div>}
            <div
              className={`swipe-card ${hint ? `hint-${hint}` : ''}`}
              style={style}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
            >
              {hint === 'right' && <div className="stamp stamp-yes">İLGİLENİYORUM</div>}
              {hint === 'left' && <div className="stamp stamp-no">ŞİMDİLİK DEĞİL</div>}
              <CompanyCard card={top} />
              <Link className="card-more" to={`/companies/${top.id}`}>Tam profili gör ↑</Link>
            </div>
          </div>
          <div className="deck-actions">
            <button type="button" className="btn btn-lg btn-no" disabled={busy} onClick={() => swipe('left')}>Şimdilik değil</button>
            <button type="button" className="btn btn-lg btn-yes" disabled={busy} onClick={() => swipe('right')}>İlgileniyorum</button>
          </div>
        </>
      )}

      <Modal open={!!match} onClose={() => setMatch(null)} title="Karşılıklı ilgi!">
        {match && (
          <div className="stack">
            <p><strong>{match.card.name}</strong> da sizinle ilgileniyor. Bir mesajla tanışın ve toplantı önerin.</p>
            <div className="row">
              <button type="button" className="btn" onClick={() => setMatch(null)}>Kaydırmaya devam et</button>
              <button type="button" className="btn btn-primary" onClick={() => navigate(`/matches/${match.matchId}`)}>Mesaj gönder</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
