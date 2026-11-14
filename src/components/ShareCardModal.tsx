'use client';

import { useEffect, useRef } from 'react';
import { Download, Sparkles, X } from 'lucide-react';
import { MOODS } from '@/lib/constants';
import { Post } from '@/lib/types';

interface ShareCardModalProps {
  post: Post | null;
  onClose: () => void;
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines - 1) break;
    } else {
      current = test;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  return lines;
}

export function ShareCardModal({ post, onClose }: ShareCardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!post || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 1080;
    const H = 1350;
    canvas.width = W;
    canvas.height = H;

    // Arka plan gradyanı
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#090d18');
    bg.addColorStop(0.5, '#111829');
    bg.addColorStop(1, '#080b14');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Yumuşak ışık halkası
    const glow = ctx.createRadialGradient(W * 0.5, 220, 40, W * 0.5, 220, 520);
    glow.addColorStop(0, 'rgba(167, 139, 250, 0.22)');
    glow.addColorStop(1, 'rgba(167, 139, 250, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // İç kart çerçevesi
    ctx.fillStyle = 'rgba(16, 22, 36, 0.92)';
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.28)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(80, 120, W - 160, H - 240, 42);
    ctx.fill();
    ctx.stroke();

    // Üst marka: Ortak Yörünge logosu + unfold
    ctx.lineWidth = 3.5;
    ctx.fillStyle = 'rgba(139, 92, 246, 0.22)';
    ctx.strokeStyle = '#c4b5fd';
    ctx.beginPath();
    ctx.arc(156, 196, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.strokeStyle = '#7dd3fc';
    ctx.beginPath();
    ctx.arc(172, 196, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(164, 196, 3.2, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f1f5f9';
    ctx.font = '600 42px Georgia, serif';
    ctx.fillText('unfold', 202, 210);

    const moodLabel = MOODS[post.mood]?.label || post.mood;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 26px system-ui, sans-serif';
    ctx.fillText(`${post.category_name} · ${moodLabel}`, 140, 265);

    // Başlık
    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 46px Georgia, serif';
    const titleLines = wrapCanvasText(ctx, post.title, W - 280, 3);
    let y = 360;
    for (const line of titleLines) {
      ctx.fillText(line, 140, y);
      y += 62;
    }

    // Gövde metni
    y += 28;
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '400 32px system-ui, sans-serif';
    const bodyLines = wrapCanvasText(ctx, post.content, W - 280, 9);
    for (const line of bodyLines) {
      ctx.fillText(line, 140, y);
      y += 50;
    }

    // Etiketler
    if (post.tags.length > 0) {
      y += 30;
      ctx.fillStyle = '#38bdf8';
      ctx.font = '500 26px monospace';
      ctx.fillText(post.tags.map((t) => `#${t}`).join('   '), 140, Math.min(y, H - 290));
    }

    // Alt bilgi
    ctx.fillStyle = '#a78bfa';
    ctx.font = '600 28px system-ui, sans-serif';
    ctx.fillText(
      `@${post.author_username}  ·  ${post.same_here_count} kişi "Ben de yaşıyorum" dedi`,
      140,
      H - 190
    );
  }, [post]);

  if (!post) return null;

  function handleDownload() {
    if (!canvasRef.current || !post) return;
    const link = document.createElement('a');
    link.download = `unfold-${post.id.slice(0, 8)}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101624] p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Sparkles className="h-4 w-4 text-violet-400" />
            Paylaşılabilir Anonim Hikaye Kartı
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-white/5">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-[#080c14]">
          <canvas ref={canvasRef} className="h-auto w-full" />
        </div>

        <button
          type="button"
          onClick={handleDownload}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400"
        >
          <Download className="h-4 w-4" />
          Görsel Olarak İndir (PNG)
        </button>
      </div>
    </div>
  );
}
