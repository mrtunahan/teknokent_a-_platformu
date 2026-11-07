# TeknoMatch Premium Web — B2B Eşleşme Prototipi

> **Doğru İş Birliği, Doğru Eşleşmeyle Başlar.** · *Where Innovation Meets Opportunity.*

Teknokent firmalarının kaydırarak birbirini keşfettiği, karşılıklı beğenide eşleştiği ve mesajlaştığı etkileşimli web uygulaması.
Varsayılan olarak tarayıcıda çalışan demo verisiyle açılır; mevcut Express API'ye bağlanmaya hazırdır.

## Çalıştırma

```bash
cd web
npm install
npm run dev        # http://localhost:5174
npm run build      # tip kontrolü + üretim derlemesi (dist/)
```

Canlı API ile (`/api/v1`, proxy → `localhost:4000`):

```bash
VITE_DATA_SOURCE=http npm run dev
```

## Ekranlar

| Rota | Ekran |
| --- | --- |
| `/` | Landing: 3D ağ arka planı (Three.js), fareye duyarlı yüzen firma kartları, Nasıl Çalışır, Avantajlar, Öne Çıkan Firmalar, Başarı Hikâyeleri, CTA, footer |
| `/kayit` | 6 adımlı firma profili onboarding'i (ilerleme göstergesi, adım doğrulaması, canlı kart önizlemesi, kurumsal e-posta ve KVKK onayı) |
| `/app` | Dashboard: KPI kartları, görüntülenme alan grafiği, sektör halka grafiği, haftalık etkileşim, devam eden görüşmeler, önerilen firmalar |
| `/app/discover` | Kart destesi: sürükle (sağ = beğen, sol = geç, yukarı = detay), butonlar, klavye (← → ↑ Z), geri al, süper ilgi, filtre çekmecesi, uyum analizi paneli, tam ekran **IT'S A MATCH!** animasyonu |
| `/app/matches` | Eşleşmelerim (Tümü / Yeni / Görüşülen) |
| `/app/messages/:id` | Sohbet: okundu bilgisi, yazıyor göstergesi, dosya paylaşımı, görüşme planlama, eşleşme geçmişi, raporla/engelle |
| `/app/favorites`, `/app/notifications` | Favoriler, bildirim merkezi |
| `/app/profile`, `/app/profile/edit` | Firma profilim, profil gücü, düzenleme |
| `/app/settings` | Profil görünürlüğü, gizlilik, engellenenler, KVKK veri hakları (veri indirme, hesap silme) |
| `/kvkk` | Aydınlatma metni, gizlilik, kullanım koşulları, çerezler |

## Mimari

```
src/
  types/        Alan modelleri (değer kümeleri backend constants ile hizalı)
  data/         Demo firmalar + seçenek listeleri (sektör, teknokent, iş birliği türü…)
  services/     DataSource arayüzü · mock.ts (yerel demo) · http.ts (Express API adaptörü)
  store/        AppStore: useReducer + Context, localStorage kalıcılığı, filtreleme, eşleşme/mesaj akışı
  lib/          score.ts (açıklanabilir uyum skoru), yardımcılar
  components/   ui · layout · three · landing · discover · match · dashboard · onboarding
  pages/        Rota başına sayfalar (lazy-load)
```

- **Teknoloji:** React 18 · TypeScript (strict) · Tailwind CSS · Framer Motion · Three.js / React Three Fiber · React Router · lucide-react
- **Performans:** Three.js yalnızca masaüstünde ve tembel yüklenir (mobilde/reduced-motion'da statik SVG ağ); sayfalar kod bölmeli; parçacıklar tek canvas.
- **Erişilebilirlik:** `prefers-reduced-motion` desteği (MotionConfig + CSS), klavye kısayolları, ARIA etiketleri, odak halkaları.
- **Backend'e geçiş:** Bileşenler yalnızca `DataSource` arayüzünü bilir. Gerçek zamanlı mesajlaşma için `http.ts` yanına Socket.IO istemcisi eklenmesi yeterlidir (bkz. `../frontend/src/socket.js`).

Demo verileri tarayıcıda saklanır; **Hesap Ayarları → Demo verilerini sıfırla** ile başa dönülür. Firmalar kurgusaldır.
