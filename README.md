# unfold — Yargılanmadan Anlaşılacağın Güvenli Alan

> [!IMPORTANT]
> **Örnek Proje / Prototip Bildirimi:**
> Bu proje, **anonim akran desteği (peer-support)**, **içerik güvenliği (PII & kriz filtreleme)** ve **empati odaklı topluluk deneyimi** kavramlarını sergilemek amacıyla geliştirilmiş **örnek bir web uygulamasıdır (prototip / demo proje)**.
> Platform tıbbi, psikiyatrik veya profesyonel psikolojik danışmanlık hizmeti sunmaz; gerçek kriz durumlarında kullanıcıları doğrudan resmi acil destek hatlarına (`112` ve `ALO 183`) yönlendiren örnek bir güvenlik mimarisi içerir.

---

## 1. Proje Amacı ve Vizyonu

Geleneksel sosyal medya platformları kimlik, takipçi sayısı ve beğeni rekabeti üzerine kuruludur; bu durum insanların yaşadığı gerçek zorlukları (iş yerinde mobbing, sınav kaygısı, ayrılık, tükenmişlik, aile baskısı veya yalnızlık) paylaşmasını zorlaştırır.

**unfold**, *"Aynı dertlere sahip insanların yargılanmadan birbirini kolayca bulabildiği anonim dertleşme platformu"* vizyonuyla tasarlanmış örnek bir topluluk uygulamasıdır:
- **Kimliksiz ama Güvenli:** Kullanıcılar gerçek isimleri yerine otomatik üretilen anonim rumuzlarla (`GeceYolcusu19`, `SessizMartı42` vb.) ve deterministik SVG avatarlarla yer alır.
- **Rekabet Değil, Empati:** Klasik "Beğeni / Like" yerine **"Ben de yaşıyorum"**, **"Yanındayım"** ve **"Seni anlıyorum"** tepkileri kullanılır.
- **Küçük Adımların Kutlanması:** Yalnızca dertlerin değil, iyileşme sürecindeki ufak başarıların da kutlandığı özel bir **🌱 Küçük Zaferler Bahçesi** arayüzü sunar.

---

## 2. Öne Çıkan Özellikler

### A. Empati ve Deneyim Odaklı Akış Mimarisi
- **Çoklu Akış Modları:**
  - `Yeni`: En güncel paylaşımlar
  - `🌱 Küçük Zaferler`: Tamamen farklı görsel atmosfere sahip kutlama ve umut duvarı
  - `★ Takip Edilenler`: Kullanıcının yıldızladığı konu ve `#etiket` başlıklarından oluşan kişisel akış
  - `Sana Özel`: Kullanıcının geçmiş empati tepkilerine göre ağırlıklandırılmış öneri akışı
  - `Aynı Durumdakiler`, `Cevap Bekleyenler` ve `En Çok Destek Alanlar`
- **AkıllıBenzerlik Eşleştirmesi (Türkçe TF-IDF + Kosinüs Benzerliği):**
  - Her paylaşımın detay sayfasında, ortak etiketler ve Türkçe kök/kelime benzerliğine göre aynı durumu yaşayan diğer kullanıcıların paylaşımları otomatik listelenir.

### B. 🌱 Küçük Zaferler Bahçesi (`DailyWinsView`)
Standart dertleşme akışından bağımsız, zümrüt ve kehribar tonlarında tasarlanmış özel arayüz:
- **Topluluk Umut Sayacı:** Filizlenen zafer, toplam kutlama ve ilham alan kişi istatistikleri.
- **Senin Bugünkü Küçük Adımların:** Kullanıcının günlük öz-bakım adımlarını (*"Bir bardak su içtim"*, *"Kendimi eleştirmeyi 5 dk durdurdum"* vb.) işaretleyip ilerleme çubuğunu doldurabildiği ve tek tıkla paylaşabildiği interaktif pano.
- **Tek Tıkla Zafer İlhamı Şablonları:** Sınır koyma, odaklanma ve duygusal iyileşme için hazır başlangıç kartları.
- **Zafer Duvarı Tepkileri:** Zafer kartlarına özel *"👏 Gurur Duydum"*, *"🌱 Umut Oldu"* ve *"💚 Kalpten Kutluyorum"* tepkileri.

### C. Psikolojik Konfor ve Etkileşim Araçları
- **4-7-8 Canlı Nefes Molası (`BreathingWidget`):** Sağ kenar çubuğunda saniye saniye geri sayan (`4 sn Nefes Al` → `7 sn Tut` → `8 sn Ver`) animasyonlu sakinleşme egzersizi.
- **"Sonra Ne Oldu?" Hikaye Güncellemeleri:** Paylaşım sahibinin günler sonra sürecin nasıl sonuçlandığını orijinal paylaşımına ekleyebildiği zaman damgalı güncelleme bloğu.
- **Anonim Karar Anketleri (`PollBlock`):** İkilemde kalan kullanıcıların *"Siz benim yerimde olsaydınız ne yapardınız?"* sorusuyla topluluktan anonim oy alabildiği anket sistemi.
- **Geçici Paylaşımlar (24 Saat / 7 Gün):** Süresi dolduğunda akıştan otomatik olarak kalkan süreli dertleşme modu.
- **Paylaşılabilir Hikaye Kartı (`ShareCardModal`):** Paylaşımları HTML5 Canvas üzerinden yüksek çözünürlüklü (`1080×1080`) anonim görsel kartı olarak PNG formatında indirme.

### D. 3 Katmanlı Güvenlik, Kriz Kalkanı ve Öz-Moderasyon
1. **Katman 1 — Anlık Lokal Filtre (`local-filter.ts`):**
   - **Kişisel Veri (PII) Koruması:** Telefon numaraları (boşluklu/gizlenmiş dahil), e-posta adresleri ve sosyal medya hesapları otomatik tespit edilip engellenir.
   - **Zorbalık ve Küfür Engeli:** Türkçe argo ve karakter değiştirmeli (`s.a.l.a.k` vb.) hakaret ifadeleri filtrelenir.
   - **Kriz ve Kendine Zarar Verme Kalkanı:** İntihar veya kriz sinyali içeren metinler yayına alınmadan durdurulur ve kullanıcıya anında `112 Acil` ile `ALO 183` destek modalı (`CrisisModal`) açılır.
2. **Katman 2 — Empatik Yorum Ön-Uyarısı & Yazar Öz-Moderasyonu:**
   - Yorum yazarken yargılayıcı ifadeler (*"abartıyorsun"*, *"senin suçun"*, *"kafaya takma"* vb.) algılanırsa kullanıcıya göndermeden önce nazik bir empati hatırlatması gösterilir.
   - Paylaşım sahibi tek tıkla gönderisini **"Sadece Empati (Yorumlara Kapalı)"** moduna alabilir, kendisine iyi gelen yorumları **"✨ Bana İyi Geldi"** rozetiyle öne çıkarabilir veya kendi paylaşımı altındaki bir yorumu gizleyebilir.
3. **Katman 3 — Yönetici Korumalı Moderasyon Paneli (`/moderation`):**
   - Yalnızca yönetici yetkisine (`is_admin` / `MODERATION_SECRET`) sahip hesapların erişebildiği şikayet inceleme ve moderasyon logları ekranı.

---

## 3. Teknoloji Yığını (Tech Stack)

| Katman | Teknoloji | Açıklama |
| :--- | :--- | :--- |
| **Çatı (Framework)** | Next.js 15 (App Router) + React 19 | Sunucu ve istemci bileşenleri, API Route Handlers |
| **Dil** | TypeScript | Uçtan uca tip güvenliği |
| **Stil & Tasarım** | Tailwind CSS + Lucide Icons | Karanlık mod odaklı empatik arayüz ve mikro-animasyonlar |
| **Veritabanı** | Yerleşik SQLite (`node:sqlite` WAL modu) | Sıfır dış servis maliyetiyle çalışan yerel ilişkisel veritabanı (veya opsiyonel Supabase PostgreSQL şeması `supabase/schema.sql`) |
| **Kimlik Doğrulama** | HMAC-SHA256 imzalı HTTP-Only Cookie + Scrypt | E-posta/OTP doğrulama, şifre sıfırlama ve tek tıkla anonim demo oturumu |
| **Dağıtım (Deploy)** | Docker + Render Blueprint (`render.yaml`) + PWA | Mobil ana ekrana eklenebilir Web App Manifest ve konteyner desteği |

---

## 4. Proje Dizin Yapısı

```text
unfold/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/route.ts          # Kayıt, OTP doğrulama, giriş, demo hesap, rumuz güncelleme
│   │   │   ├── posts/route.ts         # Akış listeleme, filtreleme, yeni gönderi oluşturma
│   │   │   ├── posts/[id]/route.ts    # Gönderi detay, düzenleme, silme, "Sonra Ne Oldu?" güncellemesi
│   │   │   ├── comments/route.ts      # Yorum ekleme, "Bana İyi Geldi" işaretleme, yazar gizlemesi
│   │   │   ├── reactions/route.ts     # Empati tepkileri (Ben de yaşıyorum, Yanındayım, Seni anlıyorum)
│   │   │   ├── polls/route.ts         # Anonim karar anketi oylama
│   │   │   ├── follows/route.ts       # Konu ve etiket takip etme
│   │   │   ├── bookmarks/route.ts     # Paylaşım kaydetme
│   │   │   ├── notifications/route.ts # Bildirim listeleme ve okundu işaretleme
│   │   │   ├── reports/route.ts       # Topluluk şikayet bildirimi
│   │   │   ├── moderation/route.ts    # Admin yetkilendirme ve şikayet/log yönetimi
│   │   │   └── health/route.ts        # Sunucu sağlık kontrolü (/api/health)
│   │   ├── post/[id]/page.tsx         # Gönderi detay, yorum ağacı ve benzer dertler sayfası
│   │   ├── profile/page.tsx           # Anonim profil, güven skoru, etki özeti ve küçük zaferlerim
│   │   ├── moderation/page.tsx        # Yönetici (Admin) moderasyon ve güvenlik paneli
│   │   ├── manifest.ts                # PWA mobil uygulama manifestosu
│   │   ├── icon.svg                   # Ortak Yörünge (Empati & Buluşma) vektörel logosu
│   │   └── page.tsx                   # Ana dertleşme akışı ve Küçük Zaferler geçişi
│   ├── components/
│   │   ├── DailyWinsView.tsx          # Küçük Zaferler Bahçesi özel arayüzü ve günlük adım çizelgesi
│   │   ├── Navbar.tsx                 # Üst navigasyon, bildirimler ve güvenli çıkış onayı
│   │   ├── PostCard.tsx               # Gönderi kartı bileşeni
│   │   ├── PostComposerModal.tsx      # İçini Dök / Küçük Zafer paylaşım penceresi
│   │   ├── BreathingWidget.tsx        # 4-7-8 canlı geri sayımlı nefes egzersizi
│   │   ├── PollBlock.tsx              # Anonim anket bileşeni
│   │   ├── ShareCardModal.tsx         # PNG hikaye kartı üretici
│   │   ├── CrisisModal.tsx            # 112 & ALO 183 acil destek penceresi
│   │   ├── AuthModal.tsx              # Kayıt, giriş ve anında OTP doğrulama penceresi
│   │   ├── Footer.tsx                 # Hukuki metinler (KVKK, Topluluk Kuralları, 5651) ve sorumluluk reddi
│   │   └── Avatar.tsx                 # Deterministik anonim SVG avatar üretici
│   └── lib/
│       ├── db.ts                      # SQLite şeması, başlangıç (seed) verileri ve sorgular
│       ├── auth.ts                    # Oturum, şifreleme ve OTP doğrulama yardımcıları
│       ├── constants.ts               # Kategoriler, ruh halleri ve güven kademeleri
│       ├── rate-limit.ts              # Flood ve hız sınırı koruma katmanı
│       └── moderation/
│           ├── local-filter.ts        # PII, küfür, kriz ve TF-IDF etiket/benzerlik motoru
│           └── ai-analyzer.ts         # Opsiyonel Gemini AI moderasyon entegrasyonu
├── Dockerfile                         # Üretim (Production) Docker imajı
├── render.yaml                        # Render.com ücretsiz tek tıkla kurulum şablonu
└── .env.example                       # Ortam değişkenleri örneği
```

---

## 5. Kurulum ve Yerel Çalıştırma

### Gereksinimler
- **Node.js 22+** (yerleşik `node:sqlite` modülü için)

### Adımlar

```bash
# 1. Bağımlılıkları yükleyin
npm install

# 2. Birim testlerini çalıştırın
npm test

# 3. Üretim derlemesini (Production Build) oluşturun
npm run build

# 4. Sunucuyu başlatın (Varsayılan: http://localhost:3000)
npm start
```

İlk çalıştırmada `.data/unfold.db` SQLite veritabanı ve örnek (seed) paylaşımlar otomatik olarak oluşturulur; herhangi bir ücretli API anahtarı gerektirmez.

### Yönetici (Admin) Paneli Erişimi
- Tarayıcıda `http://localhost:3000/moderation` adresine gidin.
- Oturum açtıktan sonra yönetici anahtarı alanına varsayılan `unfold-admin-2026` (veya `.env` içinde belirlediğiniz `MODERATION_SECRET` değerini) girerek hesabınıza **Admin** yetkisi tanımlayabilirsiniz.

---

## 6. Bulutta Ücretsiz Yayınlama (Render / Docker)

Depo içerisindeki `Dockerfile` ve `render.yaml` dosyaları sayesinde projeyi ücretsiz olarak bulutta çalıştırabilirsiniz:

1. [Render Blueprint Kurulum Sayfası](https://render.com/deploy?repo=https://github.com/erenbektas777/unfold) üzerinden GitHub hesabınızla giriş yapın.
2. Servis adını (`unfold`) onaylayıp **Apply** butonuna basın.

---

## 7. Yasal Uyarı ve Sorumluluk Reddi

Bu yazılım **örnek bir portfolyo / konsept projesi** olarak sunulmaktadır. İçerisinde yer alan başlangıç verileri kurgusaldır. Acil psikolojik veya tıbbi destek gerektiren durumlarda **112 Acil Çağrı Merkezi** veya **ALO 183 Sosyal Destek Hattı** ile iletişime geçilmelidir.
