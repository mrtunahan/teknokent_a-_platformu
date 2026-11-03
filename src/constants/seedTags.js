/** Başlangıç etiket kataloğu. `parent` alanı üst etiketin slug'ıdır. */
module.exports = [
  // Sektörler
  ...['Sağlık', 'Savunma', 'Fintech', 'Enerji', 'Tarım', 'Eğitim', 'Otomotiv', 'Lojistik', 'E-ticaret',
    'Telekomünikasyon', 'Üretim / Endüstri', 'Oyun', 'Akıllı Şehir', 'Havacılık ve Uzay', 'Gıda', 'Medya']
    .map((name) => ({ type: 'sector', name })),

  // Teknolojiler
  { type: 'technology', name: 'Yapay Zekâ' },
  { type: 'technology', name: 'Görüntü İşleme', parent: 'yapay-zeka' },
  { type: 'technology', name: 'Doğal Dil İşleme', parent: 'yapay-zeka' },
  { type: 'technology', name: 'Makine Öğrenmesi', parent: 'yapay-zeka' },
  { type: 'technology', name: 'Gömülü Sistem' },
  { type: 'technology', name: 'IoT', parent: 'gomulu-sistem' },
  { type: 'technology', name: 'Blokzincir' },
  { type: 'technology', name: 'Bulut Bilişim' },
  { type: 'technology', name: 'Siber Güvenlik' },
  { type: 'technology', name: 'Robotik' },
  { type: 'technology', name: 'AR / VR' },
  { type: 'technology', name: 'Mobil Uygulama' },
  { type: 'technology', name: 'Web Yazılım' },
  { type: 'technology', name: 'Veri Analitiği' },
  { type: 'technology', name: 'Elektronik Kart Tasarımı', parent: 'gomulu-sistem' },

  // Yetkinlik / ihtiyaç etiketleri
  { type: 'competence', name: 'Yazılım Geliştirme' },
  { type: 'competence', name: 'Mobil Geliştirme', parent: 'yazilim-gelistirme' },
  { type: 'competence', name: 'Web Geliştirme', parent: 'yazilim-gelistirme' },
  { type: 'competence', name: 'Yapay Zekâ Modeli Geliştirme' },
  { type: 'competence', name: 'Görüntü İşleme Çözümleri', parent: 'yapay-zeka-modeli-gelistirme' },
  { type: 'competence', name: 'Donanım / Prototipleme' },
  { type: 'competence', name: 'PCB Tasarım ve Üretim', parent: 'donanim-prototipleme' },
  { type: 'competence', name: 'Mekanik Tasarım', parent: 'donanim-prototipleme' },
  { type: 'competence', name: 'Saha Testi' },
  { type: 'competence', name: 'Test ve Kalite Güvence' },
  { type: 'competence', name: 'Siber Güvenlik Danışmanlığı' },
  { type: 'competence', name: 'UI / UX Tasarım' },
  { type: 'competence', name: 'Proje Yazımı (TÜBİTAK / KOSGEB / AB)' },
  { type: 'competence', name: 'Pazarlama ve Satış' },
  { type: 'competence', name: 'İhracat / Uluslararası Pazar' },
  { type: 'competence', name: 'Hukuk ve Fikri Mülkiyet' },
  { type: 'competence', name: 'Finansman / Yatırım' },
  { type: 'competence', name: 'Laboratuvar / Test Altyapısı' },
  { type: 'competence', name: 'Bulut Altyapı ve DevOps' },
  { type: 'competence', name: 'Veri Bilimi ve Analitik' },
  { type: 'competence', name: 'Pilot Müşteri' },
  { type: 'competence', name: 'Mentorluk' },
];
