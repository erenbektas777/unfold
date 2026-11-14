'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Award,
  Bookmark,
  CheckCircle2,
  Circle,
  Heart,
  MessageCircle,
  PartyPopper,
  Quote,
  Share2,
  Sparkles,
  Sprout,
  Sun,
} from 'lucide-react';
import { TIER_INFO } from '@/lib/constants';
import { Post, ReactionType } from '@/lib/types';
import { Avatar } from './Avatar';
import { PollBlock } from './PollBlock';
import { estimateReadingTime, formatRelativeTime } from './PostCard';

interface DailyWinsViewProps {
  posts: Post[];
  loading: boolean;
  onBackToFeed: () => void;
  onOpenWinComposer: (preset?: { title?: string; categoryId?: number; tags?: string[] }) => void;
  onReact: (postId: string, type: ReactionType) => void;
  onBookmark: (postId: string) => void;
  onVotePoll?: (postId: string, optionId: string) => void;
  onShare: (post: Post) => void;
  onTagClick: (tag: string) => void;
}

interface MicroStep {
  id: string;
  emoji: string;
  label: string;
  shareTitle: string;
  categoryId: number;
  tags: string[];
}

const DAILY_MICRO_STEPS: MicroStep[] = [
  {
    id: 'water',
    emoji: '💧',
    label: 'Kendim için bir bardak su içtim ve bedenimi dinledim',
    shareTitle: 'Bugün koşturmacanın içinde durup kendim için su içtim ve bedenimi dinledim',
    categoryId: 5,
    tags: ['küçük-zafer', 'özbakım'],
  },
  {
    id: 'morning',
    emoji: '☀️',
    label: 'Yataktan kalkıp yüzümü yıkadım veya pencereyi açıp temiz hava aldım',
    shareTitle: 'Zor bir sabaha rağmen yataktan kalkıp güne ilk adımımı attım',
    categoryId: 5,
    tags: ['küçük-zafer', 'iyileşme', 'özbakım'],
  },
  {
    id: 'breath',
    emoji: '🫁',
    label: 'Derin bir nefes alıp sıkılı omuzlarımı ve çenemi gevşettim',
    shareTitle: 'Kaygımın yükseldiği anda durup derin nefes alarak kendimi sakinleştirdim',
    categoryId: 5,
    tags: ['küçük-zafer', 'öz-şefkat'],
  },
  {
    id: 'kindness',
    emoji: '🛡️',
    label: 'Kendimi acımasızca eleştirmeyi en az 5 dakikalığına durdurdum',
    shareTitle: 'Bugün içimdeki acımasız eleştirmene mola verdirip kendime şefkat gösterdim',
    categoryId: 5,
    tags: ['küçük-zafer', 'öz-şefkat', 'iyileşme'],
  },
  {
    id: 'focus',
    emoji: '🌱',
    label: 'Ertelediğim bir işe mükemmel olmasını beklemeden 5 dakika ayırdım',
    shareTitle: 'Haftalardır ertelediğim işe kusursuz olmasını beklemeden ilk adımı attım',
    categoryId: 2,
    tags: ['küçük-zafer', 'erteleme-bitti', 'odak'],
  },
];

const WIN_PROMPTS = [
  {
    emoji: '🛑',
    badge: 'Sınır Koyma',
    title: 'Bugün ilk kez suçluluk duymadan "Hayır" diyebildim',
    categoryId: 3,
    tags: ['küçük-zafer', 'sınır-koyma', 'özgüven'],
  },
  {
    emoji: '📵',
    badge: 'Duygusal İyileşme',
    title: 'Bana iyi gelmeyen o kişiye mesaj atmamayı başardım',
    categoryId: 1,
    tags: ['küçük-zafer', 'öz-şefkat', 'iyileşme'],
  },
  {
    emoji: '📚',
    badge: 'Odak & Başlangıç',
    title: 'Mükemmel olmasını beklemeden ertelediğim işin ilk adımını tamamladım',
    categoryId: 6,
    tags: ['küçük-zafer', 'erteleme-bitti', 'odak'],
  },
  {
    emoji: '🚶',
    badge: 'Öz-Bakım',
    title: 'Canım hiç istemese bile dışarı çıkıp 15 dakika yürüyüş yaptım',
    categoryId: 5,
    tags: ['küçük-zafer', 'özbakım', 'iyileşme'],
  },
];

type WinThemeFilter = 'all' | 'mind' | 'work' | 'relations';

export function DailyWinsView({
  posts,
  loading,
  onBackToFeed,
  onOpenWinComposer,
  onReact,
  onBookmark,
  onVotePoll,
  onShare,
  onTagClick,
}: DailyWinsViewProps) {
  const [themeFilter, setThemeFilter] = useState<WinThemeFilter>('all');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [celebratingPostId, setCelebratingPostId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const todayKey = `unfold_micro_steps_${new Date().toISOString().slice(0, 10)}`;
      const saved = localStorage.getItem(todayKey);
      if (saved) setCompletedSteps(JSON.parse(saved));
    } catch {
      // ignore localStorage errors
    }
  }, []);

  function toggleMicroStep(stepId: string) {
    setCompletedSteps((prev) => {
      const next = prev.includes(stepId) ? prev.filter((id) => id !== stepId) : [...prev, stepId];
      try {
        const todayKey = `unfold_micro_steps_${new Date().toISOString().slice(0, 10)}`;
        localStorage.setItem(todayKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  function handleCelebrationReact(postId: string, type: ReactionType) {
    setCelebratingPostId(postId);
    setTimeout(() => setCelebratingPostId((curr) => (curr === postId ? null : curr)), 900);
    onReact(postId, type);
  }

  const filteredWins = posts.filter((p) => {
    if (themeFilter === 'all') return true;
    if (themeFilter === 'mind') return p.category_id === 5 || p.category_id === 4;
    if (themeFilter === 'work') return p.category_id === 2 || p.category_id === 6;
    if (themeFilter === 'relations') return p.category_id === 1 || p.category_id === 3;
    return true;
  });

  const totalWinsCount = posts.length;
  const totalCelebrations = posts.reduce((acc, p) => acc + (p.empathy_count || 0), 0);
  const totalInspired = posts.reduce((acc, p) => acc + (p.same_here_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Üst Geri Dönüş & Bahçe Başlığı */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToFeed}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#101624] px-3.5 py-2 text-xs font-medium text-slate-300 transition hover:border-emerald-400/40 hover:text-emerald-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Dertleşme Akışına Dön</span>
        </button>

        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-medium text-emerald-200">
          <Sun className="h-3.5 w-3.5 text-amber-300" />
          <span>Umut &amp; İyileşme Alanı · Küçük Zaferler Bahçesi</span>
        </div>
      </div>

      {/* Hero: Küçük Zaferler Bahçesi Panoraması */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-[#07221c] via-[#0c1f24] to-[#131829] p-6 shadow-2xl shadow-emerald-950/40 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl" />

        <div className="relative z-10 grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200">
              <Sprout className="h-4 w-4 text-emerald-300" />
              <span>Küçük Adımlar, Büyük İyileşmeler</span>
            </div>

            <h1 className="font-serif text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Kimsenin fark etmediği o küçük zaferin, burada alkışlanmayı hak ediyor.
            </h1>

            <p className="max-w-2xl text-sm leading-relaxed text-emerald-100/80">
              Bazen yataktan çıkabilmek, bazen ertelediğin bir mesajı atabilmek, bazen de sadece
              kendine yüklenmemek en büyük başarıdır. Burası dertlerin değil, küllerinden doğan
              küçük adımların duvarı.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onOpenWinComposer()}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-300 px-5 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:brightness-105 sm:text-sm"
              >
                <Sprout className="h-4 w-4" />
                <span>Bugünkü Küçük Zaferini Yaz</span>
              </button>
              <span className="text-xs text-emerald-200/70">
                ✨ Tamamen anonim · Yargı yok, sadece kutlama var
              </span>
            </div>
          </div>

          {/* Sağ: Topluluk Umut Sayacı */}
          <div className="grid grid-cols-3 gap-2.5 lg:col-span-4 lg:grid-cols-1">
            <div className="flex items-center justify-between rounded-2xl border border-emerald-400/25 bg-[#071512]/70 px-4 py-3 backdrop-blur-sm">
              <div>
                <div className="text-[11px] font-medium text-emerald-200/75">Filizlenen Zafer</div>
                <div className="font-serif text-xl font-bold text-emerald-300 sm:text-2xl">
                  {totalWinsCount}
                </div>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-lg">
                🌱
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-amber-400/25 bg-[#071512]/70 px-4 py-3 backdrop-blur-sm">
              <div>
                <div className="text-[11px] font-medium text-amber-200/75">Gurur &amp; Kutlama</div>
                <div className="font-serif text-xl font-bold text-amber-300 sm:text-2xl">
                  {totalCelebrations}
                </div>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-lg">
                👏
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-teal-400/25 bg-[#071512]/70 px-4 py-3 backdrop-blur-sm">
              <div>
                <div className="text-[11px] font-medium text-teal-200/75">İlham Alan Kişi</div>
                <div className="font-serif text-xl font-bold text-teal-300 sm:text-2xl">
                  {totalInspired}
                </div>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/15 text-lg">
                ✨
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* İnteraktif İkili Bölüm: 1) Bugünkü Küçük Adımların + 2) Tek Tıkla Zafer İlhamı */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Sol: Bugünkü Küçük Adımların (Günlük Mikro-Zafer Çizelgesi) */}
        <div className="rounded-3xl border border-emerald-400/20 bg-gradient-to-b from-[#0d1f1d] to-[#0a1418] p-5 lg:col-span-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
                <Award className="h-4 w-4 text-emerald-400" />
                <span>Senin Bugünkü Küçük Adımların</span>
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Bugün kendin için yaptığın şeyleri işaretle; her biri gerçek bir kazanımdır.
              </p>
            </div>
            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 font-mono text-xs font-bold text-emerald-200">
              {completedSteps.length} / {DAILY_MICRO_STEPS.length} 🌱
            </span>
          </div>

          {/* İlerleme Çubuğu */}
          <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-[#071012]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 transition-all duration-500"
              style={{ width: `${(completedSteps.length / DAILY_MICRO_STEPS.length) * 100}%` }}
            />
          </div>

          <div className="space-y-2">
            {DAILY_MICRO_STEPS.map((step) => {
              const checked = completedSteps.includes(step.id);
              return (
                <div
                  key={step.id}
                  className={`flex items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5 transition ${
                    checked
                      ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100'
                      : 'border-white/10 bg-[#081014] text-slate-300 hover:border-emerald-400/25'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleMicroStep(step.id)}
                    className="flex flex-1 items-center gap-2.5 text-left text-xs"
                  >
                    {checked ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-slate-500" />
                    )}
                    <span>
                      {step.emoji} {step.label}
                    </span>
                  </button>

                  {checked && (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenWinComposer({
                          title: step.shareTitle,
                          categoryId: step.categoryId,
                          tags: step.tags,
                        })
                      }
                      className="shrink-0 rounded-lg border border-emerald-300/30 bg-emerald-400/20 px-2 py-1 text-[10px] font-semibold text-emerald-200 hover:bg-emerald-400/30"
                    >
                      Paylaş →
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sağ: Tek Tıkla Zafer İlhamı (Hızlı Şablonlar) */}
        <div className="rounded-3xl border border-amber-400/20 bg-gradient-to-b from-[#171c19] to-[#0c1318] p-5 lg:col-span-6">
          <div className="mb-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-200">
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span>Nasıl Başlayacağını Bilmiyor musun? (Tek Tıkla Şablonlar)</span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Sana yakın gelen bir zafer kartına dokun, hikayeni kendi cümlelerinle tamamla:
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {WIN_PROMPTS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() =>
                  onOpenWinComposer({
                    title: item.title,
                    categoryId: item.categoryId,
                    tags: item.tags,
                  })
                }
                className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-[#091115] p-3.5 text-left transition hover:border-amber-400/40 hover:bg-amber-500/10"
              >
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-lg">{item.emoji}</span>
                    <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-200">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-xs font-medium leading-snug text-slate-200 group-hover:text-amber-100">
                    &ldquo;{item.title}&rdquo;
                  </p>
                </div>
                <div className="mt-3 text-[11px] font-semibold text-emerald-300 group-hover:translate-x-0.5">
                  Bu zaferi paylaş →
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Zafer Duvarı Filtre Şeridi */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-500/15 pb-3">
        <div className="flex items-center gap-2">
          <PartyPopper className="h-4 w-4 text-emerald-300" />
          <h2 className="font-serif text-lg font-semibold text-slate-100">
            Topluluk Zafer Duvarı
          </h2>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all', label: '✨ Tüm Zaferler' },
            { id: 'mind', label: '🌿 Zihin & Öz-Bakım' },
            { id: 'work', label: '🚀 İş, Okul & Odak' },
            { id: 'relations', label: '💛 İlişkiler & Sınır Koyma' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setThemeFilter(tab.id as WinThemeFilter)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                themeFilter === tab.id
                  ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-100 shadow-sm shadow-emerald-500/20'
                  : 'border-white/10 bg-[#0d151b] text-slate-400 hover:border-emerald-400/30 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2 Sütunlu Özel Zafer Kartları (Victory Wall) */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-3xl border border-emerald-500/10 bg-[#0c1a1a]/60"
            />
          ))}
        </div>
      ) : filteredWins.length === 0 ? (
        <div className="rounded-3xl border border-emerald-400/20 bg-[#0b1717] p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-2xl">
            🌱
          </div>
          <h3 className="font-serif text-lg font-semibold text-slate-100">
            Bu temada henüz paylaşılmış bir küçük zafer yok
          </h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">
            İlk filizi sen dikmek ister misin? Küçük adımın bir başkasının bugün ihtiyaç duyduğu
            umut olabilir.
          </p>
          <button
            type="button"
            onClick={() => onOpenWinComposer()}
            className="mt-4 rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-semibold text-slate-950 hover:bg-emerald-300"
          >
            🌱 İlk Zaferi Sen Paylaş
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {filteredWins.map((post) => {
            const tier = TIER_INFO[post.author_tier];
            const userReactions = post.user_reactions || [];
            const isCelebrating = celebratingPostId === post.id;

            return (
              <article
                key={post.id}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border bg-gradient-to-br from-[#0c221d] via-[#0e1b22] to-[#0b131d] p-6 transition duration-300 ${
                  isCelebrating
                    ? 'scale-[1.01] border-amber-300/60 shadow-xl shadow-emerald-500/20'
                    : 'border-emerald-400/25 hover:border-emerald-400/50 hover:shadow-lg hover:shadow-emerald-950/50'
                }`}
              >
                {/* Dekoratif Arka Plan Işıltısı ve Alıntı İkonu */}
                <Quote className="pointer-events-none absolute right-5 top-5 h-12 w-12 rotate-12 text-emerald-400/[0.06]" />

                <div>
                  {/* Üst Rozet ve Yazar Bilgisi */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar seed={post.author_avatar_seed} size={36} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-emerald-50">
                            {post.author_username}
                          </span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${tier.badgeClass}`}
                          >
                            {tier.label}
                          </span>
                        </div>
                        <div className="font-mono text-[11px] text-emerald-200/60">
                          {post.category_name} · {formatRelativeTime(post.created_at)} ·{' '}
                          {estimateReadingTime(post.content)}
                        </div>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/35 bg-gradient-to-r from-emerald-500/20 to-amber-500/15 px-3 py-1 text-[11px] font-semibold text-emerald-200 shadow-sm">
                      <span>🌱</span>
                      <span>Günün Zaferi</span>
                    </span>
                  </div>

                  {/* Başlık ve Hikaye */}
                  <Link href={`/post/${post.id}`} className="mt-4 block">
                    <h3 className="font-serif text-lg font-semibold leading-snug tracking-tight text-white transition group-hover:text-emerald-200 sm:text-xl">
                      {post.title}
                    </h3>
                    <p className="mt-2.5 line-clamp-4 whitespace-pre-line text-sm leading-relaxed text-slate-200/90">
                      {post.content}
                    </p>
                  </Link>

                  {/* Sonra Ne Oldu? Güncellemesi */}
                  {post.update_text && (
                    <div className="mt-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Sonra Ne Oldu? · Güncelleme</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-emerald-100/90">
                        {post.update_text}
                      </p>
                    </div>
                  )}

                  {/* Anonim Karar Anketi */}
                  {post.poll && onVotePoll && (
                    <PollBlock
                      postId={post.id}
                      poll={post.poll}
                      onVote={(optionId) => onVotePoll(post.id, optionId)}
                    />
                  )}

                  {/* Etiketler */}
                  {post.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {post.tags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => onTagClick(tag)}
                          className="rounded-full border border-emerald-400/20 bg-[#071212] px-2.5 py-0.5 font-mono text-[11px] text-emerald-300/90 transition hover:border-emerald-400/50 hover:bg-emerald-500/15"
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Alt Kutlama Tepkileri (Küçük Zaferlere Özel İfadeler) */}
                <div className="mt-5 border-t border-emerald-400/15 pt-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCelebrationReact(post.id, 'yanindayim')}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                          userReactions.includes('yanindayim')
                            ? 'border-amber-400/60 bg-amber-500/20 text-amber-200 shadow-sm shadow-amber-500/20'
                            : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-amber-400/40 hover:text-amber-200'
                        }`}
                      >
                        <span>👏</span>
                        <span>Gurur Duydum</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCelebrationReact(post.id, 'ayni_durumdayim')}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                          userReactions.includes('ayni_durumdayim')
                            ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200 shadow-sm shadow-emerald-500/20'
                            : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-emerald-400/40 hover:text-emerald-200'
                        }`}
                      >
                        <Sprout className="h-3.5 w-3.5 text-emerald-300" />
                        <span>Umut Oldu</span>
                        <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-200">
                          {post.same_here_count}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCelebrationReact(post.id, 'seni_anliyorum')}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition ${
                          userReactions.includes('seni_anliyorum')
                            ? 'border-teal-400/60 bg-teal-500/20 text-teal-200'
                            : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-teal-400/40 hover:text-teal-200'
                        }`}
                      >
                        <Heart className="h-3.5 w-3.5 text-emerald-300" />
                        <span className="tabular-nums">{post.empathy_count}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onShare(post)}
                        title="Zafer Kartı Oluştur / İndir"
                        className="rounded-xl p-1.5 text-slate-400 transition hover:bg-emerald-500/10 hover:text-emerald-200"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onBookmark(post.id)}
                        title={post.is_bookmarked ? 'Kaydedilenlerden çıkar' : 'İlham için kaydet'}
                        className={`rounded-xl p-1.5 transition ${
                          post.is_bookmarked
                            ? 'bg-amber-500/15 text-amber-300'
                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                        }`}
                      >
                        <Bookmark
                          className="h-3.5 w-3.5"
                          fill={post.is_bookmarked ? 'currentColor' : 'none'}
                        />
                      </button>
                      <Link
                        href={`/post/${post.id}`}
                        className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs text-emerald-200/80 transition hover:bg-emerald-500/10 hover:text-emerald-200"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span>{post.comment_count}</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
