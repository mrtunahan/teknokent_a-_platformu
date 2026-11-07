# TeknoMatch — Teknokent Firma Eşleştirme Platformu

Teknokentlerdeki firmaları "ne sunuyorum / ne arıyorum" beyanlarına göre eşleştiren B2B iş birliği platformu:
API, web arayüzü ve embedding servisi.
Kartlar uyum skoruna göre sıralanır; eşleşme ancak iki taraf da ilgilendiğinde açılır.

| Bileşen | Klasör | Teknoloji |
| --- | --- | --- |
| API | `src/` | Node.js 20+ · Express 5 · MongoDB (Mongoose) · Socket.IO · JWT · node-cron · multer |
| Web arayüzü | `web/` | React 18 · TypeScript · Vite · Tailwind · Framer Motion · Three.js · Socket.IO istemcisi (duyarlı; ayrıntılar `web/README.md`) |
| Embedding servisi | `embedding-service/` | Python · FastAPI · sentence-transformers (Türkçe destekli çok dilli model) |
| Dosya deposu | — | Yerel disk veya S3 uyumlu (AWS S3, MinIO, Cloudflare R2, DigitalOcean Spaces) |

Bu depo, ürün belgesindeki **MVP kapsamını** uygular:

- [x] Kurumsal e-posta ile kayıt (gmail/hotmail vb. reddedilir), vergi numarası (VKN) kontrolü, e-posta doğrulama, teknokent onayı
- [x] Profil: temel bilgiler, etiketler, en fazla 5 sunuyorum / 5 arıyorum, belgeler, referanslar, profil tamamlama yüzdesi
- [x] Kural tabanlı uyum skoru + açıklama metni benzerliği (opsiyonel embedding servisi)
- [x] Kaydırma akışı, karşılıklı eşleşme, "neden bu firma" etiketleri
- [x] Eşleşme içi mesajlaşma (REST + gerçek zamanlı) ve toplantı talebi (takvim slotu önerisi)
- [x] 2 hafta sonra "iş sonucu" sorusu
- [x] Teknokent paneli: firma onayı, toplu yükleme, eşleşme/toplantı/sonuç metrikleri, CSV dışa aktarma, talep–arz boşluğu, ağ haritası
- [x] Logo ve belge dosyası yükleme (içerik doğrulamalı; belgeleri yalnızca onaylı firmalar görüntüler)
- [x] Web arayüzü: kart akışı (sürükle/klavye/buton), firma detayı, eşleşmeler, sohbet ve toplantı, profil, teknokent paneli

MVP dışı bırakılanlar (belgeye göre): ödeme, premium, ihtiyaç ilanları akışı, NDA/e-imza, teknokentler arası ağ, ML ranking,
eşleşme günü planlayıcı, akademisyen profilleri. *Süper ilgi* kodda hazır, `FEATURE_SUPER_LIKE=true` ile açılır.

---

## Hızlı başlangıç (yerel)

```bash
cp .env.example .env          # MONGODB_URI, JWT_SECRET vb. düzenleyin
npm install
SEED_ADMIN_EMAIL=admin@kurum.com.tr SEED_ADMIN_PASSWORD='GucluSifre123!' npm run seed   # etiketler + teknokent + super admin
npm run seed:demo             # (opsiyonel) 3 örnek firma: admin@demo1.example.com / Demo12345!
npm run dev                   # API: http://localhost:4000
```

Web arayüzü (ayrı terminalde; `/api`, `/files`, `/socket.io` isteklerini 4000'e yönlendirir):

```bash
cd web && npm install && npm run dev   # http://localhost:5173
```

Embedding servisi (isteğe bağlı; ayrıntılar `embedding-service/README.md`):

```bash
cd embedding-service && docker build -t teknomatch-embedding . && docker run -p 8000:8000 teknomatch-embedding
# API tarafında: EMBEDDING_SERVICE_URL=http://localhost:8000
```

Üretimde `cd web && npm run build` sonrası API, `web/dist`'i aynı adresten servis eder (`SERVE_FRONTEND=true`).
Arayüz `/` adresinde tanıtım sayfasını, `/app` altında gerçek uygulamayı, `/demo` altında giriş gerektirmeyen örnek veri demosunu sunar.
Sağlık kontrolü: `GET /health`

SMTP ayarlanmamışsa e-postalar (doğrulama bağlantısı vb.) konsola yazılır.

## Bulut sunucuya kurulum

### Seçenek A — Docker Compose (API + web arayüzü + MongoDB + embedding servisi tek sunucuda)

```bash
cp .env.example .env
# .env içinde: NODE_ENV=production, JWT_SECRET (openssl rand -hex 48), CORS_ORIGINS, APP_URL, SMTP_*
# ve MONGO_ROOT_PASSWORD ekleyin
docker compose up -d --build
docker compose exec api node scripts/seed.js
```

API imajı web arayüzünü de derleyip içerir; tarayıcıdan aynı adres açılır. Embedding servisi ~1 GB bellek kullanır
(ilk derlemede model imaja indirilir). Küçük bir sunucudaysanız `embedding` servisini compose dosyasından kaldırıp
`EMBEDDING_SERVICE_URL`'yi boş bırakın; skorlama yerleşik metin benzerliğiyle çalışmaya devam eder. Yüklenen dosyalar
`uploads` hacminde tutulur; birden fazla sunucuya geçerken `STORAGE_DRIVER=s3` kullanın.

Uygulama yalnızca `127.0.0.1:4000` üzerinde dinler; önüne TLS sonlandıran bir reverse proxy koyun (nginx örneği):

```nginx
server {
  server_name teknomatch.example.com;
  client_max_body_size 12m;   # belge yükleme sınırı (10 MB) + pay
  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    # Socket.IO için
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
  # listen 443 ssl; ... (certbot ile)
}
```

### Seçenek B — Yönetilen MongoDB (ör. MongoDB Atlas) + Node süreci

`MONGODB_URI`'yi Atlas bağlantı dizesiyle verin; uygulamayı `npm ci --omit=dev && npm start` ile (pm2/systemd veya
Docker imajıyla) çalıştırın.

**Notlar**

- `TRUST_PROXY` reverse proxy arkasında gerçek istemci IP'si için gereklidir (rate limit buna dayanır). Tek proxy için `1`.
- Birden fazla API örneği çalıştıracaksanız zamanlanmış işleri yalnızca birinde açın (`ENABLE_JOBS=true`), diğerlerinde
  `ENABLE_JOBS=false`; ya da işleri `npm run jobs` ile ayrı süreçte çalıştırın. Socket.IO'yu çok örnekli çalıştırmak için
  yapışkan oturum (sticky session) ya da Socket.IO Redis adaptörü gerekir.
- Üretimde `JWT_SECRET` en az 32 karakter değilse uygulama başlamaz.

## Mimari

```
src/
  app.js, server.js, socket.js     Express uygulaması, HTTP + Socket.IO sunucusu
  config/                          ortam değişkenleri, MongoDB bağlantısı
  constants/                       iş birliği türleri, aşamalar, belge türleri, etiket kataloğu
  models/                          Mongoose şemaları (belgedeki veri modeli)
  services/
    scoring.js                     uyum skoru (saf fonksiyonlar)
    ranking.js                     akış seçimi: %80 en iyi / %20 keşif, popülerlik sönümlemesi
    queue.js                       aday kuyruğu hesaplama (gece toplu + profil güncellemesinde)
    feed.js, matching.js           günlük akış, kaydırma, karşılıklı eşleşme
    cards.js                       kart / detay görünümleri ve görünürlük kuralları
    embedding.js                   Python embedding servisi istemcisi
    storage.js                     dosya depolama (yerel / S3) ve içerik türü doğrulama
    mail.js, realtime.js, tokens.js
  routes/                          auth, companies, feed/swipes, matches, reports, tags, technoparks, panel
  jobs/                            gece kuyruk hesaplama, süresi dolan ihtiyaçlar, iş sonucu sorusu
scripts/seed.js, recompute.js, reembed.js
tests/unit, tests/integration
web/src/
  live/                            gerçek uygulama: api.ts, auth.tsx, socket.ts, LiveShell, CompanySheet
  live/pages/                      AuthPages, Overview, Discover, Matches, Messages, Profile, Account, Panel
  pages/                           Landing, Kvkk
  demo/, store/, services/         giriş gerektirmeyen örnek veri demosu
  components/                      ortak tasarım sistemi (ui, layout, discover, match, dashboard, three, landing)
embedding-service/app/             FastAPI servisi ve kodlayıcılar
```

### Belgedeki mimariden farklar

| Belge önerisi | Bu uygulama | Neden |
| --- | --- | --- |
| Spring Boot + PostgreSQL/pgvector | Node.js/Express + MongoDB | Ekibin tercih ettiği yığın |
| Redis aday önbelleği | `candidatequeues` koleksiyonu | Teknokent başına yüzlerce firma için MongoDB yeterli; ek altyapı yok. Ölçek büyürse Redis'e taşınabilir |
| Python embedding servisi | `embedding-service/` (FastAPI + sentence-transformers), bağlanması isteğe bağlı | Bağlanmazsa yerleşik Türkçe metin benzerliği (TF kosinüs) kullanılır |
| RabbitMQ / Spring Scheduler | node-cron | MVP için yeterli |
| S3 dosya deposu | Yerel disk veya S3 uyumlu depo (`STORAGE_DRIVER`) | Tek sunucuda disk yeterli; dosyalar API üzerinden servis edildiği için bucket herkese açık olmak zorunda değil |
| React Native mobil | Duyarlı web | Belgede MVP için yeterli görülüyor |

Embedding servisi sözleşmesi: `POST {EMBEDDING_SERVICE_URL}/embed` gövde `{ "texts": ["..."] }` → `{ "embeddings": [[...]], "model": "..." }`.

## Eşleştirme algoritması

**1. Sert filtreler** (geçemeyen hiç gösterilmez): bölge tercihi (aynı teknokent / aynı şehir / Türkiye), zorunlu belgeler
(geçerlilik tarihiyle), iki yönlü engelleme, rakip sektörler, son 90 gün içinde sola kaydırılanlar, zaten ilgi gösterilen veya
eşleşilen firmalar, onaysız / incelemedeki / pasif profiller.

**2. Uyum skoru** (`src/services/scoring.js`)

```
S(A,B) = 0.7 · min(s_AB, s_BA) + 0.3 · max(s_AB, s_BA)
s_A→B  = Σ w_k · f_k(N_A, O_B)
```

| Bileşen | Hesaplama | Ağırlık |
| --- | --- | --- |
| Yetkinlik ↔ ihtiyaç | 0.7 × etiket (0.7 kapsama + 0.3 Jaccard; aynı etiket 1, üst/kardeş etiket 0.5) + 0.3 × metin benzerliği | 0.40 |
| İş birliği türü | aynı 1, uyumlu 0.5 (ör. taşeron ↔ ortak AR-GE) | 0.15 |
| Sektör | Jaccard | 0.10 |
| Ölçek / aşama | startup / KOBİ / kurumsal kural tablosu (kurumsal ihtiyaç ↔ startup = 1) | 0.10 |
| Konum | aynı teknokent 1, aynı şehir 0.6, diğer 0.3 (şubeler dahil) | 0.10 |
| Aciliyet + tazelik | 0.5 × aciliyet (bu ay 1, bu çeyrek 0.7, genel 0.4) + 0.5 × profil tazeliği (30 gün 1 → 180 gün 0) | 0.10 |
| Güven | 0.5 × teknokent onayı + 0.5 × olumlu geri bildirim oranı (Laplace düzeltmeli) | 0.05 |

**3. Sıralama:** günde en fazla 20 kart; ~%80 en yüksek skor, ~%20 orta skor diliminden keşif; son 7 gündeki gösterim
sayısına göre logaritmik popülerlik sönümlemesi. Gün içinde gösterilip kaydırılmayan kartlar tekrar döner.

**4. Öğrenme için veri:** her `swipe` kaydı o anki skoru (`scoreAtTime`, iki yönlü bileşenler, keşif kartı olup olmadığı)
saklar; `outcome` koleksiyonu hedef değişkendir.

**Gizlilik:** "yalnızca eşleşince görünür" ihtiyaçlar skora katılır ama kartta ve gerekçelerde gösterilmez; eşleşince firma
detayında açılır. Tek taraflı ilgi karşı tarafa gösterilmez.

## API özeti (`/api/v1`)

Kimlik doğrulama: `Authorization: Bearer <token>`

| Yöntem | Yol | Açıklama |
| --- | --- | --- |
| POST | `/auth/register` | Kayıt (kurumsal e-posta, VKN, teknokent, KVKK onayı) |
| POST | `/auth/verify-email` · `/auth/resend-verification` | E-posta doğrulama |
| POST | `/auth/login` | JWT al |
| POST | `/auth/forgot-password` · `/auth/reset-password` | Şifre sıfırlama |
| POST | `/auth/accept-invite` | Firma davetini kabul et |
| GET/PATCH/DELETE | `/auth/me` | Hesabım; DELETE = KVKK hesap silme |
| GET | `/meta` | Seçenek listeleri ve limitler |
| GET | `/technoparks` · `/tags?type=` | Herkese açık listeler |
| GET/PATCH | `/companies/me` | Profilim (tamamlama yüzdesi dahil) |
| PUT | `/companies/me/offers` · `/needs` · `/certificates` · `/references` | Beyanlar (en fazla 5'er) |
| POST/DELETE | `/companies/me/logo` | Logo yükle (multipart `file`; PNG/JPEG/WEBP, ≤2 MB) — `GET /files/logos/:ad` ile herkese açık servis edilir |
| POST/DELETE | `/companies/me/certificates/:certId/document` | Belge dosyası (PDF/PNG/JPEG, ≤10 MB) |
| GET | `/companies/:id/certificates/:certId/document` | Belge dosyasını indir (yalnızca onaylı, engellenmemiş firmalar) |
| GET/POST/PATCH/DELETE | `/companies/me/members`, `/companies/me/invitations` | Ekip ve roller |
| POST/DELETE | `/companies/me/blocks/:id` | Engelleme |
| GET | `/companies/:id` | Firma detayı |
| GET | `/feed` | Günlük kart akışı |
| POST | `/swipes` | `{targetCompanyId, direction: right\|left\|super}` |
| GET | `/matches` · `/matches/pending-outcomes` · `/matches/:id` | Eşleşmeler |
| GET/POST | `/matches/:id/messages` | Mesajlaşma |
| POST/PATCH | `/matches/:id/meetings[/:meetingId]` | Toplantı öner / kabul / reddet / iptal / tamamla |
| PUT | `/matches/:id/outcome` | İş sonucu (görüşüldü / teklif / sözleşme / sonuçsuz) |
| POST | `/reports` | Raporla (3 farklı rapor → inceleme) |
| GET | `/panel/companies` · `/panel/companies/inactive` | Firma yönetimi |
| POST | `/panel/companies/:id/review` · `/moderate` · `/panel/companies/import` | Onay, moderasyon, toplu yükleme |
| GET | `/panel/stats` · `/panel/stats/export.csv` | Metrikler ve dışa aktarma |
| GET | `/panel/supply-demand` · `/panel/network` · `/panel/reports` | Talep–arz boşluğu, ağ haritası, raporlar |
| POST/PATCH | `/technoparks`, `/technoparks/:id/admins`, `/tags` | Platform yöneticisi |

**Socket.IO:** `io(url, { auth: { token } })`. Sunucu olayları: `match:new`, `message:new`, `meeting:proposed`,
`meeting:updated`, `interest:super`. İstemci: `match:join {matchId}`, `match:typing {matchId}`.

**Roller:** `company_admin` (profili düzenler, davet eder), `company_member` (kaydırır, mesajlaşır),
`technopark_admin` (kendi teknokentinin paneli), `super_admin` (platform).

**Dosyalar:** türü istemcinin bildirdiği MIME'a değil dosyanın ilk baytlarına bakılarak belirlenir; SVG kabul edilmez
(betik içerebilir). Belgeler güncellenirken mevcut belgenin `id`'si gönderilirse yüklü dosyası korunur.

**Kötüye kullanıma karşı:** günlük sağa kaydırma limiti, günlük yeni sohbet başlatma limiti, ilk mesajda dış bağlantı yasağı,
raporlama/engelleme, IP bazlı rate limit.

## Testler

```bash
npm run test:unit                                    # skorlama, sıralama, yardımcılar (Jest, veritabanı gerekmez)
TEST_MONGODB_URI=mongodb://127.0.0.1:27017 npm test # + uçtan uca API akışı
```

Entegrasyon testleri Node'un yerleşik test koşucusuyla (`node:test` + `expect`) çalışır: MongoDB sürücüsünün el sıkışma
metadata'sı Jest'in vm sandbox'ında bozulduğu için Jest yalnızca birim testlerde kullanılır. `TEST_MONGODB_URI` verilmezse
entegrasyon testleri `mongodb-memory-server` ile geçici bir MongoDB indirir.
GitHub Actions (`.github/workflows/ci.yml`) testleri `mongo:7` servisiyle çalıştırır.
