# TeknoOrtak — Teknokent Firma Eşleştirme Platformu

Nov 3, 2026 · @Cansu

## Özet ve problem

TeknoOrtak (çalışma adı), teknokentlerdeki firmaları "ne sunuyorum / ne arıyorum" beyanlarına göre eşleştiren, Tinder benzeri kaydırma arayüzüne sahip bir B2B iş birliği platformudur. Kartlar rastgele değil, uyum skoruna göre sıralanır; eşleşme ancak iki taraf da ilgilendiğinde açılır.

**Problem:** Aynı binada çalışan firmalar çoğu zaman birbirinin ne yaptığını bilmez. Tanışma; etkinliklere, kişisel çevreye ve tesadüfe bağlıdır. Sonuçta:

- Bir firma dışarıdan pahalıya aldığı hizmeti iki kat üstteki firmadan alabilecekken bunu bilmez.
- TÜBİTAK ve KOSGEB projelerinde alt yüklenici, Horizon Europe gibi çağrılarda konsorsiyum ortağı bulmak haftalar sürer.
- Teknokent yönetimleri firmalar arası iş birliğini artırmakla yükümlüdür ama bunu ölçecek ve tetikleyecek araçları yoktur.

**Çözüm:** Yapılandırılmış profiller, kriter tabanlı uyum skoru, karşılıklı onaylı eşleşme ve eşleşme sonrası iş sonucunu takip eden bir döngü.

## Hedef kullanıcılar

Platformun üç kullanıcı tipi var. Firmalar ürünü kullanır; teknokent yönetimi büyük ihtimalle parayı öder.

| Persona | Kim | Ne istiyor | Platformda ne yapar |
| --- | --- | --- | --- |
| Startup kurucusu | 2–10 kişilik, ön kuluçka veya erken aşama firma | Pilot müşteri, yatırımcı, ucuz ve hızlı yetkinlik | Kaydırır, eşleşir, demo toplantısı ister |
| KOBİ iş geliştirme sorumlusu | 20–200 kişilik, ürünü olan firma | Taşeron, tedarikçi, ortak proje paydaşı | Filtreyle arar, ihtiyaç ilanı açar |
| Kurumsal / AR-GE merkezi | Büyük firmanın teknokentteki birimi | Açık inovasyon, startup ile POC | "Meydan okuma" (challenge) yayınlar, başvuruları değerlendirir |
| Teknokent yönetimi | Teknokent A.Ş., TTO | İş birliği sayısını artırmak ve raporlamak | Paneli izler, etkinlik ve eşleşme günleri düzenler |
| Akademisyen / TTO (ileri faz) | Üniversite öğretim üyesi | Sanayi ortağı, danışmanlık | Uzmanlık profili açar |

## Firma profili

Eşleşmenin kalitesi profilin yapılandırılmış olmasına bağlı. Serbest metin tek başına yetmez; her alan seçilebilir etiketlerden oluşur, açıklama metni ise ek sinyal olarak kullanılır.

**Temel bilgiler**

- Firma adı, logo, kuruluş yılı, çalışan aralığı (1–5, 6–20, 21–50, 50+)
- Teknokent ve şehir (birden fazla şube olabilir)
- Sektör etiketleri (sağlık, savunma, fintech, enerji, tarım, eğitim…)
- Teknoloji etiketleri (yapay zekâ, görüntü işleme, gömülü sistem, IoT, blokzincir…)
- Aşama: fikir, MVP, ilk müşteri, büyüme, olgun
- Belgeler: ISO 9001/27001, AR-GE merkezi, tasarım merkezi, tesis güvenlik belgesi, patentler
- Referans projeler ve müşteriler (isteğe bağlı, gizlenebilir)

**"Sunuyorum" beyanı** — en fazla 5 madde. Her madde: yetkinlik etiketi + iş birliği türü + kısa açıklama. Örnek: *"Görüntü işleme — taşeron / proje bazlı — endüstriyel kalite kontrol için hata tespiti modelleri geliştiriyoruz."*

**"Arıyorum" beyanı** — en fazla 5 madde. Her madde: ihtiyaç etiketi + iş birliği türü + aciliyet (bu ay / bu çeyrek / genel ilgi) + bütçe aralığı (isteğe bağlı) + görünürlük (herkese açık / yalnızca eşleşince).

**İş birliği türleri:** taşeronluk/hizmet alımı, ortak AR-GE projesi veya proje içinde alt yüklenicilik (TÜBİTAK 1501, 1507, 1511, KOSGEB, Horizon Europe), ortak ürün, tedarik/distribütörlük, yatırım, mentorluk, personel/stajyer paylaşımı, ekipman/laboratuvar paylaşımı.

**İhtiyaç ilanı (opsiyonel):** Kalıcı "arıyorum" beyanından ayrı, süresi olan somut talep. Örnek: *"Horizon Europe çağrısı için 15 Aralık'a kadar donanım ortağı arıyoruz."* İlanlar akışta öne çıkar ve süresi dolunca kapanır.

## Eşleşme kriterleri ve puanlama

Eşleşme iki aşamada hesaplanır: önce sert filtreler elenir, sonra kalan adaylar ağırlıklı bir uyum skoruyla sıralanır. Skor yönlüdür: A'nın aradığı ile B'nin sunduğu ayrı, B'nin aradığı ile A'nın sunduğu ayrı hesaplanır.

**1. Sert filtreler (geçemeyen hiç gösterilmez)**

- Kullanıcının bölge tercihi (aynı teknokent / aynı şehir / Türkiye)
- Zorunlu işaretlenmiş belgeler (ör. savunma projesi için tesis güvenlik belgesi)
- Engellenen firmalar ve rakip olarak işaretlenen sektörler
- Daha önce sola kaydırılmış firmalar (90 gün sonra tekrar gösterilebilir)

**2. Uyum skoru**

İki yönlü skor, iki yönün ağırlıklı ortalamasıdır; tek taraflı ilgiyi cezalandırmak için zayıf yön daha fazla ağırlık alır:

```latex
S(A,B) = \alpha \cdot \min(s_{A\to B}, s_{B\to A}) + (1-\alpha) \cdot \max(s_{A\to B}, s_{B\to A}), \quad \alpha = 0.7
```

Tek yönlü skor (A'nın ihtiyacının B tarafından karşılanma derecesi) bileşenlerin ağırlıklı toplamıdır. N\_A, A'nın "arıyor" maddelerini; O\_B, B'nin "sunuyor" maddelerini gösterir; ağırlıkların toplamı 1'dir:

```latex
s_{A\to B} = \sum_{k} w_k \cdot f_k(N_A, O_B)
```

| Bileşen | Nasıl hesaplanır | Başlangıç ağırlığı |
| --- | --- | --- |
| Yetkinlik ↔ ihtiyaç | Etiket kesişimi (Jaccard) + açıklama metinlerinin embedding benzerliği (kosinüs) | 0.40 |
| İş birliği türü uyumu | Aynı tür = 1, uyumlu tür (ör. taşeron ↔ ortak proje) = 0.5 | 0.15 |
| Sektör yakınlığı | Sektör etiketi kesişimi | 0.10 |
| Ölçek / aşama uyumu | Kural tablosu (ör. kurumsal ↔ startup POC için yüksek) | 0.10 |
| Konum | Aynı teknokent 1, aynı şehir 0.6, diğer 0.3 | 0.10 |
| Aciliyet ve tazelik | Aktif ihtiyaç ilanı, son 30 gün içinde güncellenmiş profil | 0.10 |
| Güven sinyali | Doğrulanmış profil, eşleşme sonrası olumlu geri bildirim oranı | 0.05 |

**3. Sıralama ve keşif**

- Akıştaki kartların \~%80'i en yüksek skora göre, \~%20'si keşif için orta skor aralığından gelir; böylece sistem yalnızca bildiğini tekrarlamaz.
- Bir firmaya günde gösterilen kart sayısı sınırlanır (ör. 20). Bu hem kaliteyi hem de geri dönüş isteğini artırır.
- Çok popüler firmaların herkesin akışında boğulmaması için gösterim sayısına göre hafif bir sönümleme uygulanır.

**4. Öğrenme (ileri faz)**

Başlangıçta ağırlıklar elle verilir. Yeterli veri biriktiğinde (ör. 500+ eşleşme ve sonuç geri bildirimi) hedef değişken "eşleşme toplantıya / işe dönüştü mü" olarak alınır; ağırlıklar gradient boosting veya bir learning-to-rank modeliyle öğrenilir. Kararların açıklanabilir olması için SHAP ile "bu firmayı neden görüyorsun" etiketleri üretilebilir: *"Aradığınız görüntü işleme yetkinliği · aynı teknokent · aktif proje ortağı ilanı"*.

## Kullanıcı akışı ve ekranlar

Firma kayıttan iş sonucuna kadar yedi adımdan geçer; normal kaydırmada tek taraflı ilgi karşı tarafa gösterilmez (Süper ilgi ve ilana başvuru bilinçli istisnalardır), firma akışa devam eder.

&#91;embedded content: kullanıcı akışı · 7 adım, 1 karar\]

İş sonucu cevabı döngüyü kapatır: hangi eşleşmelerin işe dönüştüğü, sonraki kartların sıralamasını belirler.

**Ana ekranlar**

1. **Kart akışı:** firma logosu, ad, teknokent, uyum yüzdesi, "neden bu firma" etiketleri, karşılıklı sunuyorum/arıyorum özeti. Butonlar: *Şimdilik değil*, *İlgileniyorum*, *Süper ilgi* (günde 1, kısa not eklenir).
2. **Firma detayı:** kartı yukarı kaydırınca tam profil, belgeler, referanslar.
3. **Eşleşmeler:** eşleşme listesi, okunmamış mesajlar, bekleyen toplantılar.
4. **Sohbet:** mesajlaşma, toplantı önerisi (takvim slotu), belge paylaşımı.
5. **İhtiyaç ilanları:** aktif ilanlar, filtreler; ilana "ilgileniyorum" demek doğrudan eşleşme talebi oluşturur.
6. **Profilim:** profil tamamlama yüzdesi ve skora etkisi, sunuyorum/arıyorum düzenleme.
7. **Teknokent paneli (web):** ayrıca aşağıda.

**Kart üzerindeki eşleşme gerekçesi örneği:** *%87 uyum · Aradığınız: görüntü işleme · Onların aradığı: saha testi (sizde var) · Aynı teknokent*

## Güven, doğrulama ve gizlilik

B2B'de tek bir sahte veya spam profil platformun itibarını bitirir. Bu yüzden doğrulama girişte yapılır, sonradan değil.

**Doğrulama katmanları**

1. Kurumsal e-posta doğrulaması (gmail/hotmail kabul edilmez)
2. Vergi numarası ve unvan kontrolü
3. Teknokent onayı: teknokent yönetimi, kendi firma listesine göre firmayı onaylar. Onaylı firmalar rozet alır.
4. Firma içi roller: yönetici (profili düzenler), üye (kaydırır, mesajlaşır)

**Gizlilik**

- "Arıyorum" maddeleri için *yalnızca eşleşince görünür* seçeneği. Rekabet kaygısı olan firma ihtiyacını herkese ilan etmeden eşleşebilir. Bu maddeler skora katılır ama karttaki "neden bu firma" etiketlerinde gösterilmez.
- Normal kaydırmada kimin kimi sağa kaydırdığı gösterilmez; yalnızca karşılıklı eşleşme açığa çıkar. Süper ilgi ve ihtiyaç ilanına başvuru, kullanıcının bilerek seçtiği tek taraflı sinyallerdir.
- Belirli firmaları veya sektörleri engelleme.
- Eşleşme sonrası belge paylaşımı için standart bir gizlilik sözleşmesi (NDA) şablonu, platform içinde e-imzayla.
- KVKK: kişisel veri yalnızca firma temsilcisinin iletişim bilgisiyle sınırlı tutulur; aydınlatma metni, açık rıza ve hesap silme akışı baştan tasarlanır.

**Kötüye kullanıma karşı**

- Günlük sağa kaydırma ve ilk mesaj limiti (spam satışçıyı engeller)
- Raporla / engelle; 3 rapor alan profil incelemeye düşer
- İlk mesajda dış link sınırı

## Teknokent yönetim paneli

Panel, platformu teknokente satmanın ana gerekçesi: yönetim, iş birliğini ilk kez ölçebilir hale gelir.

- **Firma yönetimi:** firma listesini toplu yükleme, profil onayı, pasif firmaları hatırlatma
- **Ağ haritası:** firmalar düğüm, eşleşmeler kenar; hangi sektörlerin birbirine bağlandığı ve hangi firmaların yalnız kaldığı görünür
- **Talep–arz boşluğu:** "en çok aranan ama teknokentte en az sunulan" yetkinlikler. Bu, yeni firma kabulü ve kuluçka programı için doğrudan veri sağlar.
- **Raporlar:** aylık eşleşme, toplantı, iş sonucu sayıları; bakanlık ve yönetim kurulu raporları için dışa aktarma (PDF/Excel)
- **Eşleşme günü:** yönetim bir tarih seçer, sistem en yüksek skorlu çiftleri 20 dakikalık yüz yüze görüşme slotlarına yerleştirir
- **Duyuru ve çağrılar:** TÜBİTAK/KOSGEB çağrılarını yayınlama, ilgili firmalara hedefli bildirim
- **Teknokentler arası ağ (ileri faz):** iki teknokentin firmalarının birbirini görmesine izin veren karşılıklı anlaşma

## İş modeli ve gelir

Ana öneri: teknokentlere yıllık lisans (B2B2B), firmalara ücretsiz temel kullanım. Firmalardan doğrudan abonelik almak başta ağ etkisini öldürür; ağ büyüdükten sonra premium katman eklenir.

| Gelir kalemi | Kim öder | Ne alır | Ne zaman |
| --- | --- | --- | --- |
| Teknokent lisansı | Teknokent yönetimi | Kendi firmaları için platform, panel, raporlar, eşleşme günleri | MVP sonrası, ilk pilotla |
| Firma premium | Firma | Günlük kart limiti artışı, anonim profil görüntülenme istatistikleri, öne çıkan ihtiyaç ilanı, teknokentler arası görünürlük | Ağ 2+ teknokente ulaşınca |
| Kurumsal challenge | Büyük firma | Startup'lara açık inovasyon çağrısı yayınlama ve başvuru yönetimi | Ağ olgunlaşınca |
| Etkinlik / eşleşme günü | Teknokent veya sponsor | Organizasyon ve slot planlama | Pilotla birlikte |
| Başarı ücreti (opsiyonel) | Firma | Platform üzerinden kapanan projede küçük bir pay | Değerlendirilecek; takibi zor |

Fiyatlar pilot görüşmelerinde netleşmeli; açık soru: teknokentlerin bu tür yazılım için bütçe kalemi var mı, yoksa hibe/proje desteğiyle mi finanse ediliyor?

**Finansman fırsatı:** Projenin kendisi TÜBİTAK 1512 (BiGG) veya teknokent kuluçka programlarıyla başlatılabilir (BiGG'nin girişimci uygunluk koşulları, ör. mevcut şirket ortaklığı, önceden kontrol edilmeli); algoritma kısmı akademik bir çalışmaya da dönüşebilir.

## Teknik mimari ve veri modeli

Öneri: Java/Spring Boot monolit + PostgreSQL (pgvector ile) + ayrı bir Python eşleştirme servisi. Mikroservis MVP için gereksiz karmaşıklık; yalnızca ML kısmı Python'da ayrılır.

**Bileşenler**

| Bileşen | Teknoloji | Görevi |
| --- | --- | --- |
| Mobil + web istemci | React Native (veya Flutter) + React web | Kaydırma arayüzü mobilde, panel ve profil düzenleme web'de |
| Ana API | Spring Boot, REST + WebSocket | Kimlik, profil, kaydırma, eşleşme, mesajlaşma, bildirim |
| Veritabanı | PostgreSQL + pgvector | İlişkisel veri + profil açıklama embedding'leri |
| Eşleştirme servisi | Python, FastAPI, sentence-transformers (Türkçe destekli model) | Embedding üretimi, aday skoru hesaplama, ileride ranking modeli |
| Aday önbelleği | Redis | Her firma için günlük önceden hesaplanmış kart kuyruğu |
| Arka plan işleri | Spring Scheduler veya kuyruk (RabbitMQ) | Gece toplu skor hesaplama, bildirim, ilan süresi kapatma |
| Kimlik | Spring Security + JWT, ileride teknokent SSO | Firma içi roller, teknokent yöneticisi rolü |
| Dosya | S3 uyumlu depolama | Logo, belge, NDA |

**Skor hesaplama stratejisi:** Skorlar her kaydırmada anlık hesaplanmaz. Gece toplu iş, her firma için en iyi \~200 adayı hesaplayıp Redis'e yazar. Profil güncellenince yalnızca o firmanın kuyruğu yeniden hesaplanır. Teknokent başına firma sayısı çoğunlukla yüzlerle sınırlı olduğu için bu, ilk yıllarda rahatça ölçeklenir.

**Veri modeli (temel tablolar)**

| Tablo | Önemli alanlar |
| --- | --- |
| `company` | id, ad, vergi\_no, teknokent\_id, çalışan\_aralığı, aşama, doğrulandı\_mı, açıklama, açıklama\_embedding |
| `technopark` | id, ad, şehir, lisans\_durumu |
| `user` | id, company\_id, e-posta, rol (admin/üye/teknokent\_yönetici) |
| `tag` | id, tür (sektör/teknoloji/yetkinlik), ad, üst\_etiket\_id |
| `offer` | id, company\_id, tag\_id, iş\_birliği\_türü, açıklama |
| `need` | id, company\_id, tag\_id, iş\_birliği\_türü, aciliyet, bütçe\_aralığı, görünürlük, bitiş\_tarihi |
| `certificate` | id, company\_id, tür, geçerlilik\_tarihi |
| `swipe` | id, kaydıran\_company\_id, hedef\_company\_id, yön (sağ/sol/süper), skor\_o\_an, zaman |
| `match` | id, company\_a\_id, company\_b\_id, skor, oluşturulma, durum |
| `message` | id, match\_id, gönderen\_user\_id, içerik, zaman |
| `meeting` | id, match\_id, zaman, tür (yüz yüze/online), durum |
| `outcome` | id, match\_id, sonuç (görüşüldü/teklif/sözleşme/sonuçsuz), tahmini\_değer, zaman |

`swipe` tablosuna o anki skorun yazılması önemli: ileride ranking modelini eğitirken "hangi skorla gösterildi, nasıl tepki verildi" verisi hazır olur. `outcome` tablosu da modelin asıl hedef değişkeni.

## Başarı metrikleri

Kuzey yıldızı metriği: **ayda gerçekleşen eşleşme sonrası toplantı sayısı.** Eşleşme sayısı tek başına yanıltıcıdır; kimse görüşmüyorsa platform işe yaramıyor demektir.

| Metrik | Ne ölçer | Pilot hedefi (öneri, doğrulanmalı) |
| --- | --- | --- |
| Profil tamamlama oranı | Kayıt olan firmaların kullanılabilir profili var mı | Kayıtlı firmaların %70'i |
| Haftalık aktif firma | Gerçek kullanım | Teknokentteki firmaların %30'u |
| Sağa kaydırma oranı | Gösterilen kartların ne kadar ilgi çektiği; algoritma kalitesi | %15–30 arası |
| Eşleşme → mesaj oranı | Eşleşmelerin konuşmaya dönmesi | %50 |
| Mesaj → toplantı oranı | Gerçek iş potansiyeli | %25 |
| Toplantı → iş sonucu | Teklif veya sözleşme | Pilot sonunda en az 10 belgeli iş birliği |

Sağa kaydırma oranı çok yüksekse kartlar ayırt edici değildir; çok düşükse eşleşme kalitesi kötüdür. İki uç da sinyaldir.

## Riskler ve çözümler

En büyük risk teknik değil, sosyal: boş platform ve oyuncak algısı.

| Risk | Neden önemli | Çözüm |
| --- | --- | --- |
| Soğuk başlangıç | Kimse yoksa kimse gelmez | Tek teknokentle pilot; yönetimin desteğiyle firma listesinden profilleri önceden doldurma, firmalar yalnızca onaylar |
| "Tinder" algısı ciddiyetsiz bulunur | Kurumsal firmalar uzak durabilir | Arayüz kaydırma mantığını korur ama dil ve tasarım profesyonel olur; "İlgileniyorum / Şimdilik değil" butonları da sunulur |
| Firmalar ihtiyacını yazmaz | Eşleşmenin hammaddesi eksik kalır | Gizli ihtiyaç seçeneği, hazır şablonlar, profil tamamlama yüzdesi ve skora etkisi |
| Spam satışçılar | Güveni hızla bitirir | Doğrulama, günlük limit, raporlama, ilk mesajda doğrudan satış teklifini yasaklayan kullanım kuralı |
| Eşleşme oluyor ama iş olmuyor | Değer kanıtlanamaz | Eşleşme sonrası toplantı önerisi, 2 hafta sonra sonuç sorusu, teknokent eşleşme günleri |
| Teknokentlerin yazılım bütçesi yok | Gelir modeli çöker | Pilotu ücretsiz/maliyetine yap, ölçülebilir sonuçla ikinci yıl lisansı sat; hibe destekli satın almayı araştır |
| Rakipler / alternatifler | Mevcut teknokent portalları, LinkedIn | Fark: yapılandırılmış ihtiyaç–yetkinlik eşleşmesi ve teknokent paneli. Mevcut teknokent portallarının ne sunduğu pilot öncesi incelenmeli |

## MVP kapsamı ve yol haritası

MVP tek bir teknokentte, 8–10 haftada, kural tabanlı skorla çıkabilir. ML ve premium özellikler veri biriktikten sonra gelir.

**MVP'de olanlar**

- [ ] Kurumsal e-posta ile kayıt, teknokent onayı
- [ ] Profil: temel bilgiler, etiketler, en fazla 5 sunuyorum / 5 arıyorum
- [ ] Kural tabanlı uyum skoru + açıklama metni embedding benzerliği
- [ ] Kaydırma akışı, karşılıklı eşleşme, "neden bu firma" etiketleri
- [ ] Eşleşme içi mesajlaşma ve toplantı talebi
- [ ] 2 hafta sonra "iş sonucu" sorusu
- [ ] Basit teknokent paneli: firma onayı, eşleşme ve toplantı sayıları

**MVP'de olmayanlar:** ödeme, premium, ihtiyaç ilanları, Süper ilgi, NDA/e-imza, teknokentler arası ağ, ML ranking, eşleşme günü planlayıcı, akademisyen profilleri.

**Fazlar**

1. **Keşif (2–3 hafta):** 2–3 teknokent yönetimi ve 15–20 firmayla görüşme; en çok aranan iş birliği türlerini ve panel ihtiyaçlarını doğrula. Pilot teknokenti seç.
2. **MVP (8–10 hafta):** yukarıdaki kapsam; web paneli + mobil kaydırma (MVP'de mobil yerine duyarlı web de yeterli olabilir).
3. **Pilot (3 ay):** tek teknokent, önceden doldurulmuş profiller, ayda bir eşleşme günü (MVP'de planlayıcı olmadığı için elle organize edilir). Metrikleri haftalık izle.
4. **Ürünleşme:** teknokent lisansı, ihtiyaç ilanları, NDA, eşleşme günü planlayıcı, ikinci ve üçüncü teknokent.
5. **Ağ ve zekâ:** teknokentler arası görünürlük, öğrenen ranking modeli, firma premium, kurumsal challenge.

**İlk somut adım:** Bir teknokent yönetimiyle 30 dakikalık görüşme. Asıl soru: "Firmalar arası iş birliğini bugün nasıl ölçüyor ve raporluyorsunuz?"
