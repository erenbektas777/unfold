'use client';

import { HeartHandshake, PhoneCall, X } from 'lucide-react';

interface CrisisModalProps {
  open: boolean;
  onClose: () => void;
}

export function CrisisModal({ open, onClose }: CrisisModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#101624] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/15 text-rose-300">
              <HeartHandshake className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Yalnız Değilsin</h3>
              <p className="text-xs text-slate-400">Şu an çok ağır bir şey taşıyor olabilirsin</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-slate-200"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-300">
          Yazdıklarında kendine zarar verme veya yoğun bir kriz sinyali fark ettik. Bu paylaşım
          güvenliğin için yayınlanmadı. Lütfen şu an yanında olabilecek gerçek bir uzmanla konuş:
        </p>

        <div className="mt-4 space-y-2.5">
          <a
            href="tel:112"
            className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200 transition hover:bg-rose-500/20"
          >
            <span className="flex items-center gap-2.5">
              <PhoneCall className="h-4 w-4" />
              112 Acil Çağrı Merkezi
            </span>
            <span className="text-xs text-rose-300">7/24 Ücretsiz</span>
          </a>

          <a
            href="tel:183"
            className="flex items-center justify-between rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm font-medium text-sky-200 transition hover:bg-sky-500/20"
          >
            <span className="flex items-center gap-2.5">
              <PhoneCall className="h-4 w-4" />
              ALO 183 Sosyal Destek Hattı
            </span>
            <span className="text-xs text-sky-300">7/24 Destek</span>
          </a>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-white/5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10"
        >
          Anladım, geri dön
        </button>
      </div>
    </div>
  );
}
