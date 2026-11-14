# unfold — Yargılanmadan Anlaşılacağın Güvenli Alan

Aynı dertlere sahip insanların yargılanmadan birbirini kolayca bulabildiği anonim dertleşme ve akran desteği platformu.

## Özellikler
- **Tamamen Anonim Kimlik:** Rastgele takma ad ve avatar üretimi (`GeceYolcusu_412` vb.)
- **AkıllıBenzerlik (TF-IDF + Kosinüs Benzerliği):** Benzer duyguları yaşayan kişilerin paylaşımlarını otomatik eşleştirir
- **Kriz ve Güvenlik Kalkanı:** Kendine zarar verme veya kriz ifadelerini tespit ederek `112` ve `ALO 183` acil destek hatlarını gösterir
- **Küçük Zaferler & Takip Edilen Konular:** Umut veren gelişmeler sekmesi ve kişiselleştirilmiş konu takibi
- **4-7-8 Nefes Molası:** Canlı geri sayımlı sakinleşme egzersizi
- **Geçici Paylaşımlar (24 Saat), Anonim Karar Anketleri, "Sonra Ne Oldu?" Güncellemeleri ve Paylaşılabilir Hikaye Kartı**
- **Yönetici Korumalı Moderasyon Paneli:** `/moderation` üzerinden `MODERATION_SECRET` ile yönetici yetkilendirmesi

## Kurulum ve Çalıştırma

```bash
npm install
npm run build
npm start
```

Uygulama varsayılan olarak `http://localhost:3000` adresinde ve yerel SQLite (`.data/unfold.sqlite`) veritabanıyla sıfır dış servis maliyetiyle çalışır.
