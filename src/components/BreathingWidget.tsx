'use client';

import { useEffect, useState } from 'react';
import { Wind, X } from 'lucide-react';

type Phase = 'inhale' | 'hold' | 'exhale';

export function BreathingWidget() {
  const [active, setActive] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [cycleSec, setCycleSec] = useState(0);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setActive(false);
          return 60;
        }
        return prev - 1;
      });
      setCycleSec((prev) => (prev + 1) % 19);
    }, 1000);
    return () => clearInterval(timer);
  }, [active]);

  // 4-7-8 tekniği: 0..3 Nefes Al (4->1 sn), 4..10 Tut (7->1 sn), 11..18 Ver (8->1 sn)
  let phase: Phase = 'inhale';
  let phaseRemainingSec = 4 - cycleSec;
  let phaseLabel = `Burnundan derin nefes al (${phaseRemainingSec} sn)`;
  let scaleClass = 'scale-125 bg-sky-400/25 border-sky-400/50';

  if (cycleSec >= 4 && cycleSec < 11) {
    phase = 'hold';
    phaseRemainingSec = 11 - cycleSec;
    phaseLabel = `Nefesini sakince tut (${phaseRemainingSec} sn)`;
    scaleClass = 'scale-125 bg-violet-400/25 border-violet-400/50';
  } else if (cycleSec >= 11) {
    phase = 'exhale';
    phaseRemainingSec = 19 - cycleSec;
    phaseLabel = `Ağzından yavaşça bırak (${phaseRemainingSec} sn)`;
    scaleClass = 'scale-90 bg-emerald-400/20 border-emerald-400/40';
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#101624] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-sky-300">
          <Wind className="h-4 w-4" />
          4-7-8 Nefes Molası
        </div>
        {active && (
          <button
            onClick={() => {
              setActive(false);
              setSecondsLeft(60);
              setCycleSec(0);
            }}
            className="text-slate-400 hover:text-slate-200"
            title="Bitir"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {!active ? (
        <div className="mt-2">
          <p className="text-xs leading-relaxed text-slate-400">
            Zihnin çok doluysa 60 saniyelik rehberli nefes egzersiziyle nabzını yavaşlat.
          </p>
          <button
            type="button"
            onClick={() => {
              setSecondsLeft(60);
              setCycleSec(0);
              setActive(true);
            }}
            className="mt-3 w-full rounded-xl border border-sky-400/30 bg-sky-500/10 py-2 text-xs font-medium text-sky-200 transition hover:bg-sky-500/20"
          >
            60 Saniye Nefes Molası Başlat
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center py-2 text-center">
          <div className="relative flex h-28 w-28 items-center justify-center">
            <div
              className={`h-20 w-20 rounded-full border-2 transition-all duration-1000 ease-in-out ${scaleClass}`}
            />
            <div className="absolute flex flex-col items-center">
              <span className="font-mono text-[11px] font-semibold tracking-wider text-slate-200">
                {phase === 'inhale' ? 'NEFES AL' : phase === 'hold' ? 'TUT' : 'NEFES VER'}
              </span>
              <span className="font-mono text-lg font-bold tabular-nums text-white">
                {phaseRemainingSec}
              </span>
            </div>
          </div>
          <p className="mt-3 text-xs font-medium text-slate-200">{phaseLabel}</p>
          <span className="mt-1 font-mono text-[11px] text-slate-500">
            Kalan süre: {secondsLeft} sn
          </span>
        </div>
      )}
    </div>
  );
}
