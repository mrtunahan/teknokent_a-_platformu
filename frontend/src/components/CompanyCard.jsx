import { Chip, Logo } from './ui';
import { COLLABORATION, EMPLOYEES, STAGES, URGENCY } from '../labels';

/** Akış kartı içeriği: logo, ad, teknokent, uyum yüzdesi, gerekçeler, sunuyor/arıyor özeti. */
export default function CompanyCard({ card, compact = false }) {
  return (
    <div className="card-body">
      <div className="card-head">
        <Logo company={card} size={compact ? 48 : 64} />
        <div className="card-title">
          <h2>{card.name} {card.verified && <span className="badge" title="Teknokent onaylı">✓ Onaylı</span>}</h2>
          <div className="muted">
            {[card.technopark?.name, card.city, STAGES[card.stage], EMPLOYEES[card.employeeRange]].filter(Boolean).join(' · ')}
          </div>
        </div>
        {card.matchPercent != null && (
          <div className="match-pct" aria-label={`Yüzde ${card.matchPercent} uyum`}>
            <strong>%{card.matchPercent}</strong><span>uyum</span>
          </div>
        )}
      </div>

      {card.reasons?.length > 0 && (
        <ul className="reasons">
          {card.reasons.map((r) => <li key={r}>{r}</li>)}
        </ul>
      )}
      {card.exploration && <div className="explore-note">Keşif önerisi: alışılmışın dışında bir firma</div>}

      {card.sectors?.length > 0 && (
        <div className="chips">{card.sectors.map((s) => <Chip key={s.id}>{s.name}</Chip>)}</div>
      )}

      <div className="offer-need">
        <section>
          <h3>Sunuyor</h3>
          {card.offers?.length ? card.offers.map((o) => (
            <div key={o.id} className="item">
              <strong>{o.tag?.name}</strong> <span className="muted">· {COLLABORATION[o.collaborationType]}</span>
              {!compact && o.description && <p>{o.description}</p>}
            </div>
          )) : <p className="muted">Belirtilmemiş</p>}
        </section>
        <section>
          <h3>Arıyor</h3>
          {card.needs?.length ? card.needs.map((n) => (
            <div key={n.id} className="item">
              <strong>{n.tag?.name}</strong> <span className="muted">· {COLLABORATION[n.collaborationType]} · {URGENCY[n.urgency]}</span>
              {!compact && n.description && <p>{n.description}</p>}
            </div>
          )) : <p className="muted">Herkese açık ihtiyaç yok</p>}
        </section>
      </div>
    </div>
  );
}
