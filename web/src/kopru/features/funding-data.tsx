/**
 * Destek programları: program listesi (örnek bilgiler), başvuru modeli, örnek veri ve işlem kancası (ext anahtarı: 'funding').
 * Oran, bütçe ve tarihler ÖRNEKTİR; resmî çağrı duyurusu esas alınmalıdır.
 */
import { useMemo } from 'react';
import { uid } from '@/lib/utils';
import { PERSONAS, firmOf, isTechFirm, localTtos, cityOfFirm, orgOf, ttoName, type Funding, type KopruState, type Project, type Role } from '../data';
import { firmInbox, useKopru } from '../store';

export const DAY = 86_400_000;

/* -------------------------------- Programlar ------------------------------- */

export type ProgramId = '1505' | '1501' | '1507' | 'kosgeb' | 'ka';

export interface Program {
  id: ProgramId;
  name: string;
  short: string;
  agency: string;
  summary: string;
  who: string;
  duration: string;
  budget: string;
  /** Bugüne göre sonraki çağrı son tarihi (gün); null = sürekli açık */
  nextInDays: number | null;
  /** Üniversite ortağı gerekli mi */
  needsAcademic: boolean;
  checklist: string[];
  color: string;
}

export const PROGRAMS: Program[] = [
  {
    id: '1505', name: 'TÜBİTAK 1505 Üniversite-Sanayi İşbirliği', short: 'TÜBİTAK 1505', agency: 'TÜBİTAK',
    summary: 'Üniversitede üretilen bilginin firma ihtiyacına dönük bir Ar-Ge projesiyle sanayiye aktarılmasını destekler.',
    who: 'Firma (müşteri kuruluş) + üniversite yürütücüsü; başvuru TTO üzerinden yapılır.',
    duration: 'Yaklaşık 12–24 ay (örnek)', budget: 'Yaklaşık 300 bin – 1,5 milyon ₺ (örnek)',
    nextInDays: 12, needsAcademic: true, color: '#2563EB',
    checklist: ['Proje önerisi formu', 'Bütçe tablosu', 'Akademisyen yürütücü onayı', 'Firma imza sirküleri', 'TTO onay yazısı'],
  },
  {
    id: '1501', name: 'TÜBİTAK 1501 Sanayi Ar-Ge Projeleri Destekleme', short: 'TÜBİTAK 1501', agency: 'TÜBİTAK',
    summary: 'Firmaların yeni ürün veya süreç geliştirmeye yönelik Ar-Ge projelerine hibe desteği; üniversiteden danışman alınabilir.',
    who: 'Türkiye’de yerleşik sermaye şirketleri (her ölçekte).',
    duration: 'En fazla yaklaşık 36 ay (örnek)', budget: 'Proje bütçesine göre değişir; yaklaşık 500 bin – 5 milyon ₺ (örnek)',
    nextInDays: 40, needsAcademic: false, color: '#7C3AED',
    checklist: ['Proje öneri formu', 'Bütçe ve personel planı', 'Firma faaliyet belgesi', 'Ar-Ge altyapı bilgileri', 'Son yıl mali tabloları'],
  },
  {
    id: '1507', name: 'TÜBİTAK 1507 KOBİ Ar-Ge Başlangıç Destek', short: 'TÜBİTAK 1507', agency: 'TÜBİTAK',
    summary: 'İlk kez Ar-Ge projesi yapacak KOBİ’lerin rekabet öncesi Ar-Ge projelerini destekler.',
    who: 'Daha önce TÜBİTAK Ar-Ge desteği almamış KOBİ’ler.',
    duration: 'Yaklaşık 12–18 ay (örnek)', budget: 'Yaklaşık 600 bin – 1 milyon ₺ üst sınır (örnek)',
    nextInDays: 26, needsAcademic: false, color: '#0EA5E9',
    checklist: ['Proje önerisi', 'KOBİ beyannamesi', 'Bütçe tablosu', 'Proje personeli özgeçmişleri'],
  },
  {
    id: 'kosgeb', name: 'KOSGEB Ar-Ge ve İnovasyon Destek Programı', short: 'KOSGEB Ar-Ge', agency: 'KOSGEB',
    summary: 'KOBİ’lerin yeni ürün, süreç ve hizmet geliştirme projelerine geri ödemeli ve hibe destek.',
    who: 'KOSGEB veri tabanına kayıtlı KOBİ’ler; üniversite danışmanlığı eklenebilir.',
    duration: 'Yaklaşık 6–24 ay (örnek)', budget: 'Yaklaşık 1–3 milyon ₺’ye kadar (örnek)',
    nextInDays: null, needsAcademic: false, color: '#16A34A',
    checklist: ['İş planı / proje formu', 'KOBİ bilgi beyannamesi', 'Maliyet ve bütçe tablosu', 'Vergi ve SGK borcu yoktur yazısı', 'Danışman akademisyen protokolü'],
  },
  {
    id: 'ka', name: 'Kalkınma Ajansı Mali Destek Programı', short: 'Kalkınma Ajansı', agency: 'Bölgesel kalkınma ajansı',
    summary: 'Bölgesel rekabetçiliği artıran üretim, verimlilik ve altyapı projelerine dönemsel çağrılarla eş finansmanlı hibe.',
    who: 'Bölgedeki işletmeler, OSB’ler, üniversiteler ve kamu kurumları (çağrıya göre).',
    duration: 'Yaklaşık 9–18 ay (örnek)', budget: 'Yaklaşık 250 bin – 2 milyon ₺, eş finansman gerekir (örnek)',
    nextInDays: 68, needsAcademic: false, color: '#F59E0B',
    checklist: ['Başvuru formu', 'Bütçe ve eş finansman tablosu', 'Ortaklık beyannamesi', 'Fiyat teklifleri ve mevcut durum fotoğrafları'],
  },
];

export const programOf = (id: string) => PROGRAMS.find((p) => p.id === id)!;
/** Bir sonraki son tarih (zaman damgası) — gün sonuna yuvarlı; sürekli açıksa null */
export const nextDeadline = (p: Program, now = Date.now()) => {
  if (p.nextInDays == null) return null;
  const d = new Date(now + p.nextInDays * DAY);
  d.setHours(17, 0, 0, 0);
  return d.getTime();
};

/** Projenin finansman seçiminden program */
export const programFromFunding = (f?: Funding): ProgramId | null => (f === 'tubitak1505' ? '1505' : f === 'tubitak1501' ? '1501' : f === 'kosgeb' ? 'kosgeb' : null);

/* ---------------------------------- Model ---------------------------------- */

export type AppStatus = 'hazirlik' | 'basvuruldu' | 'on_degerlendirme' | 'panel' | 'kabul' | 'ret' | 'revizyon';

export interface FundingEvent {
  at: number;
  actor: string;
  text: string;
}

export interface FundingApp {
  id: string;
  programId: ProgramId;
  projectId?: string;
  needId?: string;
  /** Başvuran firma */
  applicant: string;
  academicId?: string;
  title: string;
  status: AppStatus;
  budget: number;
  checklist: { id: string; label: string; done: boolean }[];
  events: FundingEvent[];
  /** Başvurunun son tarihi; null = sürekli açık */
  deadline: number | null;
  createdAt: number;
}

export interface FundingState {
  apps: FundingApp[];
}

export const APP_FLOW: AppStatus[] = ['hazirlik', 'basvuruldu', 'on_degerlendirme', 'panel'];

export const APP_STATUS: Record<AppStatus, { label: string; tone: string }> = {
  hazirlik: { label: 'Hazırlık', tone: 'bg-amber-50 text-amber-700 ring-amber-200' },
  basvuruldu: { label: 'Başvuruldu', tone: 'bg-blue-50 text-blue-700 ring-blue-200' },
  on_degerlendirme: { label: 'Ön değerlendirme', tone: 'bg-violet-50 text-violet-700 ring-violet-200' },
  panel: { label: 'Panel', tone: 'bg-primary-50 text-primary-700 ring-primary-200' },
  kabul: { label: 'Kabul', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  ret: { label: 'Ret', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
  revizyon: { label: 'Revizyon', tone: 'bg-orange-50 text-orange-700 ring-orange-200' },
};

/** Başvurunun sonraki adımları (düğme adı → yeni durum) */
export const NEXT: Partial<Record<AppStatus, { to: AppStatus; label: string; tone?: 'primary' | 'secondary' | 'danger' }[]>> = {
  hazirlik: [{ to: 'basvuruldu', label: 'Başvuruldu olarak işaretle' }],
  basvuruldu: [{ to: 'on_degerlendirme', label: 'Ön değerlendirmeye al' }],
  on_degerlendirme: [{ to: 'panel', label: 'Panele al' }],
  panel: [
    { to: 'kabul', label: 'Kabul edildi' },
    { to: 'revizyon', label: 'Revizyon istendi', tone: 'secondary' },
    { to: 'ret', label: 'Reddedildi', tone: 'danger' },
  ],
  revizyon: [{ to: 'basvuruldu', label: 'Revizyonu gönder' }],
};

export const checklistFor = (programId: ProgramId, doneCount = 0) =>
  programOf(programId).checklist.map((label, i) => ({ id: `c${i + 1}`, label, done: i < doneCount }));
export const progressOf = (a: FundingApp) => (a.checklist.length ? Math.round((a.checklist.filter((c) => c.done).length / a.checklist.length) * 100) : 0);

/* -------------------------------- Örnek veri ------------------------------- */

export function fundingSeed(now = Date.now()): FundingState {
  const ago = (d: number) => now - d * DAY;
  const dl = (id: ProgramId) => nextDeadline(programOf(id), now);
  return {
    apps: [
      {
        id: 'fa1', programId: '1505', projectId: 'p1', needId: 'n1', applicant: 'f2', academicId: 'a3',
        title: 'Kuru fasulye paketlerinde raf ömrü ve böceklenme sorunu', status: 'basvuruldu', budget: 480_000,
        checklist: checklistFor('1505', 5), deadline: dl('1505'), createdAt: ago(16),
        events: [
          { at: ago(16), actor: 'ÇAKÜ TTO', text: 'TÜBİTAK 1505 başvuru dosyası açıldı' },
          { at: ago(11), actor: 'Prof. Dr. Ayşe Demir', text: 'Yürütücü onayı verildi' },
          { at: ago(8), actor: 'ÇAKÜ TTO', text: 'TTO onay yazısı eklendi · kontrol listesi tamamlandı' },
          { at: ago(7), actor: 'ÇAKÜ TTO', text: 'Durum: Başvuruldu' },
        ],
      },
      {
        id: 'fa2', programId: '1505', needId: 'n7', applicant: 'f6', academicId: 'a11',
        title: 'Çelik dökümde sıcak yırtılma çatlaklarının azaltılması', status: 'hazirlik', budget: 650_000,
        checklist: checklistFor('1505', 2), deadline: dl('1505'), createdAt: ago(8),
        events: [
          { at: ago(8), actor: 'KBÜ TTO', text: 'TÜBİTAK 1505 başvuru dosyası açıldı' },
          { at: ago(5), actor: 'Prof. Dr. Orhan Güneş', text: 'Proje önerisi formu taslağı yüklendi' },
          { at: ago(3), actor: 'Demirçelik Döküm Ltd.', text: 'Bütçe tablosu tamamlandı' },
        ],
      },
      {
        id: 'fa3', programId: '1501', needId: 'n3', applicant: 'f4', academicId: 'a5',
        title: 'Yüksek rPET oranlı şişelerde mukavemet ve renk iyileştirme', status: 'on_degerlendirme', budget: 1_200_000,
        checklist: checklistFor('1501', 5), deadline: dl('1501'), createdAt: ago(30),
        events: [
          { at: ago(30), actor: 'Anka Plastik Ambalaj', text: 'TÜBİTAK 1501 başvurusu hazırlanmaya başlandı' },
          { at: ago(18), actor: 'KÜ TTO', text: 'Dr. Öğr. Üyesi Zeynep Çelik danışman olarak eklendi' },
          { at: ago(14), actor: 'Anka Plastik Ambalaj', text: 'Durum: Başvuruldu' },
          { at: ago(4), actor: 'KÜ TTO', text: 'Durum: Ön değerlendirme' },
        ],
      },
      {
        id: 'fa4', programId: '1507', applicant: 't0',
        title: 'Hat içi OEE tahmini için uç cihazda çalışan yapay zekâ modülü', status: 'panel', budget: 900_000,
        checklist: checklistFor('1507', 4), deadline: dl('1507'), createdAt: ago(60),
        events: [
          { at: ago(60), actor: 'Orion Yazılım', text: 'TÜBİTAK 1507 başvurusu hazırlanmaya başlandı' },
          { at: ago(45), actor: 'Orion Yazılım', text: 'Durum: Başvuruldu' },
          { at: ago(30), actor: 'ÇAKÜ TTO', text: 'Durum: Ön değerlendirme' },
          { at: ago(6), actor: 'ÇAKÜ TTO', text: 'Durum: Panel · sunum tarihi bekleniyor' },
        ],
      },
      {
        id: 'fa5', programId: 'kosgeb', applicant: 'f1', academicId: 'a1',
        title: 'Sfero dökümde gözenek azaltma için simülasyon destekli yolluk tasarımı', status: 'hazirlik', budget: 750_000,
        checklist: checklistFor('kosgeb', 3), deadline: null, createdAt: ago(6),
        events: [
          { at: ago(6), actor: 'Kuzey Döküm San. A.Ş.', text: 'KOSGEB Ar-Ge başvurusu hazırlanmaya başlandı' },
          { at: ago(4), actor: 'Doç. Dr. Elif Arslan', text: 'Danışmanlık kapsamı ve iş planı taslağı paylaşıldı' },
        ],
      },
      {
        id: 'fa6', programId: 'ka', applicant: 'f7',
        title: 'Panel hattında toz ve emisyon izleme altyapısı', status: 'kabul', budget: 820_000,
        checklist: checklistFor('ka', 4), deadline: ago(120), createdAt: ago(170),
        events: [
          { at: ago(170), actor: 'Kastamonu Ahşap Panel', text: 'Kalkınma Ajansı başvurusu hazırlanmaya başlandı' },
          { at: ago(121), actor: 'Kastamonu Ahşap Panel', text: 'Durum: Başvuruldu' },
          { at: ago(60), actor: 'KÜ TTO', text: 'Durum: Kabul · sözleşme imzalandı' },
        ],
      },
      {
        id: 'fa7', programId: '1507', applicant: 'f5',
        title: 'Tarım makinesi şanzıman gövdesinde hafifletilmiş tasarım', status: 'ret', budget: 540_000,
        checklist: checklistFor('1507', 4), deadline: ago(140), createdAt: ago(190),
        events: [
          { at: ago(190), actor: 'Çankırı Makine Sanayi', text: 'TÜBİTAK 1507 başvurusu hazırlanmaya başlandı' },
          { at: ago(141), actor: 'Çankırı Makine Sanayi', text: 'Durum: Başvuruldu' },
          { at: ago(80), actor: 'ÇAKÜ TTO', text: 'Durum: Ret · yenilikçilik gerekçesi güçlendirilerek yeniden başvurulabilir' },
        ],
      },
    ],
  };
}

/* --------------------------------- Kapsam ---------------------------------- */

export const applicantOf = (role: Role): string | null => (role === 'firma' ? PERSONAS.firma.firmId : role === 'tfirma' ? PERSONAS.tfirma.firmId : null);

/** Başvuruyla ilgili TTO'lar (üniversite kimlikleri) */
export function ttosOf(state: KopruState, a: FundingApp): string[] {
  const set = new Set<string>();
  const ac = a.academicId ? state.academics.find((x) => x.id === a.academicId) : undefined;
  if (ac) set.add(ac.orgId);
  const proj = a.projectId ? state.projects.find((p) => p.id === a.projectId) : undefined;
  const need = state.needs.find((n) => n.id === (a.needId ?? proj?.needId));
  if (need) (need.ttoOrg ? [need.ttoOrg] : need.ttoIds).forEach((u) => set.add(u));
  if (proj) {
    const solver = state.academics.find((x) => x.id === proj.solverId);
    if (solver) set.add(solver.orgId);
  }
  const firm = firmOf(a.applicant);
  if (isTechFirm(firm)) {
    const u = orgOf(firm.orgId).universityId;
    if (u) set.add(u);
  }
  if (!set.size) localTtos(cityOfFirm(a.applicant)).forEach((u) => set.add(u));
  return [...set];
}

/** Başvuruya dahil akademisyen: doğrudan veya bağlı projenin yürütücüsü */
export function academicOfApp(state: KopruState, a: FundingApp): string | undefined {
  if (a.academicId) return a.academicId;
  const proj = a.projectId ? state.projects.find((p) => p.id === a.projectId) : undefined;
  return proj?.kind === 'academic' ? proj.solverId : undefined;
}

export function appInScope(state: KopruState, role: Role, a: FundingApp): boolean {
  switch (role) {
    case 'firma':
    case 'tfirma':
      return a.applicant === applicantOf(role);
    case 'akademisyen':
      return academicOfApp(state, a) === PERSONAS.akademisyen.academicId;
    case 'tto':
      return ttosOf(state, a).includes(state.orgSel.tto);
    case 'osb':
      return firmOf(a.applicant).orgId === state.orgSel.osb;
    case 'teknokent':
      return firmOf(a.applicant).orgId === state.orgSel.teknokent;
    default:
      return true;
  }
}

/** Kontrol listesini işaretleyebilir: başvuran firma, dahil akademisyen, ilgili TTO */
export const canEditChecklist = (state: KopruState, role: Role, a: FundingApp) =>
  (role === 'firma' || role === 'tfirma' || role === 'akademisyen' || role === 'tto') && appInScope(state, role, a) && a.status !== 'kabul' && a.status !== 'ret';

/** Durum güncelleme: TTO tümü; başvuran firma yalnızca hazırlık/revizyon → başvuruldu */
export function canMove(state: KopruState, role: Role, a: FundingApp, to: AppStatus): boolean {
  if (!appInScope(state, role, a)) return false;
  if (role === 'tto') return true;
  if (role === 'firma' || role === 'tfirma') return to === 'basvuruldu' && (a.status === 'hazirlik' || a.status === 'revizyon');
  return false;
}

/** Başvuru oluşturabilir mi (proje kartından): firma (kendi projesi) veya TTO */
export const canCreateFor = (state: KopruState, role: Role, p: Project) => {
  const need = state.needs.find((n) => n.id === p.needId);
  if (!need) return false;
  if (role === 'tto') return true;
  return (role === 'firma' || role === 'tfirma') && need.firmId === applicantOf(role);
};

/* ---------------------------------- Kanca ---------------------------------- */

export interface NewApp {
  programId: ProgramId;
  projectId?: string;
  applicant: string;
  title: string;
  budget: number;
}

export function useFunding() {
  const k = useKopru();
  const seed = useMemo(() => fundingSeed(), []);
  const data = k.ext<FundingState>('funding', seed);
  const set = (fn: (prev: FundingState) => FundingState) => k.setExt<FundingState>('funding', seed, fn);

  const actor = () => (k.role === 'tto' ? ttoName(k.state.orgSel.tto) : k.role === 'akademisyen' ? k.me.name : k.role === 'firma' || k.role === 'tfirma' ? firmOf(applicantOf(k.role)!).name : k.me.name);
  const linkOf = (a: FundingApp) => (a.projectId ? `projeler/${a.projectId}` : 'destek');

  /** Firma, çözüm sağlayıcı (akademisyen) ve TTO'lar — kendi kutusu hariç */
  const notifyParties = (a: FundingApp, text: string) => {
    const ac = academicOfApp(k.state, a);
    const proj = a.projectId ? k.state.projects.find((p) => p.id === a.projectId) : undefined;
    const to = [firmInbox(a.applicant), ...(ac ? [`academic:${ac}`] : []), ...(proj?.kind === 'firm' ? [firmInbox(proj.solverId)] : []), ...ttosOf(k.state, a).map((u) => `tto:${u}`)];
    const list = [...new Set(to)].filter((x) => x !== k.inbox.key);
    if (list.length) k.notify(list, text, linkOf(a), 'funding');
  };

  const patch = (id: string, fn: (a: FundingApp) => Partial<FundingApp>, eventText?: string) => {
    const at = Date.now();
    const who = actor();
    set((prev) => ({ apps: prev.apps.map((a) => (a.id === id ? { ...a, ...fn(a), events: eventText ? [...a.events, { at, actor: who, text: eventText }] : a.events } : a)) }));
  };

  return {
    data,
    create(input: NewApp): string {
      const id = uid('fa');
      const proj = input.projectId ? k.state.projects.find((p) => p.id === input.projectId) : undefined;
      const p = programOf(input.programId);
      const app: FundingApp = {
        id, programId: input.programId, projectId: input.projectId, needId: proj?.needId, applicant: input.applicant,
        academicId: proj?.kind === 'academic' ? proj.solverId : undefined,
        title: input.title, status: 'hazirlik', budget: input.budget, checklist: checklistFor(input.programId),
        deadline: nextDeadline(p), createdAt: Date.now(),
        events: [{ at: Date.now(), actor: actor(), text: `${p.short} başvuru dosyası açıldı` }],
      };
      set((prev) => ({ apps: [app, ...prev.apps] }));
      notifyParties(app, `${p.short} başvurusu başlatıldı: ${app.title}`);
      return id;
    },
    toggle(id: string, itemId: string) {
      const a = data.apps.find((x) => x.id === id);
      const item = a?.checklist.find((c) => c.id === itemId);
      if (!a || !item) return;
      const done = !item.done;
      patch(id, (x) => ({ checklist: x.checklist.map((c) => (c.id === itemId ? { ...c, done } : c)) }), `${item.label}: ${done ? 'tamamlandı' : 'yeniden açıldı'}`);
      const after = a.checklist.filter((c) => (c.id === itemId ? done : c.done)).length;
      if (done && after === a.checklist.length) notifyParties(a, `Kontrol listesi tamamlandı, başvuru gönderilmeye hazır: ${a.title}`);
    },
    move(id: string, to: AppStatus) {
      const a = data.apps.find((x) => x.id === id);
      if (!a) return;
      patch(id, () => ({ status: to }), `Durum: ${APP_STATUS[to].label}`);
      notifyParties(a, `${programOf(a.programId).short} başvuru durumu: ${APP_STATUS[to].label} · ${a.title}`);
    },
  };
}

/* --------------------------------- Biçim ----------------------------------- */

export const daysLeft = (t: number, now = Date.now()) => Math.ceil((t - now) / DAY);
export const fmtDay = (t: number) => new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
