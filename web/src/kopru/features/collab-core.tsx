/**
 * Belgeler · toplantılar · ön yazışma: ortak veri modeli, örnek veri, rol/taraf yardımcıları ve dosya çıktıları (.ics, yazdırma).
 * Veri `ext('collab')` altında tutulur (kalıcı, tüm rollerce paylaşılır, "Sıfırla" ile seed'e döner).
 */
import { FIRMS, ORG_PEOPLE, PERSONAS, SEED_ACADEMICS, firmOf, orgOf, ttoName, type Need, type Project } from '../data';
import { firmInbox, needInScope, projectInScope, solverIdOf, solverInbox, useKopru } from '../store';
import { fmtTL } from '../ui';
import { roomUrl } from '@/rtc/useRoom';

/* --------------------------------- Model ---------------------------------- */

/** Süreçteki taraf: ihtiyaç sahibi firma, çözüm sağlayıcı (akademisyen / teknokent firması), TTO */
export type Party = 'firma' | 'cozucu' | 'tto';

export type MeetingStatus = 'onerildi' | 'onaylandi' | 'reddedildi' | 'iptal' | 'tamamlandi';
export interface Meeting {
  id: string;
  needId: string;
  solverId?: string;
  projectId?: string;
  title: string;
  mode: 'video' | 'yuzyuze';
  location?: string;
  roomId?: string;
  /** Önerilen zaman dilimleri (ms) */
  slots: number[];
  /** Onaylanan zaman */
  startsAt?: number;
  durationMin: number;
  status: MeetingStatus;
  proposedBy: Party;
  proposerName: string;
  createdAt: number;
  note?: string;
  /** Kabul / ret / iptal eden */
  answeredBy?: string;
}

export interface ThreadMsg {
  id: string;
  needId: string;
  solverId: string;
  from: Party;
  name: string;
  text: string;
  at: number;
}

export type DocType = 'nda' | 'teklif' | 'sozlesme' | 'ara' | 'sonuc' | 'diger';
export const DOC_TYPES: Record<DocType, string> = {
  nda: 'Gizlilik sözleşmesi (NDA)',
  teklif: 'Teklif',
  sozlesme: 'Sözleşme',
  ara: 'Ara rapor',
  sonuc: 'Sonuç raporu',
  diger: 'Diğer',
};

export interface Approval {
  party: Party;
  name: string;
  at: number;
}

export interface CollabDoc {
  id: string;
  projectId: string;
  type: DocType;
  title: string;
  /** Şablondan oluşturulan belgenin metni ("# " başlık, "## " madde başlığı) */
  body?: string;
  fileName?: string;
  size?: number;
  mime?: string;
  /** ≤ 700 KB dosyalar data URL olarak saklanır */
  dataUrl?: string;
  source: 'upload' | 'template';
  by: Party;
  byName: string;
  at: number;
  approvals: Approval[];
}

export interface CollabState {
  messages: ThreadMsg[];
  meetings: Meeting[];
  docs: CollabDoc[];
}

/* ------------------------------- Biçimleme -------------------------------- */

export const fmtSlot = (t: number) =>
  new Date(t).toLocaleString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const fmtDate = (t: number) => new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
export const fmtStamp = (t: number) =>
  new Date(t).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const pad = (n: number) => String(n).padStart(2, '0');
/** datetime-local değeri (yerel saat) */
export const toLocalInput = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** İleri iş günlerinde makul saatler: yarın 10:00, sonraki iş günü 14:00, ardından 11:00 */
export function defaultSlots(now = Date.now()): number[] {
  const hours = [10, 14, 11];
  const out: number[] = [];
  const d = new Date(now);
  while (out.length < 3) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const x = new Date(d);
    x.setHours(hours[out.length]!, 0, 0, 0);
    out.push(x.getTime());
  }
  return out;
}

/** Türkçe karaktersiz dosya adı */
export function slugify(s: string) {
  const map: Record<string, string> = { ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i', ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u', â: 'a', î: 'i', û: 'u' };
  return (
    s
      .replace(/[çÇğĞıİöÖşŞüÜâîû]/g, (c) => map[c] ?? c)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'belge'
  );
}

export function downloadBlob(content: BlobPart, type: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------------------------------- .ics ---------------------------------- */

const icsDate = (t: number) => {
  const d = new Date(t);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
};
const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
/** RFC 5545: satırlar 75 sekizliyi geçmez, devam satırı boşlukla başlar */
function fold(line: string) {
  const enc = new TextEncoder();
  let out = '';
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > 75) {
      out += `${cur}\r\n `;
      cur = '';
      bytes = 1;
    }
    cur += ch;
    bytes += b;
  }
  return out + cur;
}

/** Görüntülü görüşme odası bağlantısı (@/rtc/useRoom → roomUrl) */
export const roomLink = (roomId: string) => roomUrl(roomId);

export function meetingIcs(m: Meeting, context: string): string {
  const stamp = icsDate(Date.now());
  const times = m.status === 'onerildi' ? m.slots : [m.startsAt ?? m.slots[0] ?? m.createdAt];
  const status = m.status === 'onerildi' ? 'TENTATIVE' : m.status === 'iptal' || m.status === 'reddedildi' ? 'CANCELLED' : 'CONFIRMED';
  const loc = m.mode === 'video' ? (m.roomId ? `Görüntülü görüşme · ${roomLink(m.roomId)}` : 'Görüntülü görüşme') : m.location || 'Yüz yüze';
  const desc = [
    context,
    m.mode === 'video' && m.roomId ? `Görüntülü görüşme odası: ${roomLink(m.roomId)}` : m.location ? `Yer: ${m.location}` : '',
    m.status === 'onerildi' ? 'Önerilen zaman dilimlerinden biridir; onay bekliyor.' : '',
    m.note ? `Not: ${m.note}` : '',
    `Öneren: ${m.proposerName}`,
  ]
    .filter(Boolean)
    .join('\n');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TeknoOrtak//Sanayi-Akademi Koprusu//TR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  times.forEach((t, i) => {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${m.id}${times.length > 1 ? `-${i + 1}` : ''}@teknoortak.demo`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsDate(t)}`,
      `DTEND:${icsDate(t + m.durationMin * 60_000)}`,
      `SUMMARY:${icsText(m.status === 'onerildi' ? `${m.title} (öneri ${i + 1}/${times.length})` : m.title)}`,
      `DESCRIPTION:${icsText(desc)}`,
      `LOCATION:${icsText(loc)}`,
      ...(m.mode === 'video' && m.roomId ? [`URL:${roomLink(m.roomId)}`] : []),
      `STATUS:${status}`,
      'END:VEVENT',
    );
  });
  lines.push('END:VCALENDAR');
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

export function downloadIcs(m: Meeting, context: string) {
  downloadBlob(meetingIcs(m, context), 'text/calendar;charset=utf-8', `toplanti-${slugify(m.title)}.ics`);
}

/* ------------------------------ Yazdırma / PDF ----------------------------- */

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Şablon metnini HTML'e çevirir ("# " başlık, "## " madde başlığı, boş satır paragraf) */
export function bodyToHtml(body: string) {
  return body
    .split(/\n{2,}/)
    .map((block) => {
      const b = block.trim();
      if (b.startsWith('# ')) return `<h1>${esc(b.slice(2))}</h1>`;
      if (b.startsWith('## ')) return `<h2>${esc(b.slice(3))}</h2>`;
      return `<p>${esc(b).replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');
}

export function printDocument(title: string, bodyHtml: string, footerHtml = '') {
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.write(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @page { margin: 22mm 18mm; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #0f172a; line-height: 1.55; max-width: 760px; margin: 24px auto; padding: 0 16px; font-size: 14px; }
  h1 { font-size: 20px; text-align: center; letter-spacing: .02em; margin: 0 0 18px; }
  h2 { font-size: 14px; margin: 18px 0 6px; text-transform: uppercase; letter-spacing: .03em; }
  p { margin: 0 0 10px; text-align: justify; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 13px; }
  th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; }
  .muted { color: #64748b; font-size: 12px; }
</style></head><body>${bodyHtml}${footerHtml}
<script>window.addEventListener('load', function () { setTimeout(function () { window.focus(); window.print(); }, 150); });</script>
</body></html>`);
  w.document.close();
  return true;
}

/* --------------------------- Taraflar ve kapsam ---------------------------- */

type K = ReturnType<typeof useKopru>;

export function useCollab() {
  const k = useKopru();
  const data = k.ext<CollabState>('collab', COLLAB_SEED);
  const update = (fn: (prev: CollabState) => CollabState) => k.setExt<CollabState>('collab', COLLAB_SEED, fn);
  return { k, data, update };
}

/** Rolün bu ihtiyaç–çözüm sağlayıcı ilişkisindeki tarafı (yoksa salt okunur / görmez) */
export function needParty(k: K, need: Need, solverId: string): Party | null {
  if (k.role === 'firma' && need.firmId === PERSONAS.firma.firmId) return 'firma';
  if (solverIdOf(k.role) === solverId) return 'cozucu';
  if (k.role === 'tto' && needInScope(k.state, 'tto', need)) return 'tto';
  return null;
}

export function projectParty(k: K, p: Project): Party | null {
  const need = k.state.needs.find((n) => n.id === p.needId);
  if (!need) return null;
  if (k.role === 'firma' && need.firmId === PERSONAS.firma.firmId) return 'firma';
  if (solverIdOf(k.role) === p.solverId) return 'cozucu';
  if (k.role === 'tto' && projectInScope(k.state, 'tto', p)) return 'tto';
  return null;
}

/** Kayıtlarda görünen ad: kişi · kurum */
export function partyName(k: K, party: Party, need: Need, solverId: string): string {
  if (party === 'firma') return `${k.me.name} · ${firmOf(need.firmId).name}`;
  if (party === 'tto') return `${k.me.name} · ${ttoName(k.state.orgSel.tto)}`;
  const s = k.findSolver(solverId);
  if (s?.kind === 'firm') return `${k.me.name} · ${s.data.name}`;
  return s?.data.name ?? k.me.name;
}

export function partyLabel(party: Party, solverKind: 'academic' | 'firm') {
  return party === 'firma' ? 'Firma' : party === 'tto' ? 'TTO' : solverKind === 'academic' ? 'Uzman' : 'Çözüm ortağı';
}

/** İlişkideki TTO'lar: inceleyen (yoksa yönlendirilen) + akademisyenin kendi üniversitesi */
export function ttoOrgsOf(k: K, need: Need, solverId: string): string[] {
  const base = need.ttoOrg ? [need.ttoOrg] : need.ttoIds;
  const acad = k.state.academics.find((a) => a.id === solverId);
  return [...new Set([...base, ...(acad ? [acad.orgId] : [])])];
}

/** Tüm taraf kutuları; kendi kutusu hariç */
export function otherInboxes(k: K, need: Need, solverId: string): string[] {
  const all = [firmInbox(need.firmId), solverInbox(solverId), ...ttoOrgsOf(k, need, solverId).map((u) => `tto:${u}`)];
  return [...new Set(all)].filter((x) => x !== k.inbox.key);
}

/** Toplantılar sayfasında rolün görebileceği toplantılar */
export function meetingVisible(k: K, m: Meeting): boolean {
  const need = k.state.needs.find((n) => n.id === m.needId);
  if (!need) return false;
  const p = m.projectId ? k.state.projects.find((x) => x.id === m.projectId) : undefined;
  const solverId = m.solverId ?? p?.solverId;
  switch (k.role) {
    case 'firma':
      return need.firmId === PERSONAS.firma.firmId;
    case 'akademisyen':
    case 'tfirma':
      return !!solverId && solverId === solverIdOf(k.role);
    case 'tto':
      return p ? projectInScope(k.state, 'tto', p) : needInScope(k.state, 'tto', need);
    case 'osb':
      return needInScope(k.state, 'osb', need);
    case 'teknokent': {
      const f = FIRMS.find((x) => x.id === solverId);
      return !!f && f.orgId === k.state.orgSel.teknokent;
    }
    default:
      return true;
  }
}

/** Toplantıdaki rol tarafı */
export function meetingParty(k: K, m: Meeting): Party | null {
  const p = m.projectId ? k.state.projects.find((x) => x.id === m.projectId) : undefined;
  if (p) return projectParty(k, p);
  const need = k.state.needs.find((n) => n.id === m.needId);
  return need && m.solverId ? needParty(k, need, m.solverId) : null;
}

/* ------------------------------ Belge kuralları ---------------------------- */

/** Belgenin yürürlüğe girmesi için zorunlu onaylar */
export function requiredParties(type: DocType, kind: Project['kind']): Party[] {
  if (type === 'nda') return ['firma', 'cozucu'];
  if (type === 'sozlesme') return kind === 'academic' ? ['firma', 'cozucu', 'tto'] : ['firma', 'cozucu'];
  return [];
}
/** Onay satırında gösterilen taraflar (akademisyen projesinde NDA için TTO onayı isteğe bağlı gösterilir) */
export function shownParties(type: DocType, kind: Project['kind']): Party[] {
  if (type === 'nda' && kind === 'academic') return ['firma', 'cozucu', 'tto'];
  return requiredParties(type, kind);
}
export function isEffective(d: CollabDoc, kind: Project['kind']) {
  return requiredParties(d.type, kind).every((p) => d.approvals.some((a) => a.party === p));
}
export function docStatus(d: CollabDoc, kind: Project['kind']): { label: string; tone: 'ok' | 'wait' | 'plain' } {
  const req = requiredParties(d.type, kind);
  if (!req.length) return { label: 'Yüklendi', tone: 'plain' };
  const n = req.filter((p) => d.approvals.some((a) => a.party === p)).length;
  return n === req.length ? { label: 'Yürürlükte', tone: 'ok' } : { label: `Onay bekliyor (${n}/${req.length})`, tone: 'wait' };
}

/** Aşama ilerletme koşulu (saf fonksiyon) */
export function stageGate(p: Project, docs: CollabDoc[]): { ok: boolean; reason?: string } {
  const mine = docs.filter((d) => d.projectId === p.id);
  const eff = (t: DocType) => mine.some((d) => d.type === t && isEffective(d, p.kind));
  switch (p.stage) {
    case 'nda':
      return eff('nda') ? { ok: true } : { ok: false, reason: 'Devam etmek için gizlilik sözleşmesini iki taraf da onaylamalı.' };
    case 'teklif':
      return mine.some((d) => d.type === 'teklif') ? { ok: true } : { ok: false, reason: 'Devam etmek için Belgeler bölümüne en az bir teklif belgesi yükleyin.' };
    case 'sozlesme':
      return eff('sozlesme')
        ? { ok: true }
        : { ok: false, reason: p.kind === 'academic' ? 'Devam etmek için sözleşmeyi firma, uzman ve TTO onaylamalı.' : 'Devam etmek için sözleşmeyi iki taraf da onaylamalı.' };
    case 'yurutme':
      return mine.some((d) => d.type === 'sonuc') ? { ok: true } : { ok: false, reason: 'Projeyi tamamlamak için sonuç raporunu yükleyin.' };
    default:
      return { ok: true };
  }
}

/* ------------------------------- Şablonlar -------------------------------- */

export interface TemplateCtx {
  firmName: string;
  firmOrg: string;
  firmCity: string;
  solverName: string;
  solverOrg: string;
  solverKind: 'academic' | 'firm';
  ttoName?: string;
  subject: string;
  date: number;
  value?: number;
  months?: number;
}

export function templateCtx(k: K, p: Project): TemplateCtx | null {
  const need = k.state.needs.find((n) => n.id === p.needId);
  const s = k.findSolver(p.solverId);
  if (!need || !s) return null;
  const firm = firmOf(need.firmId);
  const acadTto = s.kind === 'academic' ? s.data.orgId : need.ttoOrg;
  return {
    firmName: firm.name,
    firmOrg: orgOf(firm.orgId).name,
    firmCity: orgOf(firm.orgId).city,
    solverName: s.data.name,
    solverOrg: s.kind === 'academic' ? `${orgOf(s.data.orgId).name}, ${s.data.department}` : `${orgOf(s.data.orgId).name} bünyesinde`,
    solverKind: s.kind,
    ttoName: acadTto ? `${orgOf(acadTto).name} Teknoloji Transfer Ofisi (${ttoName(acadTto)})` : undefined,
    subject: need.title,
    date: Date.now(),
    value: p.value,
  };
}

const NOTE = 'Not: Bu metin TeknoOrtak demosunda üretilen örnek bir şablondur; hukuki tavsiye niteliği taşımaz. İmzadan önce kurumunuzun hukuk birimine danışınız.';

function partiesBlock(c: TemplateCtx) {
  const lines = [
    `1. ${c.firmName}, ${c.firmOrg} (bundan sonra "FİRMA")`,
    `2. ${c.solverName}, ${c.solverOrg} (bundan sonra "${c.solverKind === 'academic' ? 'UZMAN' : 'ÇÖZÜM ORTAĞI'}")`,
  ];
  if (c.ttoName) lines.push(`3. ${c.ttoName} (bundan sonra "TTO"${c.solverKind === 'academic' ? '; üniversite adına koordinasyon ve imza yetkilisi' : '; süreç koordinatörü'})`);
  return lines.join('\n');
}

export function ndaText(c: TemplateCtx): string {
  const other = c.solverKind === 'academic' ? 'UZMAN' : 'ÇÖZÜM ORTAĞI';
  return [
    '# KARŞILIKLI GİZLİLİK SÖZLEŞMESİ',
    `Tarih: ${fmtDate(c.date)}\nKonu: ${c.subject}`,
    '## Taraflar',
    partiesBlock(c),
    '## Madde 1 – Amaç',
    `Bu sözleşme, taraflar arasında "${c.subject}" konusunda yürütülecek iş birliğinin değerlendirilmesi ve yürütülmesi sırasında paylaşılacak gizli bilgilerin korunmasına ilişkin esasları düzenler.`,
    '## Madde 2 – Gizli bilginin tanımı',
    'Yazılı, sözlü, elektronik ortamda veya numune yoluyla paylaşılan; üretim süreçleri, reçeteler, proses parametreleri, test ve analiz sonuçları, çizimler, yazılımlar, maliyet ve ticari veriler, müşteri ve tedarikçi bilgileri ile "gizli" ibaresi taşıyan ya da niteliği gereği gizli olduğu açıkça anlaşılan her türlü bilgi "Gizli Bilgi" sayılır.',
    '## Madde 3 – İstisnalar',
    'Aşağıdaki bilgiler gizlilik yükümlülüğü kapsamında değildir:\n(a) Açıklandığı tarihte kamuya mal olmuş ya da sonradan alan tarafın kusuru olmaksızın kamuya mal olan bilgiler;\n(b) Açıklanmadan önce alan tarafın hukuka uygun olarak elinde bulunduğu belgelenebilen bilgiler;\n(c) Üçüncü kişilerden gizlilik yükümlülüğü olmaksızın hukuka uygun biçimde edinilen bilgiler;\n(d) Gizli Bilgiden bağımsız olarak geliştirildiği belgelenebilen bilgiler;\n(e) Mevzuat veya yetkili makam kararı gereği açıklanması zorunlu olan bilgiler (karşı tarafa derhal yazılı bildirim yapılması kaydıyla).',
    '## Madde 4 – Yükümlülükler',
    `Alan taraf, Gizli Bilgiyi yalnızca Madde 1'deki amaç doğrultusunda kullanır; bilmesi gereken çalışanlar ve proje personeliyle sınırlı tutar ve onların da bu sözleşmeye uymasını sağlar; Gizli Bilgiyi en az kendi gizli bilgilerine gösterdiği özenle korur ve izinsiz bir kullanım fark ettiğinde karşı tarafı derhal bilgilendirir.`,
    ...(c.solverKind === 'academic'
      ? ['## Madde 5 – Akademik yayın', `${other}, Gizli Bilgi içeren yayın, bildiri ve tez çalışmalarını FİRMA'nın yazılı onayı olmadan yayımlayamaz. FİRMA, kendisine iletilen yayın taslağını 30 gün içinde değerlendirir; makul olmayan biçimde onay esirgenemez.`]
      : ['## Madde 5 – Personel ve alt yükleniciler', `${other}, Gizli Bilgiyi FİRMA'nın yazılı onayı olmadan alt yüklenici veya iş ortaklarıyla paylaşamaz.`]),
    '## Madde 6 – Süre',
    'Bu sözleşme e-onay tarihinden itibaren 3 (üç) yıl süreyle yürürlükte kalır. Bu süre içinde paylaşılan Gizli Bilgiye ilişkin yükümlülükler, sözleşmenin sona ermesinden sonra da 3 (üç) yıl devam eder.',
    '## Madde 7 – İade ve imha',
    'Sözleşmenin sona ermesi veya açıklayan tarafın yazılı talebi üzerine alan taraf, Gizli Bilgi içeren tüm belge, numune ve kopyaları iade eder ya da imha ederek bunu yazılı olarak teyit eder.',
    '## Madde 8 – Fikri mülkiyet',
    'Bu sözleşme tarafların mevcut fikri ve sınai mülkiyet haklarını saklı tutar; hiçbir hükmü lisans, devir veya kullanım hakkı verilmesi olarak yorumlanamaz. İş birliği sonucunda doğabilecek haklar ayrıca yapılacak sözleşmeyle düzenlenir.',
    '## Madde 9 – Uyuşmazlıkların çözümü',
    `Bu sözleşmeye Türk hukuku uygulanır. Uyuşmazlıkların çözümünde öncelikle uzlaşma yoluna gidilir; uzlaşma sağlanamazsa ${c.firmCity} Mahkemeleri ve İcra Daireleri yetkilidir.`,
    '## Madde 10 – Yürürlük ve e-onay',
    'Taraflar bu sözleşmeyi TeknoOrtak platformunda kendi kullanıcılarıyla e-onay vererek kabul eder. Onay kayıtları (ad, tarih ve saat) sözleşmenin ayrılmaz ekidir.',
    NOTE,
  ].join('\n\n');
}

export function contractText(c: TemplateCtx): string {
  const months = c.months ?? 12;
  const other = c.solverKind === 'academic' ? 'UZMAN' : 'ÇÖZÜM ORTAĞI';
  const pay =
    c.solverKind === 'academic'
      ? `Ödemeler, TTO koordinasyonunda üniversitenin döner sermaye işletmesi hesabına yapılır.`
      : `Ödemeler, ${other}'nın düzenleyeceği fatura karşılığında banka hesabına yapılır.`;
  return [
    `# ${c.solverKind === 'academic' ? 'ÜNİVERSİTE–SANAYİ İŞ BİRLİĞİ SÖZLEŞMESİ' : 'AR-GE HİZMET SÖZLEŞMESİ'}`,
    `Tarih: ${fmtDate(c.date)}\nKonu: ${c.subject}`,
    '## Taraflar',
    partiesBlock(c),
    '## Madde 1 – Konu',
    `Bu sözleşmenin konusu, FİRMA'nın "${c.subject}" ihtiyacına yönelik Ar-Ge, test ve danışmanlık çalışmalarının ${other} tarafından yürütülmesidir.`,
    '## Madde 2 – Kapsam ve iş planı',
    'Çalışma; (1) mevcut durum analizi ve numune/veri toplama, (2) deneysel çalışma ve analizler, (3) çözüm önerisinin pilot uygulaması, (4) sonuç raporu ve bilgi aktarımı iş paketlerinden oluşur. Ayrıntılı iş planı ve teklif bu sözleşmenin ekidir.',
    '## Madde 3 – Süre',
    `Sözleşme süresi, tüm tarafların e-onayını izleyen günden itibaren ${months} (${months === 12 ? 'on iki' : months}) aydır. Taraflar yazılı mutabakatla süreyi uzatabilir.`,
    '## Madde 4 – Bedel ve ödeme',
    `Sözleşme bedeli ${fmtTL(c.value)} (KDV hariç) olarak belirlenmiştir. Bedelin %40'ı sözleşmenin yürürlüğe girmesiyle, %30'u ara raporun teslimiyle, kalan %30'u sonuç raporunun kabulüyle ödenir. ${pay} Dış destek programı (TÜBİTAK, KOSGEB vb.) kullanılması durumunda ödeme takvimi programın kurallarına uyarlanır.`,
    '## Madde 5 – Tarafların yükümlülükleri',
    `FİRMA; gerekli veri, numune ve tesis erişimini zamanında sağlar ve bir proje sorumlusu belirler. ${other}; çalışmayı bilimsel ve mesleki özenle yürütür, iş planına uyar ve gecikme risklerini önceden bildirir.${c.ttoName ? ' TTO; sözleşme, ödeme ve raporlama süreçlerini koordine eder.' : ''}`,
    '## Madde 6 – Raporlama',
    'Her üç ayda bir kısa ara rapor ve proje sonunda sonuç raporu hazırlanır; raporlar platformdaki proje belgeleri bölümüne yüklenir. FİRMA, sonuç raporunu teslimden itibaren 15 gün içinde değerlendirir.',
    '## Madde 7 – Gizlilik',
    'Taraflar arasında imzalanan gizlilik sözleşmesi bu sözleşmenin ayrılmaz parçasıdır ve proje süresince ve sonrasında geçerliliğini korur.',
    '## Madde 8 – Fikri ve sınai mülkiyet',
    `Tarafların sözleşme öncesindeki fikri ve sınai mülkiyet hakları saklıdır. Proje kapsamında ortaya çıkan sonuçlar üzerindeki hakların paylaşımı, ${c.solverKind === 'academic' ? '6769 sayılı Sınai Mülkiyet Kanunu ve üniversitenin fikri mülkiyet yönergesi çerçevesinde' : 'tarafların katkıları oranında'} ayrıca yazılı olarak belirlenir; buluş niteliğindeki sonuçlar derhal karşı tarafa bildirilir.`,
    '## Madde 9 – Fesih ve mücbir sebep',
    'Taraflardan biri yükümlülüklerini yazılı ihtara rağmen 30 gün içinde yerine getirmezse diğer taraf sözleşmeyi feshedebilir; o tarihe kadar yapılan işlerin bedeli ödenir. Mücbir sebep hâllerinde yükümlülükler, sebep ortadan kalkıncaya kadar askıya alınır.',
    '## Madde 10 – Uyuşmazlıkların çözümü',
    `Bu sözleşmeye Türk hukuku uygulanır. Uyuşmazlıklarda ${c.firmCity} Mahkemeleri ve İcra Daireleri yetkilidir.`,
    '## Madde 11 – Yürürlük ve e-onay',
    `Sözleşme, ${c.solverKind === 'academic' ? 'FİRMA, UZMAN ve TTO' : 'FİRMA ve ÇÖZÜM ORTAĞI'} tarafından platformda e-onay verildiği tarihte yürürlüğe girer. Onay kayıtları sözleşmenin ayrılmaz ekidir.`,
    NOTE,
  ].join('\n\n');
}

/* -------------------------------- Örnek veri -------------------------------- */

const DAY = 86_400_000;
const NOW = Date.now();
const ago = (d: number) => NOW - d * DAY;
/** Bugünden `d` gün sonra (eksi: önce), yerel saatle hh:mm */
const at = (d: number, h: number, m = 0) => {
  const x = new Date(NOW + d * DAY);
  x.setHours(h, m, 0, 0);
  return x.getTime();
};

const acad = (id: string) => SEED_ACADEMICS.find((a) => a.id === id)!;
const p1Ctx: TemplateCtx = {
  firmName: 'Ilgaz Gıda Ürünleri',
  firmOrg: orgOf('osb-cankiri2').name,
  firmCity: 'Çankırı',
  solverName: acad('a3').name,
  solverOrg: `${orgOf('u-caku').name}, ${acad('a3').department}`,
  solverKind: 'academic',
  ttoName: `${orgOf('u-caku').name} Teknoloji Transfer Ofisi (ÇAKÜ TTO)`,
  subject: 'Kuru fasulye paketlerinde raf ömrü ve böceklenme sorunu',
  date: ago(35),
  value: 480_000,
  months: 12,
};
const p2Ctx: TemplateCtx = {
  firmName: 'Çankırı Makine Sanayi',
  firmOrg: orgOf('osb-cankiri').name,
  firmCity: 'Çankırı',
  solverName: acad('a4').name,
  solverOrg: `${orgOf('u-caku').name}, ${acad('a4').department}`,
  solverKind: 'academic',
  ttoName: `${orgOf('u-caku').name} Teknoloji Transfer Ofisi (ÇAKÜ TTO)`,
  subject: 'Boya kurutma fırınında yüksek doğalgaz tüketimi',
  date: ago(102),
  value: 85_000,
  months: 4,
};

const ILGAZ = 'Hande Şimşek · Ilgaz Gıda Ürünleri';
const CMAK = 'Kemal Uçar · Çankırı Makine Sanayi';
const CAKU_TTO = `${ORG_PEOPLE['u-caku']!.name} · ÇAKÜ TTO`;
const KU_TTO = `${ORG_PEOPLE['u-kastamonu']!.name} · KÜ TTO`;
const AYSE = acad('a3').name;
const HAKAN = acad('a4').name;

export const COLLAB_SEED: CollabState = {
  messages: [
    // n3 · Anka Plastik ↔ Zeynep Çelik (KÜ TTO katkısıyla)
    { id: 'cm1', needId: 'n3', solverId: 'a5', from: 'firma', name: 'Burcu Tekin · Anka Plastik Ambalaj', at: ago(5) + 3 * 3600_000, text: 'Taahhüdünüz için teşekkürler. %35 rPET denemelerinde sararma belirginleşiyor; preform ve şişe numunelerini hangi adrese gönderelim?' },
    { id: 'cm2', needId: 'n3', solverId: 'a5', from: 'cozucu', name: acad('a5').name, at: ago(4) + 2 * 3600_000, text: 'Polimer ve Kompozit Laboratuvarı’na (ÇAKÜ, Kimya Müh.) gönderebilirsiniz. Her orandan 10’ar şişe ve kullandığınız rPET granülün parti bilgisi yeterli; DSC ve FTIR ile başlayacağız.' },
    { id: 'cm3', needId: 'n3', solverId: 'a5', from: 'tto', name: KU_TTO, at: ago(4) + 5 * 3600_000, text: 'Bilginize: Firma TÜBİTAK 1501 başvurusu düşünüyor. Ön analiz sonuçları proje önerisinin teknik bölümünde kullanılabilir; ÇAKÜ TTO ile döner sermaye tarafını birlikte yürüteceğiz.' },
    { id: 'cm4', needId: 'n3', solverId: 'a5', from: 'firma', name: 'Burcu Tekin · Anka Plastik Ambalaj', at: ago(3), text: 'Numuneler kargoya verildi (takip no. paylaşıldı). Sonuçlardan sonra kısa bir ön görüşme yapalım.' },
    // n5 · Çankırı Makine ↔ Orion Yazılım (ÇAKÜ TTO sorusu)
    { id: 'cm5', needId: 'n5', solverId: 't0', from: 'tto', name: CAKU_TTO, at: ago(1) + 2 * 3600_000, text: 'Orion ekibine bir sorumuz var: hatlarda PLC’ye erişim olmadan, yalnızca sensörle duruş verisi toplanabilir mi? Firma mevcut panolara müdahale etmek istemiyor.' },
    { id: 'cm6', needId: 'n5', solverId: 't0', from: 'cozucu', name: 'Deniz Aydın · Orion Yazılım', at: ago(1) + 4 * 3600_000, text: 'Evet; akım sensörü ve titreşim sensörüyle panolara dokunmadan makine durumunu okuyabiliyoruz. İlk hafta pilot olarak tek hatta kurulum öneririz.' },
    { id: 'cm7', needId: 'n5', solverId: 't0', from: 'firma', name: CMAK, at: ago(0.5), text: 'Bu yaklaşım bize uyar. Pilot için 2 numaralı montaj hattını ayırabiliriz; detayları görüşmede konuşalım.' },
    // n7 · Demirçelik ↔ Orhan Güneş
    { id: 'cm8', needId: 'n7', solverId: 'a11', from: 'firma', name: 'Ahmet Yalın · Demirçelik Döküm Ltd.', at: ago(8), text: 'Hocam, son üç aya ait ret raporlarını ve kalıp yerleşim çizimlerini paylaşabiliriz. Döküm sıcaklığı kayıtlarımız da mevcut.' },
    { id: 'cm9', needId: 'n7', solverId: 'a11', from: 'cozucu', name: acad('a11').name, at: ago(7), text: 'Çok iyi olur. Çatlak bölgelerinden kesit alıp laboratuvarda metalografik inceleme yapalım; soğutucu yerleşimi için simülasyonla başlayabiliriz.' },
  ],
  meetings: [
    {
      id: 'cmt1', needId: 'n1', solverId: 'a3', projectId: 'p1', title: 'TÜBİTAK 1505 bütçe tablosu son kontrol', mode: 'video', roomId: 'toplanti-p1ilgaz1505',
      slots: [at(2, 10, 30), at(3, 14)], startsAt: at(2, 10, 30), durationMin: 60, status: 'onaylandi', proposedBy: 'tto', proposerName: CAKU_TTO, createdAt: ago(6),
      note: 'Bütçe tablosu ve iş paketleri son hâliyle paylaşılacak.', answeredBy: ILGAZ,
    },
    {
      id: 'cmt2', needId: 'n1', solverId: 'a3', projectId: 'p1', title: 'Depo ziyareti ve numune alımı', mode: 'yuzyuze', location: 'Ilgaz Gıda Ürünleri depo alanı · Çankırı 2. OSB',
      slots: [at(-37, 14)], startsAt: at(-37, 14), durationMin: 90, status: 'tamamlandi', proposedBy: 'cozucu', proposerName: AYSE, createdAt: ago(39), answeredBy: ILGAZ,
    },
    {
      id: 'cmt3', needId: 'n2', solverId: 'a4', projectId: 'p2', title: 'Sonuç raporu sunumu', mode: 'yuzyuze', location: 'Çankırı Makine Sanayi toplantı salonu · Çankırı OSB',
      slots: [at(-21, 11)], startsAt: at(-21, 11), durationMin: 60, status: 'tamamlandi', proposedBy: 'cozucu', proposerName: HAKAN, createdAt: ago(25), answeredBy: CMAK,
    },
    {
      id: 'cmt4', needId: 'n5', solverId: 't0', title: 'Ön görüşme: duruş verisi toplama yaklaşımı', mode: 'video', roomId: 'toplanti-n5orion0demo',
      slots: defaultSlots(NOW), durationMin: 45, status: 'onerildi', proposedBy: 'cozucu', proposerName: 'Deniz Aydın · Orion Yazılım', createdAt: ago(0.4),
      note: 'Pilot hat, sensör yerleşimi ve OEE panosu ekranlarını göstereceğiz.',
    },
  ],
  docs: [
    // p1 · aşama: destek başvurusu
    {
      id: 'cd1', projectId: 'p1', type: 'nda', title: 'Karşılıklı gizlilik sözleşmesi', body: ndaText(p1Ctx), source: 'template', by: 'tto', byName: CAKU_TTO, at: ago(36),
      approvals: [
        { party: 'tto', name: CAKU_TTO, at: ago(36) },
        { party: 'firma', name: ILGAZ, at: ago(35.5) },
        { party: 'cozucu', name: AYSE, at: ago(35) },
      ],
    },
    {
      id: 'cd2', projectId: 'p1', type: 'teklif', title: 'Teklif · raf ömrü çalışması (12 ay)', fileName: 'teklif-raf-omru-12-ay.pdf', size: 412_000, mime: 'application/pdf', source: 'upload', by: 'cozucu', byName: AYSE, at: ago(27),
      body: [
        '# TEKLİF ÖZETİ',
        `Konu: ${p1Ctx.subject}\nHazırlayan: ${AYSE} · ÇAKÜ Gıda Mühendisliği`,
        '## Kapsam',
        '1) Depo koşullarının ve mevcut ambalajın değerlendirilmesi\n2) Modifiye atmosfer ve çok katmanlı ambalaj denemeleri\n3) 12 aylık hızlandırılmış raf ömrü testi\n4) Sonuç raporu ve uygulama önerileri',
        '## Süre ve bedel',
        `12 ay · ${fmtTL(480_000)} (KDV hariç) · TÜBİTAK 1505 kapsamında başvuru önerilir.`,
      ].join('\n\n'),
      approvals: [],
    },
    {
      id: 'cd3', projectId: 'p1', type: 'sozlesme', title: 'Üniversite–sanayi iş birliği sözleşmesi', body: contractText(p1Ctx), source: 'template', by: 'tto', byName: CAKU_TTO, at: ago(19),
      approvals: [
        { party: 'tto', name: CAKU_TTO, at: ago(19) },
        { party: 'cozucu', name: AYSE, at: ago(18.6) },
        { party: 'firma', name: ILGAZ, at: ago(18.2) },
      ],
    },
    // p2 · tamamlandı
    {
      id: 'cd4', projectId: 'p2', type: 'teklif', title: 'Teklif · atık ısı geri kazanımı etüdü', fileName: 'teklif-atik-isi-etudu.pdf', size: 268_000, mime: 'application/pdf', source: 'upload', by: 'cozucu', byName: HAKAN, at: ago(109),
      approvals: [],
    },
    {
      id: 'cd5', projectId: 'p2', type: 'sozlesme', title: 'Üniversite–sanayi iş birliği sözleşmesi', body: contractText(p2Ctx), source: 'template', by: 'tto', byName: CAKU_TTO, at: ago(101),
      approvals: [
        { party: 'tto', name: CAKU_TTO, at: ago(101) },
        { party: 'firma', name: CMAK, at: ago(100.5) },
        { party: 'cozucu', name: HAKAN, at: ago(100.2) },
      ],
    },
    {
      id: 'cd6', projectId: 'p2', type: 'ara', title: 'Ara rapor · baca gazı ölçümleri', fileName: 'ara-rapor-baca-gazi-olcumleri.pdf', size: 1_240_000, mime: 'application/pdf', source: 'upload', by: 'cozucu', byName: HAKAN, at: ago(60),
      approvals: [],
    },
    {
      id: 'cd7', projectId: 'p2', type: 'sonuc', title: 'Sonuç raporu · %18 doğalgaz tasarrufu', fileName: 'sonuc-raporu-rekuperator.pdf', size: 2_870_000, mime: 'application/pdf', source: 'upload', by: 'cozucu', byName: HAKAN, at: ago(20),
      body: [
        '# SONUÇ RAPORU (ÖZET)',
        `Konu: ${p2Ctx.subject}\nHazırlayan: ${HAKAN} · ÇAKÜ Makine Müh.`,
        '## Bulgular',
        'Baca gazı sıcaklığı 220 °C ölçülmüştür; fırın yalıtımında iki bölgede ısı kaybı tespit edilmiştir.',
        '## Öneri ve kazanım',
        'Baca gazından taze havaya reküperatör uygulamasıyla yıllık yaklaşık %18 doğalgaz tasarrufu öngörülmektedir. Geri ödeme süresi yaklaşık 14 aydır.',
      ].join('\n\n'),
      approvals: [],
    },
  ],
};

