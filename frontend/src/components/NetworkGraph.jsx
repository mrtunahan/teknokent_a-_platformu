import { useMemo, useState } from 'react';

const W = 900;
const H = 560;

/** Basit kuvvet yönlendirmeli yerleşim (yüzlerce düğüm için yeterli; tek seferlik hesap). */
function layout(nodes, edges) {
  const n = nodes.length;
  const idx = new Map(nodes.map((x, i) => [String(x.id), i]));
  const pos = nodes.map((_, i) => {
    const a = (2 * Math.PI * i) / Math.max(1, n);
    return { x: W / 2 + Math.cos(a) * W * 0.35, y: H / 2 + Math.sin(a) * H * 0.35 };
  });
  const links = edges.map((e) => [idx.get(String(e.source)), idx.get(String(e.target))]).filter(([a, b]) => a != null && b != null);
  const k = Math.sqrt((W * H) / Math.max(1, n)) * 0.42;
  for (let iter = 0; iter < 250; iter += 1) {
    const t = 12 * (1 - iter / 250) + 0.5;
    const disp = pos.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        const dx = pos[i].x - pos[j].x;
        const dy = pos[i].y - pos[j].y;
        const d = Math.max(0.01, Math.hypot(dx, dy));
        const f = (k * k) / d;
        disp[i].x += (dx / d) * f; disp[i].y += (dy / d) * f;
        disp[j].x -= (dx / d) * f; disp[j].y -= (dy / d) * f;
      }
    }
    for (const [a, b] of links) {
      const dx = pos[a].x - pos[b].x;
      const dy = pos[a].y - pos[b].y;
      const d = Math.max(0.01, Math.hypot(dx, dy));
      const f = (d * d) / k;
      disp[a].x -= (dx / d) * f; disp[a].y -= (dy / d) * f;
      disp[b].x += (dx / d) * f; disp[b].y += (dy / d) * f;
    }
    for (let i = 0; i < n; i += 1) {
      // merkeze hafif çekim
      disp[i].x += (W / 2 - pos[i].x) * 0.9;
      disp[i].y += (H / 2 - pos[i].y) * 0.9;
      const d = Math.max(0.01, Math.hypot(disp[i].x, disp[i].y));
      pos[i].x = Math.min(W - 30, Math.max(30, pos[i].x + (disp[i].x / d) * Math.min(d, t)));
      pos[i].y = Math.min(H - 30, Math.max(30, pos[i].y + (disp[i].y / d) * Math.min(d, t)));
    }
  }
  return { pos, links };
}

const PALETTE = ['#2563eb', '#0891b2', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#ca8a04', '#4f46e5'];

export default function NetworkGraph({ nodes, edges }) {
  const [hover, setHover] = useState(null);
  const { pos, links } = useMemo(() => layout(nodes, edges), [nodes, edges]);
  const sectors = useMemo(() => [...new Set(nodes.map((x) => x.sectors[0]).filter(Boolean))], [nodes]);
  const color = (x) => (x.degree === 0 ? '#9ca3af' : PALETTE[sectors.indexOf(x.sectors[0]) % PALETTE.length] || PALETTE[0]);
  if (!nodes.length) return <p className="muted">Henüz onaylı firma yok.</p>;
  return (
    <div className="graph">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Firma eşleşme ağı">
        {links.map(([a, b], i) => (
          <line key={i} x1={pos[a].x} y1={pos[a].y} x2={pos[b].x} y2={pos[b].y}
            className={hover != null && (hover === a || hover === b) ? 'edge on' : 'edge'} />
        ))}
        {nodes.map((x, i) => (
          <g key={x.id} transform={`translate(${pos[i].x},${pos[i].y})`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <circle r={6 + Math.min(10, x.degree * 2)} fill={color(x)} />
            {(hover === i || nodes.length <= 40) && <text y={-12 - Math.min(10, x.degree * 2)} textAnchor="middle">{x.name}</text>}
          </g>
        ))}
      </svg>
      {sectors.length > 0 && (
        <div className="legend">
          {sectors.slice(0, 8).map((s) => <span key={s}><span className="lg" style={{ background: color({ degree: 1, sectors: [s] }) }} />{s}</span>)}
          <span><span className="lg" style={{ background: '#9ca3af' }} />Eşleşmesi yok</span>
        </div>
      )}
    </div>
  );
}
