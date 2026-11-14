'use client';

import { useState } from 'react';
import { FileText, PhoneCall, Scale, ShieldCheck, X } from 'lucide-react';

type LegalDoc = 'rules' | 'kvkk' | 'disclaimer' | null;

export function Footer() {
  const [openDoc, setOpenDoc] = useState<LegalDoc>(null);

  return (
    <>
      <footer className="mt-16 border-t border-white/10 bg-[#060911] py-8 text-xs text-slate-400">
        <div className="mx-auto max-w-6xl space-y-5 px-4">
          {/* Tıbbi & Acil Durum Sorumluluk Reddi */}
          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-white/10 bg-[#0c1220] p-4 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <div className="font-semibold text-slate-200">
                Önemli Bilgilendirme &amp; Tıbbi Sorumluluk Reddi
              </div>
              <p className="leading-relaxed text-slate-400">
                <strong>unfold</strong>, insanların benzer yaşam deneyimlerini anonim olarak paylaştığı bir{' '}
                <strong>akran dayanışma platformudur</strong>. Buradaki hiçbir içerik psikolojik danışmanlık,
                psikiyatrik tanı veya tıbbi tedavi yerine geçmez.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-rose-200">
              <PhoneCall className="h-4 w-4 shrink-0 text-rose-300" />
              <div>
                <div className="text-[11px] font-semibold">Kriz &amp; Acil Destek</div>
                <div className="font-mono text-xs font-bold">112 Acil · ALO 183</div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="font-serif text-sm font-semibold text-slate-200">unfold</span>
              <span>·</span>
              <span>Yargısız Anonim Dertleşme Topluluğu</span>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setOpenDoc('rules')}
                className="inline-flex items-center gap-1 text-slate-400 transition hover:text-violet-300"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Topluluk Kuralları
              </button>
              <button
                type="button"
                onClick={() => setOpenDoc('kvkk')}
                className="inline-flex items-center gap-1 text-slate-400 transition hover:text-violet-300"
              >
                <FileText className="h-3.5 w-3.5" />
                KVKK &amp; Gizlilik
              </button>
              <button
                type="button"
                onClick={() => setOpenDoc('disclaimer')}
                className="inline-flex items-center gap-1 text-slate-400 transition hover:text-violet-300"
              >
                <Scale className="h-3.5 w-3.5" />
                Kullanım Koşulları (5651)
              </button>
            </div>
          </div>
        </div>
      </footer>

      {openDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#101624] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-serif text-lg font-semibold text-slate-100">
                {openDoc === 'rules' && 'Topluluk Kuralları & Güvenli Alan İlkeleri'}
                {openDoc === 'kvkk' && 'KVKK Aydınlatma Metni & Gizlilik İlkeleri'}
                {openDoc === 'disclaimer' && 'Kullanım Koşulları & 5651 Yer Sağlayıcı Bildirimi'}
              </h3>
              <button
                type="button"
                onClick={() => setOpenDoc(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {openDoc === 'rules' && (
              <div className="mt-4 space-y-3 text-xs leading-relaxed text-slate-300">
                <p>
                  <strong>1. Kimlik ve Kişisel Veri Paylaşımı Yasaktır (PII Koruması):</strong> Kendinizin
                  veya bir başkasının gerçek adını, telefon numarasını, e-posta adresini, açık adresini
                  veya sosyal medya hesabını paylaşmak kesinlikle yasaktır.
                </p>
                <p>
                  <strong>2. Yargılama, Küçümseme ve Zorbalığa Sıfır Tolerans:</strong> Dert anlatan
                  kullanıcılara karşı hakaret, alay, küçümseme veya nefret söylemi içeren yorumlar
                  otomatik filtre ve topluluk moderasyonu ile kaldırılır.
                </p>
                <p>
                  <strong>3. Etkileşim Tercihine Saygı:</strong> &ldquo;Sadece Empati&rdquo; modundaki
                  paylaşımlarda kişi tavsiye değil yalnızca anlaşıldığını hissetmek istemektedir.
                </p>
                <p>
                  <strong>4. Kriz ve Kendine Zarar Verme İçerikleri:</strong> Kendine zarar verme veya
                  intihar ifadeleri içeren paylaşımlar yayınlanmaz ve kullanıcı doğrudan 112 / ALO 183
                  profesyonel destek hatlarına yönlendirilir.
                </p>
              </div>
            )}

            {openDoc === 'kvkk' && (
              <div className="mt-4 space-y-3 text-xs leading-relaxed text-slate-300">
                <p>
                  <strong>Veri Minimizasyonu İlkesi:</strong> 6698 sayılı Kişisel Verilerin Korunması
                  Kanunu (KVKK) kapsamında unfold yalnızca hesabınıza tekrar erişebilmeniz için e-posta
                  adresinizi (şifrelenmiş oturum doğrulaması amacıyla) ve anonim rumuzunuzu işler.
                </p>
                <p>
                  <strong>Tam Anonimlik:</strong> E-posta adresiniz hiçbir zaman profilinizde,
                  gönderilerinizde veya API yanıtlarında diğer kullanıcılara gösterilmez.
                </p>
                <p>
                  <strong>Silme ve Unutulma Hakkı:</strong> Paylaşımlarınızı istediğiniz an kalıcı olarak
                  silebilir veya 24 saat / 7 gün sonra otomatik silinecek şekilde yayınlayabilirsiniz.
                </p>
              </div>
            )}

            {openDoc === 'disclaimer' && (
              <div className="mt-4 space-y-3 text-xs leading-relaxed text-slate-300">
                <p>
                  <strong>Tıbbi Sorumluluk Reddi:</strong> unfold bir sağlık kuruluşu veya terapi
                  merkezi değildir. Platformda yer alan kullanıcı paylaşımları ve yorumlar yalnızca
                  kişisel görüş ve akran desteğidir; uzman hekim veya psikolog tavsiyesi yerine geçmez.
                </p>
                <p>
                  <strong>5651 Sayılı Kanun Kapsamında Yer Sağlayıcı Beyanı:</strong> unfold, 5651 sayılı
                  Kanun kapsamında &ldquo;Yer Sağlayıcı&rdquo; sıfatıyla hizmet vermektedir. Hukuka veya
                  topluluk kurallarına aykırı olduğu bildirilen içerikler (&ldquo;Uyar-Kaldır&rdquo;
                  prensibiyle) incelenerek yayından kaldırılır.
                </p>
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setOpenDoc(null)}
                className="rounded-xl bg-violet-500 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-400"
              >
                Anladım
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
