/**
 * Raporlama / dışa aktarım yardımcıları.
 * SÖZLEŞME:
 *  - downloadCsv(filename, headers, rows): Türkçe Excel uyumlu CSV (UTF-8 BOM, ';' ayırıcı, CRLF) indirir
 *  - printReport(title, html, opts?): yeni pencerede kurumsal görünümlü yazdırılabilir rapor açar ve print() çağırır;
 *    açılır pencere engellenirse false döner (çağıran toast göstermeli)
 *  - esc(text): HTML kaçışı · htmlTable(headers, rows): rapor tablosu HTML'i · fmtDate(ts) · fileStamp()
 */

import { BUDGET, CATEGORY, FUNDING, STAGES, STATUS, firmOf, orgOf, type Need, type Project } from '../data';

export type Cell = string | number | null | undefined;

function csvCell(v: Cell): string {
  if (v == null) return '';
  const s = typeof v === 'number' ? String(v).replace('.', ',') : String(v);
  // Ayırıcı, tırnak, satır sonu ya da baştaki/sondaki boşluk varsa tırnakla; içteki tırnakları ikile
  return /[";\r\n]|^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: Cell[][]): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n') + '\r\n';
}

export function downloadCsv(filename: string, headers: string[], rows: Cell[][]): void {
  const name = filename.toLowerCase().endsWith('.csv') ? filename : `${filename}.csv`;
  const blob = new Blob(['﻿' + toCsv(headers, rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export const esc = (s: Cell) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const fmtDate = (ts: number | undefined) => (ts ? new Date(ts).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '');

/** Dosya adı eki: 2026-11-25 */
export const fileStamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** Türkçe karakterleri sadeleştirip dosya adına uygun hale getirir */
export const slugify = (s: string) =>
  s
    .toLocaleLowerCase('tr')
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

export function htmlTable(headers: string[], rows: Cell[][], opts?: { numeric?: number[] }): string {
  const num = new Set(opts?.numeric ?? []);
  if (!rows.length) return '<p class="muted">Kayıt yok.</p>';
  return `<table><thead><tr>${headers.map((h, i) => `<th${num.has(i) ? ' class="num"' : ''}>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c, i) => `<td${num.has(i) ? ' class="num"' : ''}>${esc(c)}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;
}

const REPORT_CSS = `
@page { size: A4; margin: 18mm 16mm 20mm; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: "Inter", "Segoe UI", system-ui, -apple-system, Arial, sans-serif; color: #0f172a; font-size: 10.5pt; line-height: 1.45; background: #fff; }
.wrap { max-width: 180mm; margin: 0 auto; padding: 8mm 0; }
header.rh { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; border-bottom: 3px solid #FF5E00; padding-bottom: 10px; margin-bottom: 16px; }
.brand { font-weight: 800; font-size: 18pt; letter-spacing: -0.02em; color: #0f172a; }
.brand span { color: #FF5E00; }
.brand small { display: block; font-size: 8pt; font-weight: 600; color: #64748b; letter-spacing: 0.08em; text-transform: uppercase; }
.meta { text-align: right; font-size: 9pt; color: #475569; }
.meta b { color: #0f172a; }
h1 { font-size: 16pt; margin: 0 0 4px; letter-spacing: -0.01em; }
h2 { font-size: 11.5pt; margin: 18px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; color: #0f172a; page-break-after: avoid; }
p { margin: 0 0 8px; }
.muted { color: #64748b; }
.kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 12px 0 4px; }
.kpi { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; page-break-inside: avoid; }
.kpi .l { font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; font-weight: 700; }
.kpi .v { font-size: 15pt; font-weight: 800; margin-top: 2px; }
.kpi .h { font-size: 8pt; color: #64748b; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
table { width: 100%; border-collapse: collapse; margin: 4px 0 8px; font-size: 9pt; }
thead { display: table-header-group; }
th { background: #f1f5f9; color: #334155; text-align: left; font-weight: 700; padding: 6px 7px; border-bottom: 1.5px solid #cbd5e1; }
td { padding: 5px 7px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
tr { page-break-inside: avoid; }
tbody tr:nth-child(even) td { background: #fafafa; }
.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.bar { height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
.bar > i { display: block; height: 100%; background: #FF5E00; }
footer.rf { margin-top: 22px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 8pt; color: #94a3b8; display: flex; justify-content: space-between; }
.noprint { position: fixed; top: 10px; right: 10px; }
.noprint button { font: inherit; font-weight: 700; background: #FF5E00; color: #fff; border: 0; border-radius: 8px; padding: 8px 14px; cursor: pointer; }
@media print { .noprint { display: none; } .wrap { padding: 0; } }
`;

/**
 * Yazdırılabilir rapor penceresi açar. `html` gövde içeriğidir (h2, tablo, .kpis vb. sınıflar kullanılabilir).
 * Dönüş: pencere açılamadıysa (açılır pencere engelleyici) false.
 */
export function printReport(title: string, html: string, opts?: { org?: string; subtitle?: string }): boolean {
  let w: Window | null = null;
  try {
    w = window.open('', '_blank', 'width=900,height=1100');
  } catch {
    w = null;
  }
  if (!w) return false;
  const now = new Date();
  const date = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  const time = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const doc = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · TeknoOrtak</title><style>${REPORT_CSS}</style></head>
<body><div class="noprint"><button type="button" onclick="window.print()">Yazdır / PDF olarak kaydet</button></div>
<div class="wrap">
<header class="rh"><div class="brand">Tekno<span>Ortak</span><small>Sanayi–Akademi Köprüsü</small></div>
<div class="meta">${opts?.org ? `<div><b>${esc(opts.org)}</b></div>` : ''}<div>Rapor tarihi: ${esc(date)} ${esc(time)}</div></div></header>
<h1>${esc(title)}</h1>${opts?.subtitle ? `<p class="muted">${esc(opts.subtitle)}</p>` : ''}
${html}
<footer class="rf"><span>TeknoOrtak · Sanayi–Akademi Köprüsü · örnek veriyle oluşturulmuş demo raporu</span><span>${esc(date)}</span></footer>
</div></body></html>`;
  w.document.open();
  w.document.write(doc);
  w.document.close();
  w.focus();
  // Stil ve yazı tipleri yerleşsin diye kısa gecikmeyle yazdır
  setTimeout(() => {
    try {
      w!.print();
    } catch {
      /* kullanıcı pencereyi kapatmış olabilir */
    }
  }, 350);
  return true;
}

/* --------------------------- Ortak tablo üreticileri --------------------------- */


export const NEED_HEADERS = ['Başlık', 'Firma', 'OSB', 'İl', 'Tür', 'Durum', 'Yönlendirme', 'Aciliyet', 'Gizli', 'Tarih'];

/** İhtiyaç satırları — yalnız başlık/özet alanları; gizli ihtiyacın ayrıntısı (açıklama, bütçe vb.) hiçbir zaman eklenmez */
export function needRows(needs: Need[]): Cell[][] {
  return needs.map((n) => {
    const f = firmOf(n.firmId);
    const o = orgOf(f.orgId);
    return [n.title, f.name, o.short, o.city, CATEGORY[n.category], STATUS[n.status], n.route === 'ag' ? 'Tüm ağ' : `İl içi (${o.city})`, n.urgency === 'acil' ? 'Acil' : 'Normal', n.confidential ? 'Evet' : 'Hayır', fmtDate(n.createdAt)];
  });
}

export const PROJECT_HEADERS = ['İhtiyaç', 'Firma', 'Çözüm sağlayıcı', 'Aşama', 'Bütçe (₺)', 'Program', 'Başlangıç'];

export function projectRows(projects: Project[], needs: Need[], nameOf: (solverId: string) => string): Cell[][] {
  return projects.map((p) => {
    const n = needs.find((x) => x.id === p.needId);
    const stage = STAGES.find((s) => s.key === p.stage)?.label ?? p.stage;
    const program = p.program ?? (n && !n.confidential ? n.funding : undefined);
    const budget = p.value != null ? p.value : n && !n.confidential ? `Tahmini: ${BUDGET[n.budget]}` : '';
    return [n?.title ?? '—', n ? firmOf(n.firmId).name : '—', nameOf(p.solverId), stage, budget, program ? FUNDING[program] : '', fmtDate(p.startedAt)];
  });
}
