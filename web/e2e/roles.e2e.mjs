/**
 * Uçtan uca rol testi: gerçek API + gerçek MongoDB + derlenmiş arayüz + gerçek tarayıcı.
 *
 * Ön koşul (CI'da hazırlanır):
 *   npm run seed:demo  (SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD ile platform yöneticisi + 3 demo firma)
 *   API, web/dist'i E2E_BASE adresinden sunuyor; SMTP ayarlı değil.
 *
 * Kapsam: firma, teknokent yöneticisi ve platform yöneticisi akışları.
 * Her adımda sayfa hatası, konsol hatası veya 5xx yanıt varsa test başarısız olur.
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE || 'http://127.0.0.1:4000';
const SUPER = { email: process.env.E2E_SUPER_EMAIL || 'platform@teknoortak.test', password: process.env.E2E_SUPER_PASSWORD || 'Platform123!' };
const DEMO1 = { email: 'admin@demo1.example.com', password: 'Demo12345!', name: 'Vizyon Görüntü Teknolojileri' };
const NEW = { email: 'ceo@yenifirma.com.tr', password: 'YeniFirma123!', name: 'Yeni Firma Teknoloji A.Ş.', person: 'Ayşe Yılmaz' };
const TPADMIN = { email: 'yonetici@teknokent.edu.tr', password: 'Yonetici123!', name: 'Teknokent Yöneticisi' };
const ART = new URL('./artifacts/', import.meta.url).pathname;
mkdirSync(ART, { recursive: true });

/** Kontrol haneli geçerli VKN */
function vkn(seed) {
  const d = String(seed).padStart(9, '0').split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const t = (d[i] + (9 - i)) % 10;
    let v = (t * 2 ** (9 - i)) % 9;
    if (t !== 0 && v === 0) v = 9;
    sum += v;
  }
  return d.join('') + ((10 - (sum % 10)) % 10);
}

const results = [];
const problems = [];
let current = '';

function watch(page, who) {
  page.on('pageerror', (e) => problems.push(`[${who}] sayfa hatası (${current}): ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    // Beklenen 4xx yanıtların tarayıcı günlüğü (ör. yanlış şifre denemesi) hata sayılmaz; 5xx ayrıca yakalanır
    if (/Failed to load resource: the server responded with a status of 4\d\d/.test(t)) return;
    problems.push(`[${who}] konsol hatası (${current}): ${t}`);
  });
  page.on('response', (r) => {
    if (r.status() >= 500) problems.push(`[${who}] ${r.status()} ${r.request().method()} ${r.url()} (${current})`);
  });
}

async function step(name, page, fn) {
  current = name;
  const before = problems.length;
  try {
    await fn();
    if (problems.length > before) throw new Error(problems.slice(before).join('\n'));
    results.push(`✔ ${name}`);
    console.log(`✔ ${name}`);
  } catch (e) {
    results.push(`✘ ${name}`);
    console.log(`✘ ${name}\n  ${String(e.message).split('\n').slice(0, 6).join('\n  ')}`);
    await page?.screenshot({ path: `${ART}${results.length.toString().padStart(2, '0')}-${name.replace(/[^\p{L}\d]+/gu, '-')}.png`, fullPage: true }).catch(() => {});
    throw e;
  }
}

async function login(page, { email, password }) {
  await page.goto(`${BASE}/giris`);
  await page.fill('#l-email', email);
  await page.fill('#l-pass', password);
  await page.getByRole('button', { name: /Giriş yap/ }).click();
  await page.waitForURL(/\/app/);
}

async function logout(page) {
  await page.goto(`${BASE}/app/account`);
  await page.getByRole('button', { name: 'Çıkış yap' }).first().click();
  await page.waitForURL(/\/giris/);
}

const browser = await chromium.launch();
const mk = async (who) => {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  watch(page, who);
  return page;
};

let exitCode = 0;
try {
  const p = await mk('ana');

  await step('Ana sayfa ve demo açılıyor', p, async () => {
    await p.goto(BASE);
    await p.getByRole('heading', { name: /Doğru Eşleşmeyi/ }).waitFor();
    await p.goto(`${BASE}/demo/discover`);
    await p.locator('article[aria-label$="firma kartı"]').first().waitFor();
  });

  await step('Firma: kayıt (kurumsal e-posta, VKN, teknokent, KVKK)', p, async () => {
    await p.goto(`${BASE}/kayit`);
    await p.fill('#r-name', NEW.person);
    await p.fill('#r-email', 'kisisel@gmail.com');
    await p.fill('#r-pass', NEW.password);
    await p.getByRole('button', { name: /Devam/ }).click();
    await p.getByText(/Kurumsal e-posta kullanın/).waitFor();
    await p.fill('#r-email', NEW.email);
    await p.getByRole('button', { name: /Devam/ }).click();
    await p.fill('#r-company', NEW.name);
    await p.fill('#r-vkn', vkn(555000111));
    await p.getByRole('option').first().click();
    await p.getByRole('button', { name: /Devam/ }).click();
    await p.locator('input[type=checkbox]').first().check();
    await p.getByRole('button', { name: 'Kaydı tamamla' }).click();
    await p.getByText('Neredeyse hazır').waitFor();
  });

  await step('Firma: e-posta doğrulanmadan giriş engellenir, tekrar gönderme sunulur', p, async () => {
    await p.goto(`${BASE}/giris`);
    await p.fill('#l-email', NEW.email);
    await p.fill('#l-pass', NEW.password);
    await p.getByRole('button', { name: /Giriş yap/ }).click();
    await p.getByText(/e-posta adresinizi doğrulayın/i).waitFor();
    await p.getByRole('button', { name: /Doğrulama e-postasını tekrar gönder/ }).click();
    await p.getByText(/yeni doğrulama bağlantısı gönderildi/).waitFor();
  });

  let setupLink = '';
  await step('Platform yöneticisi: giriş, teknokent listesi, yönetici ekleme (kurulum bağlantısı)', p, async () => {
    await login(p, SUPER);
    await p.waitForURL(/\/app\/panel/);
    await p.getByRole('tab', { name: 'Platform' }).click();
    await p.getByRole('heading', { name: 'Teknokentler' }).waitFor();
    await p.getByText('Yönetici atanmamış').first().waitFor();
    await p.selectOption('#pa-tp', { index: 1 });
    await p.fill('#pa-fn', TPADMIN.name);
    await p.fill('#pa-em', TPADMIN.email);
    await p.getByRole('button', { name: 'Ekle ve davet et' }).click();
    const input = p.locator('input[aria-label$="için şifre belirleme bağlantısı"]');
    await input.waitFor();
    setupLink = await input.inputValue();
    if (!/\/reset-password\?token=/.test(setupLink)) throw new Error(`Beklenmeyen kurulum bağlantısı: ${setupLink}`);
    await p.getByText('şifre belirlemedi').first().waitFor();
  });

  await step('Platform yöneticisi: teknokent düzenleme ve etiket ekleme', p, async () => {
    await p.getByRole('button', { name: 'Düzenle' }).first().click();
    await p.selectOption('#ed-lic', 'active');
    await p.getByRole('button', { name: 'Kaydet' }).click();
    await p.getByText('Teknokent güncellendi').waitFor();
    await p.getByText('Aktif lisans').first().waitFor();
    await p.fill('input[aria-label="Yeni etiket adı"]', 'Kuantum Algılama');
    await p.getByRole('button', { name: 'Etiket ekle' }).click();
    await p.getByText(/etiketi eklendi/).waitFor();
    await logout(p);
  });

  await step('Teknokent yöneticisi: kurulum bağlantısıyla şifre belirleme ve giriş', p, async () => {
    await p.goto(setupLink.replace(/^https?:\/\/[^/]+/, BASE));
    await p.fill('#rp-pass', TPADMIN.password);
    await p.getByRole('button', { name: 'Kaydet' }).click();
    await p.getByText('Şifreniz güncellendi.').waitFor();
    await login(p, TPADMIN);
    await p.waitForURL(/\/app\/panel/);
    await p.getByText('Toplantı (kuzey yıldızı)').waitFor();
  });

  await step('Teknokent yöneticisi: firma detayı, e-postayı doğrulanmış sayma, onay', p, async () => {
    await p.getByRole('tab', { name: 'Firmalar' }).click();
    await p.getByRole('button', { name: NEW.name }).click();
    await p.getByRole('dialog', { name: 'Firma detayı' }).waitFor();
    await p.getByText(NEW.email).waitFor();
    await p.getByRole('button', { name: 'E-postayı doğrulanmış say' }).click();
    await p.getByText('E-posta doğrulandı').waitFor();
    await p.getByRole('dialog', { name: 'Firma detayı' }).getByRole('button', { name: 'Onayla' }).click();
    await p.getByText('Firma onaylandı').waitFor();
    await p.getByRole('dialog', { name: 'Firma detayı' }).getByText('Onaylı').first().waitFor();
    await p.keyboard.press('Escape');
    await logout(p);
  });

  await step('Firma: giriş, genel bakış, profil (sunuyorum maddesi)', p, async () => {
    await login(p, NEW);
    await p.getByText(/Hoş geldiniz/).waitFor();
    await p.goto(`${BASE}/app/profile`);
    await p.getByRole('tab', { name: 'Sunuyorum' }).click();
    await p.getByRole('button', { name: /Madde ekle/ }).click();
    await p.locator('input[placeholder="Etiket ara…"]').last().fill('Yaz');
    await p.locator('ul[role=listbox] button').first().click();
    await p.getByRole('button', { name: 'Kaydet' }).click();
    await p.getByText('Kaydedildi').first().waitFor();
  });

  await step('Firma: ekip daveti (SMTP yokken davet bağlantısı gösterilir)', p, async () => {
    await p.getByRole('tab', { name: 'Ekip' }).click();
    await p.getByLabel('Davet e-postası').fill('uye@yenifirma.com.tr');
    await p.getByRole('button', { name: 'Davet gönder' }).click();
    await p.locator('input[aria-label$="için davet bağlantısı"]').waitFor();
  });

  await step('Firma: keşif listesi, iş birliği kutucuğu, ilgi gönderme', p, async () => {
    await p.goto(`${BASE}/app/discover`);
    const card = p.locator(`article[aria-label="${DEMO1.name} firma kartı"]`);
    await card.waitFor();
    await p.getByRole('button', { name: /Ortak Ar.Ge/ }).first().click();
    await p.getByRole('button', { name: /Ortak Ar.Ge/ }).first().click();
    await card.getByRole('button', { name: /İlgileniyorum/ }).click();
    await card.getByText('İlgi gönderildi').waitFor();
  });

  const d = await mk('demo1');
  let matchUrl = '';
  await step('Demo firma: karşılıklı ilgi → eşleşme → mesaj', d, async () => {
    await login(d, DEMO1);
    await d.goto(`${BASE}/app/discover`);
    const card = d.locator(`article[aria-label="${NEW.name} firma kartı"]`);
    await card.waitFor();
    await card.getByRole('button', { name: /İlgileniyorum/ }).click();
    await d.getByText(/Eşleştiniz/).waitFor();
    await card.getByRole('button', { name: /Mesaj gönder/ }).click();
    await d.waitForURL(/\/app\/messages\/[a-f0-9]{24}/);
    matchUrl = d.url().replace(/^https?:\/\/[^/]+/, '');
    await d.getByRole('textbox', { name: 'Mesaj' }).fill('Merhaba, tanışalım.');
    await d.keyboard.press('Enter');
    await d.getByText('Merhaba, tanışalım.').waitFor();
  });

  await step('Firma: eşleşme listesi ve gerçek zamanlı mesajlaşma', p, async () => {
    await p.goto(`${BASE}/app/matches`);
    await p.getByText(DEMO1.name).first().waitFor();
    await p.goto(`${BASE}${matchUrl}`);
    await p.getByText('Merhaba, tanışalım.').waitFor();
    // Demo firmanın açık sohbetine anlık ulaşmalı
    await p.getByRole('textbox', { name: 'Mesaj' }).fill('Memnuniyetle, toplantı önereyim.');
    await p.keyboard.press('Enter');
    await d.getByText('Memnuniyetle, toplantı önereyim.').waitFor({ timeout: 10000 });
  });

  await step('Firma: toplantı önerme; demo firma kabul eder', p, async () => {
    await p.getByRole('button', { name: /Toplantı öner/ }).first().click();
    await p.getByRole('button', { name: /Öneriyi gönder/ }).click();
    await p.getByText('Toplantı önerisi gönderildi').waitFor();
    await d.reload();
    if (!(await d.getByRole('button', { name: 'Kabul et' }).first().isVisible())) {
      await d.getByRole('button', { name: 'Toplantılar ve iş sonucu' }).click();
    }
    await d.getByRole('button', { name: 'Kabul et' }).first().click();
    await d.getByText('Kabul edildi').first().waitFor();
  });

  await step('Firma: iş sonucu bildirimi', p, async () => {
    await p.goto(`${BASE}${matchUrl}?outcome=1`);
    await p.getByRole('dialog', { name: 'İş sonucu' }).waitFor();
    await p.getByRole('button', { name: 'Teklif verildi' }).click();
    await p.getByRole('dialog', { name: 'İş sonucu' }).getByRole('button', { name: 'Kaydet' }).click();
    await p.getByText('İş sonucu kaydedildi').waitFor();
  });

  await step('Firma: rapor ve engelleme; Hesabım’da engeli kaldırma', p, async () => {
    await p.goto(`${BASE}/app/discover`);
    const name = 'Anadolu Elektronik Sistemleri';
    await p.getByRole('button', { name: `${name} detayları` }).click();
    const sheet = p.getByRole('dialog', { name: `${name} detayları` });
    await sheet.getByRole('button', { name: 'Raporla' }).click();
    await p.getByRole('button', { name: /Raporu gönder/ }).click();
    await p.getByText('Raporunuz alındı').waitFor();
    await sheet.getByRole('button', { name: 'Engelle' }).click();
    await p.getByRole('dialog', { name: /engellensin mi/ }).getByRole('button', { name: 'Engelle' }).click();
    await p.getByText(`${name} engellendi`).waitFor();
    await p.goto(`${BASE}/app/account`);
    await p.getByText(name).waitFor();
    await p.getByRole('button', { name: 'Engeli kaldır' }).click();
    await p.getByText(`${name} engeli kaldırıldı`).waitFor();
    await logout(p);
  });

  await step('Teknokent yöneticisi: metrikler, raporlar, ağ haritası, CSV', p, async () => {
    await login(p, TPADMIN);
    await p.waitForURL(/\/app\/panel/);
    await p.getByText('Eşleşme', { exact: true }).first().waitFor();
    await p.getByRole('tab', { name: 'Raporlar' }).click();
    await p.getByText('Anadolu Elektronik Sistemleri').waitFor();
    await p.getByRole('tab', { name: 'Ağ haritası' }).click();
    await p.getByText(/eşleşme ·/).waitFor();
    await p.getByRole('tab', { name: 'Talep–arz boşluğu' }).click();
    await p.getByText('En çok aranan, en az sunulan yetkinlikler').waitFor();
    await p.getByRole('tab', { name: 'Genel bakış' }).click();
    const [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: /Excel\/CSV indir/ }).click()]);
    if (!/\.csv$/.test(dl.suggestedFilename())) throw new Error(`CSV bekleniyordu: ${dl.suggestedFilename()}`);
  });

  await step('Yetki: teknokent yöneticisi firma ekranlarına, firma paneline giremez', p, async () => {
    await p.goto(`${BASE}/app/discover`);
    await p.waitForURL(/\/app\/panel/);
    await logout(p);
    await login(p, NEW);
    await p.goto(`${BASE}/app/panel`);
    await p.waitForURL((u) => !u.pathname.startsWith('/app/panel'));
  });
} catch {
  exitCode = 1;
} finally {
  await browser.close();
}

console.log(`\n${results.filter((r) => r.startsWith('✔')).length}/${results.length} adım geçti`);
if (problems.length) console.log(`\nTespit edilen sorunlar:\n${problems.join('\n')}`);
process.exit(exitCode || (problems.length ? 1 : 0));
