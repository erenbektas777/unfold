'use client';

import Link from 'next/link';
import { Bookmark, Clock, HandHeart, Heart, MessageCircle, Share2, Sparkles, Users } from 'lucide-react';
import { MOODS, REPLY_MODES, TIER_INFO } from '@/lib/constants';
import { Post, ReactionType } from '@/lib/types';
import { Avatar } from './Avatar';
import { PollBlock } from './PollBlock';

interface PostCardProps {
  post: Post;
  onTagClick?: (tag: string) => void;
  onReact: (postId: string, type: ReactionType) => void;
  onBookmark?: (postId: string) => void;
  onVotePoll?: (postId: string, optionId: string) => void;
  onShare?: (post: Post) => void;
}

export function formatRelativeTime(iso: string): string {
  const normalized = iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z';
  const diffMs = Date.now() - new Date(normalized).getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

export function formatExpiryRemaining(iso: string): string {
  const normalized = iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z';
  const diffMs = new Date(normalized).getTime() - Date.now();
  if (diffMs <= 0) return 'Süresi doldu';
  const hours = Math.ceil(diffMs / 3600000);
  if (hours < 24) return `${hours} sa sonra silinecek`;
  const days = Math.ceil(hours / 24);
  return `${days} gün sonra silinecek`;
}

export function estimateReadingTime(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.ceil(words / 180));
  return `~${mins} dk okuma`;
}

const MOOD_BORDER: Record<string, string> = {
  uzgun: 'border-l-blue-400/60',
  bunaldim: 'border-l-violet-400/60',
  kararsiz: 'border-l-amber-400/60',
  ofkeli: 'border-l-rose-400/60',
  yalniz: 'border-l-indigo-400/60',
  umutlu: 'border-l-emerald-400/60',
};

export function PostCard({
  post,
  onTagClick,
  onReact,
  onBookmark,
  onVotePoll,
  onShare,
}: PostCardProps) {
  const mood = MOODS[post.mood];
  const tier = TIER_INFO[post.author_tier];
  const replyMode = REPLY_MODES[post.reply_mode];
  const userReactions = post.user_reactions || [];
  const moodBorder = post.is_daily_win
    ? 'border-l-emerald-400/80'
    : MOOD_BORDER[post.mood] || 'border-l-violet-400/50';

  return (
    <article
      className={`group rounded-2xl border border-white/10 border-l-4 ${moodBorder} ${
        post.is_daily_win
          ? 'bg-gradient-to-br from-[#0d1f1d] to-[#0b1320] hover:border-emerald-400/40'
          : 'bg-gradient-to-br from-[#111827] to-[#0d1320] hover:border-violet-400/30'
      } p-5 transition`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Avatar seed={post.author_avatar_seed} size={34} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-200">{post.author_username}</span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${tier.badgeClass}`}>
                {tier.label}
              </span>
            </div>
            <div className="font-mono text-[11px] text-slate-500">
              {post.category_name} · {formatRelativeTime(post.created_at)} · {estimateReadingTime(post.content)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {post.is_daily_win && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-200">
              🌱 Küçük Zafer
            </span>
          )}
          {post.expires_at && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
              <Clock className="h-3 w-3" />
              {formatExpiryRemaining(post.expires_at)}
            </span>
          )}
          <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${mood.color}`}>
            {mood.label}
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] text-slate-400">
            {replyMode.label}
          </span>
        </div>
      </div>

      <Link href={`/post/${post.id}`} className="mt-3.5 block">
        <h3 className="font-serif text-lg font-semibold leading-snug tracking-tight text-slate-50 transition group-hover:text-violet-200 sm:text-xl">
          {post.title}
        </h3>
        <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-slate-300/90">
          {post.content}
        </p>
      </Link>

      {/* #2 Sonra Ne Oldu? Hikaye Güncellemesi */}
      {post.update_text && (
        <div className="mt-3 rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Sonra Ne Oldu? · Güncelleme</span>
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-emerald-100/90">
            {post.update_text}
          </p>
        </div>
      )}

      {/* #5 Anonim Karar Anketi */}
      {post.poll && onVotePoll && (
        <PollBlock
          postId={post.id}
          poll={post.poll}
          onVote={(optionId) => onVotePoll(post.id, optionId)}
        />
      )}

      {post.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onTagClick?.(tag)}
              className="rounded-full border border-white/10 bg-[#080c14] px-2.5 py-0.5 font-mono text-[11px] text-sky-300/90 transition hover:border-sky-400/40 hover:bg-sky-500/10"
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onReact(post.id, 'ayni_durumdayim')}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
              userReactions.includes('ayni_durumdayim')
                ? 'border-violet-400/50 bg-violet-500/20 text-violet-200'
                : 'border-white/10 bg-white/[0.02] text-slate-300 hover:border-violet-400/30 hover:text-violet-200'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Ben de yaşıyorum</span>
            <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px]">{post.same_here_count}</span>
          </button>

          <button
            type="button"
            onClick={() => onReact(post.id, 'yanindayim')}
            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs transition ${
              userReactions.includes('yanindayim')
                ? 'border-sky-400/50 bg-sky-500/20 text-sky-200'
                : 'border-white/10 bg-white/[0.02] text-slate-400 hover:text-slate-200'
            }`}
          >
            <HandHeart className="h-3.5 w-3.5" />
            <span>Yanındayım</span>
          </button>

          <button
            type="button"
            onClick={() => onReact(post.id, 'seni_anliyorum')}
            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs transition ${
              userReactions.includes('seni_anliyorum')
                ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200'
                : 'border-white/10 bg-white/[0.02] text-slate-400 hover:text-slate-200'
            }`}
          >
            <Heart className="h-3.5 w-3.5" />
            <span className="tabular-nums">{post.empathy_count}</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {onShare && (
            <button
              type="button"
              onClick={() => onShare(post)}
              title="Hikaye Kartı Oluştur / Paylaş"
              className="rounded-xl p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-violet-300"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          )}
          {onBookmark && (
            <button
              type="button"
              onClick={() => onBookmark(post.id)}
              title={post.is_bookmarked ? 'Kaydedilenlerden çıkar' : 'Kaydet'}
              className={`rounded-xl p-1.5 transition ${
                post.is_bookmarked
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <Bookmark className="h-3.5 w-3.5" fill={post.is_bookmarked ? 'currentColor' : 'none'} />
            </button>
          )}
          <Link
            href={`/post/${post.id}`}
            className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span>{post.comment_count} yorum</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
