# TeknoMatch Web Arayüzü

> **Doğru İş Birliği, Doğru Eşleşmeyle Başlar.** · *Where Innovation Meets Opportunity.*

TeknoMatch API'sinin (`../src`) web arayüzü: tanıtım sayfası, gerçek uygulama ve giriş gerektirmeyen bir demo.

## Çalıştırma

```bash
cd web
npm install
npm run dev        # http://localhost:5173 — /api, /files ve /socket.io istekleri localhost:4000'e yönlenir
npm run build      # tip kontrolü + üretim derlemesi (dist/); API bu klasörü aynı adresten servis eder
```

API farklı bir adresteyse `VITE_API_URL=https://api.example.com` ile derleyin.

## Rotalar

| Rota | Ekran |
| --- | --- |
| `/` | Tanıtım sayfası: 3D ağ arka planı (Three.js), fareye duyarlı yüzen kartlar, Nasıl Çalışır, Avantajlar, Öne Çıkan Firmalar, Başarı Hikâyeleri |
| `/giris`, `/kayit` | Giriş ve iki adımlı firma kaydı (kurumsal e-posta, VKN, teknokent, KVKK onayı) |
| `/verify-email`, `/forgot-password`, `/reset-password`, `/accept-invite` | E-posta bağlantılarının açtığı sayfalar |
| `/app` | Genel bakış: eşleşme/görüşme/toplantı metrikleri, profil gücü, bekleyen iş sonuçları |
| `/app/discover` | Kaydırmalı kart destesi (`GET /feed`, `POST /swipes`), firma detayı, tam ekran MATCH animasyonu |
| `/app/matches`, `/app/messages/:id` | Eşleşmeler; gerçek zamanlı sohbet, toplantı önerme/kabul/iptal, iş sonucu bildirimi, rapor/engelleme |
| `/app/profile` | Genel bilgiler ve logo, sunuyorum/arıyorum, belgeler (dosya yükleme), referanslar, eşleşme tercihleri, ekip ve davetler |
| `/app/account` | Kişisel bilgiler, şifre, KVKK, hesap silme |
| `/app/panel` | Teknokent paneli: metrikler + CSV, firma onayı, toplu yükleme, talep–arz boşluğu, ağ haritası, raporlar, platform yönetimi |
| `/demo/*` | Tarayıcıda saklanan örnek veriyle çalışan demo (giriş gerekmez) |

Eski arayüzün adresleri (`/login`, `/feed`, `/matches/:id/outcome` vb.) yeni karşılıklarına yönlendirilir; daha önce gönderilmiş e-posta bağlantıları çalışmaya devam eder.

## Mimari

```
src/
  live/          API istemcisi (api.ts), oturum (auth.tsx), Socket.IO (socket.ts), uygulama kabuğu, sayfalar
  pages/         Landing, Kvkk
  demo/          demo sayfaları — store/ (yerel durum) ve services/ (örnek veri kaynağı) ile çalışır
  components/    ortak tasarım sistemi: ui, layout, discover, match, dashboard, three, landing, onboarding
  data/, lib/    seçenek listeleri, demo firmalar, yardımcılar
```

- **Teknoloji:** React 18 · TypeScript (strict) · Tailwind CSS · Framer Motion · Three.js / React Three Fiber · React Router · Socket.IO istemcisi · lucide-react
- **Performans:** Three.js yalnızca masaüstünde ve tembel yüklenir (mobilde/reduced-motion'da statik SVG ağ); uygulama ekranları ve Socket.IO ayrı parçalarda yüklenir.
- **Erişilebilirlik:** `prefers-reduced-motion` desteği, klavye kısayolları (← → ↑), ARIA etiketleri, odak halkaları.
