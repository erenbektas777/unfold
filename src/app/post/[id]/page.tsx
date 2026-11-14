'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  Check,
  Clock,
  CornerDownRight,
  Edit3,
  EyeOff,
  Flag,
  HandHeart,
  Heart,
  Link2,
  Lock,
  MessageCircle,
  Send,
  Share2,
  Sparkles,
  Sprout,
  Trash2,
  Unlock,
  Users,
} from 'lucide-react';
import { AuthModal } from '@/components/AuthModal';
import { Avatar } from '@/components/Avatar';
import { CrisisModal } from '@/components/CrisisModal';
import { Navbar } from '@/components/Navbar';
import { PollBlock } from '@/components/PollBlock';
import { estimateReadingTime, formatExpiryRemaining, formatRelativeTime } from '@/components/PostCard';
import { PostComposerModal } from '@/components/PostComposerModal';
import { ShareCardModal } from '@/components/ShareCardModal';
import { MOODS, REPLY_MODES, TIER_INFO } from '@/lib/constants';
import { CommentNode, Post, Profile, ReactionType, ReplyMode } from '@/lib/types';

const SUPPORT_TEMPLATES = [
  'Ben de çok benzer bir süreçten geçtim, yalnız değilsin.',
  'Seni çok iyi anlıyorum; hissettiklerin son derece doğal.',
  'Tavsiye vermeden sadece yanında olduğumu bilmeni istedim.',
  'Kendine karşı biraz daha şefkatli ol, bu yükü tek başına taşımak zorunda değilsin.',
];

const JUDGMENTAL_NUDGE_REGEX =
  /\b(abartıyorsun|abartma|senin\s*suçun|saçmalama|saçmalamışsın|kafaya\s*takma|sen\s*hatalısın|boş\s*yapma|şımarıklık|ağlama\s*artık)\b/i;

function CommentItem({
  node,
  depth = 0,
  canReply,
  isPostAuthor,
  currentUserId,
  onReply,
  onReact,
  onReport,
  onToggleHelpful,
  onHideByAuthor,
}: {
  node: CommentNode;
  depth?: number;
  canReply: boolean;
  isPostAuthor: boolean;
  currentUserId?: string;
  onReply: (commentId: string, username: string) => void;
  onReact: (commentId: string) => void;
  onReport: (commentId: string) => void;
  onToggleHelpful: (commentId: string) => void;
  onHideByAuthor: (commentId: string) => void;
}) {
  const tier = TIER_INFO[node.author_tier];
  const [confirmHide, setConfirmHide] = useState(false);

  return (
    <div className={`${depth > 0 ? 'ml-5 border-l border-white/10 pl-4 sm:ml-7' : ''}`}>
      <div
        className={`rounded-xl border p-3.5 transition ${
          node.is_helpful
            ? 'border-emerald-400/40 bg-emerald-950/20'
            : 'border-white/5 bg-[#101624]/90'
        }`}
      >
        {node.is_helpful && (
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-200">
            <Sparkles className="h-3 w-3 text-emerald-300" />
            <span>Paylaşım sahibine iyi geldi</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Avatar seed={node.author_avatar_seed} size={26} />
            <span className="text-xs font-medium text-slate-200">{node.author_username}</span>
            <span className={`rounded-full border px-1.5 py-0.5 text-[10px] ${tier.badgeClass}`}>
              {tier.label}
            </span>
            <span className="text-[11px] text-slate-500">{formatRelativeTime(node.created_at)}</span>
          </div>

          <div className="flex items-center gap-2">
            {isPostAuthor && node.author_id !== currentUserId && (
              confirmHide ? (
                <div className="flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px]">
                  <span className="text-amber-200">Gizlensin mi?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmHide(false);
                      onHideByAuthor(node.id);
                    }}
                    className="font-semibold text-rose-300 hover:underline"
                  >
                    Evet
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmHide(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    İptal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmHide(true)}
                  title="Paylaşım sahibi olarak bu yorumu gizle"
                  className="text-slate-500 transition hover:text-amber-300"
                >
                  <EyeOff className="h-3.5 w-3.5" />
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => onReport(node.id)}
              title="Şikayet Et"
              className="text-slate-500 transition hover:text-rose-300"
            >
              <Flag className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
          {node.content}
        </p>

        <div className="mt-2.5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onReact(node.id)}
            className={`flex items-center gap-1 text-xs transition ${
              node.user_reacted ? 'text-rose-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Heart className="h-3.5 w-3.5" />
            <span>{node.empathy_count}</span>
          </button>

          {canReply && depth < 3 && (
            <button
              type="button"
              onClick={() => onReply(node.id, node.author_username)}
              className="flex items-center gap-1 text-xs text-slate-400 transition hover:text-violet-300"
            >
              <CornerDownRight className="h-3.5 w-3.5" />
              <span>Yanıtla</span>
            </button>
          )}

          {/* #6 "Bana İyi Geldi" Yazar Onayı */}
          {isPostAuthor && node.author_id !== currentUserId && (
            <button
              type="button"
              onClick={() => onToggleHelpful(node.id)}
              className={`ml-auto inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition ${
                node.is_helpful
                  ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200'
                  : 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-emerald-400/30 hover:text-emerald-200'
              }`}
            >
              <Sparkles className="h-3 w-3" />
              <span>{node.is_helpful ? 'Bana İyi Geldi ✓' : 'Bana İyi Geldi'}</span>
            </button>
          )}
        </div>
      </div>

      {node.replies.length > 0 && (
        <div className="mt-2.5 space-y-2.5">
          {node.replies.map((child) => (
            <CommentItem
              key={child.id}
              node={child}
              depth={depth + 1}
              canReply={canReply}
              isPostAuthor={isPostAuthor}
              currentUserId={currentUserId}
              onReply={onReply}
              onReact={onReact}
              onReport={onReport}
              onToggleHelpful={onToggleHelpful}
              onHideByAuthor={onHideByAuthor}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const postId = params.id;

  const [user, setUser] = useState<Profile | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<CommentNode[]>([]);
  const [similarPosts, setSimilarPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editReplyMode, setEditReplyMode] = useState<ReplyMode>('open');
  const [editError, setEditError] = useState('');

  // #2 Sonra Ne Oldu? Güncelleme State'i
  const [updatingStory, setUpdatingStory] = useState(false);
  const [storyUpdateText, setStoryUpdateText] = useState('');
  const [storyUpdateError, setStoryUpdateError] = useState('');

  const [commentText, setCommentText] = useState('');
  const [replyTarget, setReplyTarget] = useState<{ id: string; username: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [reportNotice, setReportNotice] = useState('');

  const [authOpen, setAuthOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [crisisOpen, setCrisisOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [confirmDeletePost, setConfirmDeletePost] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const loadData = useCallback(async () => {
    const [authRes, postRes] = await Promise.all([
      fetch('/api/auth'),
      fetch(`/api/posts/${postId}`),
    ]);
    const authData = await authRes.json();
    setUser(authData.user || null);

    if (postRes.ok) {
      const postData = await postRes.json();
      setPost(postData.post);
      setEditTitle(postData.post.title);
      setEditContent(postData.post.content);
      setEditReplyMode(postData.post.reply_mode);
      setStoryUpdateText(postData.post.update_text || '');
      setComments(postData.comments || []);
      setSimilarPosts(postData.similarPosts || []);
    } else {
      setPost(null);
    }
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleReactPost(reactionType: ReactionType) {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    await fetch('/api/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetType: 'post', targetId: postId, reactionType }),
    });
    loadData();
  }

  async function handleBookmark() {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    await fetch('/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId }),
    });
    loadData();
  }

  async function handleVotePoll(optionId: string) {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    const res = await fetch('/api/polls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, optionId }),
    });
    if (res.ok) loadData();
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditError('');
    const res = await fetch(`/api/posts/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editTitle,
        content: editContent,
        replyMode: editReplyMode,
      }),
    });
    const data = await res.json();
    if (data.crisis) {
      setCrisisOpen(true);
      return;
    }
    if (!res.ok) {
      setEditError(data.error || 'Güncellenemedi.');
      return;
    }
    setEditing(false);
    loadData();
  }

  // #2 Sonra Ne Oldu? Güncellemesi Kaydetme
  async function handleSaveStoryUpdate(e: React.FormEvent) {
    e.preventDefault();
    setStoryUpdateError('');
    const res = await fetch(`/api/posts/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_update',
        updateText: storyUpdateText,
      }),
    });
    const data = await res.json();
    if (data.crisis) {
      setCrisisOpen(true);
      return;
    }
    if (!res.ok) {
      setStoryUpdateError(data.error || 'Güncelleme kaydedilemedi.');
      return;
    }
    setUpdatingStory(false);
    loadData();
  }

  // #9 Yazar Öz-Moderasyonu: Tek tıkla yorumları kilitle / aç
  async function handleQuickToggleReplyMode() {
    if (!post) return;
    const nextMode: ReplyMode = post.reply_mode === 'empathy_only' ? 'open' : 'empathy_only';
    const res = await fetch(`/api/posts/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'set_reply_mode',
        replyMode: nextMode,
      }),
    });
    if (res.ok) loadData();
  }

  async function handleDeletePost() {
    const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/');
    }
  }

  function handleCopyLink() {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  }

  async function handleReactComment(commentId: string) {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    await fetch('/api/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetType: 'comment', targetId: commentId, reactionType: 'seni_anliyorum' }),
    });
    loadData();
  }

  // #6 "Bana İyi Geldi" İşaretleme
  async function handleToggleHelpful(commentId: string) {
    const res = await fetch('/api/comments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId, action: 'toggle_helpful' }),
    });
    if (res.ok) loadData();
  }

  // #9 Yazar tarafından yorumu gizleme
  async function handleHideCommentByAuthor(commentId: string) {
    const res = await fetch('/api/comments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId, action: 'hide_by_post_author' }),
    });
    if (res.ok) loadData();
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setCommentError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          parentId: replyTarget?.id || null,
          content: commentText,
        }),
      });
      const data = await res.json();
      if (data.crisis) {
        setCrisisOpen(true);
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Yorum gönderilemedi.');
      setCommentText('');
      setReplyTarget(null);
      loadData();
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReport(targetType: 'post' | 'comment', targetId: string) {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetType, targetId, reason: 'Topluluk kurallarına aykırı içerik' }),
    });
    if (res.ok) {
      setReportNotice('Bildirimin moderasyon ekibine iletildi. Teşekkürler.');
      setTimeout(() => setReportNotice(''), 4000);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    setUser(null);
    loadData();
  }

  const isAuthor = Boolean(user && post && user.id === post.author_id);
  const showEmpathyNudge = JUDGMENTAL_NUDGE_REGEX.test(commentText);

  return (
    <div className="min-h-screen bg-[#080c14]">
      <Navbar
        user={user}
        onOpenAuth={() => setAuthOpen(true)}
        onOpenComposer={() => setComposerOpen(true)}
        onLogout={handleLogout}
      />

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-slate-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Akışa Dön
            </a>
            {post?.is_daily_win && (
              <a
                href="/?sort=daily_wins"
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/25"
              >
                <Sprout className="h-3.5 w-3.5 text-emerald-300" />
                <span>Küçük Zaferler Bahçesine Dön</span>
              </a>
            )}
          </div>
        </div>

        {reportNotice && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-200">
            {reportNotice}
          </div>
        )}

        {loading ? (
          <div className="h-64 animate-pulse rounded-2xl bg-[#101624]" />
        ) : !post ? (
          <div className="rounded-2xl border border-white/10 bg-[#101624] p-10 text-center text-slate-300">
            Bu paylaşım bulunamadı veya süresi dolup kaldırılmış olabilir.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-8">
              <article
                className={`rounded-2xl border p-6 ${
                  post.is_daily_win
                    ? 'border-emerald-400/30 bg-gradient-to-br from-[#0c221d] via-[#0e1b22] to-[#101624]'
                    : 'border-white/10 bg-[#101624]'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar seed={post.author_avatar_seed} size={40} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-100">{post.author_username}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] ${TIER_INFO[post.author_tier].badgeClass}`}>
                          {TIER_INFO[post.author_tier].label}
                        </span>
                      </div>
                      <div className="font-mono text-xs text-slate-500">
                        {post.category_name} · {formatRelativeTime(post.created_at)} ·{' '}
                        {estimateReadingTime(post.content)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {post.is_daily_win && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-200">
                        🌱 Küçük Zafer
                      </span>
                    )}
                    {post.expires_at && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] text-amber-300">
                        <Clock className="h-3 w-3" />
                        {formatExpiryRemaining(post.expires_at)}
                      </span>
                    )}
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs ${MOODS[post.mood].color}`}>
                      {MOODS[post.mood].label}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      title="Paylaşım Bağlantısını Kopyala"
                      className="inline-flex items-center gap-1 rounded-lg p-1.5 text-xs text-slate-400 transition hover:bg-white/5 hover:text-sky-300"
                    >
                      {linkCopied ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-400" />
                          <span className="text-[11px] text-emerald-300">Kopyalandı</span>
                        </>
                      ) : (
                        <Link2 className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShareOpen(true)}
                      title="Anonim Hikaye Kartı İndir / Paylaş"
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-violet-300"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleBookmark}
                      title={post.is_bookmarked ? 'Kaydedilenlerden çıkar' : 'Kaydet'}
                      className={`rounded-lg p-1.5 transition ${
                        post.is_bookmarked ? 'text-amber-300' : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'
                      }`}
                    >
                      <Bookmark className="h-4 w-4" fill={post.is_bookmarked ? 'currentColor' : 'none'} />
                    </button>
                    {isAuthor ? (
                      <>
                        <button
                          type="button"
                          onClick={handleQuickToggleReplyMode}
                          title={
                            post.reply_mode === 'empathy_only'
                              ? 'Yorumları tekrar aç'
                              : 'Yorumları kapat (Sadece empati)'
                          }
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-amber-300"
                        >
                          {post.reply_mode === 'empathy_only' ? (
                            <Unlock className="h-4 w-4" />
                          ) : (
                            <Lock className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(!editing)}
                          title="Düzenle"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-violet-300"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        {confirmDeletePost ? (
                          <div className="flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/15 px-2 py-1 text-xs">
                            <span className="text-rose-200">Silinsin mi?</span>
                            <button
                              type="button"
                              onClick={handleDeletePost}
                              className="font-semibold text-rose-300 hover:underline"
                            >
                              Evet
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeletePost(false)}
                              className="text-slate-400 hover:text-white"
                            >
                              İptal
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeletePost(true)}
                            title="Sil"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-rose-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleReport('post', post.id)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-rose-300"
                        title="Şikayet Et"
                      >
                        <Flag className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {editing ? (
                  <form onSubmit={handleSaveEdit} className="mt-4 space-y-3">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      required
                      minLength={5}
                      className="w-full rounded-xl border border-white/15 bg-[#080c14] px-3.5 py-2 text-sm text-slate-100 focus:outline-none"
                    />
                    <textarea
                      rows={5}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      required
                      minLength={15}
                      className="w-full rounded-xl border border-white/15 bg-[#080c14] px-3.5 py-2 text-sm text-slate-100 focus:outline-none"
                    />
                    <select
                      value={editReplyMode}
                      onChange={(e) => setEditReplyMode(e.target.value as ReplyMode)}
                      className="rounded-xl border border-white/15 bg-[#080c14] px-3 py-2 text-xs text-slate-200"
                    >
                      {Object.entries(REPLY_MODES).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                    {editError && <p className="text-xs text-rose-300">{editError}</p>}
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditing(false)}
                        className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-slate-300"
                      >
                        Vazgeç
                      </button>
                      <button
                        type="submit"
                        className="rounded-xl bg-violet-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-violet-400"
                      >
                        Kaydet
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <h1 className="mt-4 font-serif text-2xl font-semibold leading-snug tracking-tight text-slate-50 sm:text-3xl">
                      {post.title}
                    </h1>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-[1.8] text-slate-200/95 sm:text-base">
                      {post.content}
                    </p>
                  </>
                )}

                {/* #2 Sonra Ne Oldu? Hikaye Güncellemesi Bloğu */}
                {post.update_text && !updatingStory && (
                  <div className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-300">
                        <Sparkles className="h-4 w-4" />
                        <span>Sonra Ne Oldu? · Yazar Güncellemesi</span>
                      </div>
                      {post.updated_story_at && (
                        <span className="font-mono text-[11px] text-emerald-200/70">
                          {formatRelativeTime(post.updated_story_at)}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-emerald-100">
                      {post.update_text}
                    </p>
                  </div>
                )}

                {isAuthor && (
                  <div className="mt-4">
                    {!updatingStory ? (
                      <button
                        type="button"
                        onClick={() => setUpdatingStory(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/20"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>
                          {post.update_text
                            ? '"Sonra Ne Oldu?" Güncellemesini Düzenle'
                            : '"Sonra Ne Oldu?" Güncellemesi Ekle'}
                        </span>
                      </button>
                    ) : (
                      <form
                        onSubmit={handleSaveStoryUpdate}
                        className="mt-2 space-y-2.5 rounded-xl border border-emerald-400/30 bg-[#080c14] p-4"
                      >
                        <div className="text-xs font-semibold text-emerald-300">
                          Sonra Ne Oldu? (Destek verenlerle sürecin nasıl ilerlediğini paylaş)
                        </div>
                        <textarea
                          rows={3}
                          required
                          minLength={5}
                          value={storyUpdateText}
                          onChange={(e) => setStoryUpdateText(e.target.value)}
                          placeholder="Örn: Dün akşam konuşmayı başardım ve üzerimden büyük bir yük kalktı..."
                          className="w-full rounded-xl border border-white/10 bg-[#101624] p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-400/50 focus:outline-none"
                        />
                        {storyUpdateError && <p className="text-xs text-rose-300">{storyUpdateError}</p>}
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setUpdatingStory(false)}
                            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300"
                          >
                            Vazgeç
                          </button>
                          <button
                            type="submit"
                            className="rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
                          >
                            Güncellemeyi Yayınla
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* #5 Anonim Karar Anketi */}
                {post.poll && (
                  <PollBlock
                    postId={post.id}
                    poll={post.poll}
                    onVote={handleVotePoll}
                  />
                )}

                {post.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {post.tags.map((t) => (
                      <Link
                        key={t}
                        href={`/?tag=${encodeURIComponent(t)}`}
                        className="rounded-full border border-white/10 bg-[#080c14] px-2.5 py-0.5 font-mono text-[11px] text-sky-300 hover:border-sky-400/40"
                      >
                        #{t}
                      </Link>
                    ))}
                  </div>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-white/10 pt-4">
                  <button
                    type="button"
                    onClick={() => handleReactPost('ayni_durumdayim')}
                    className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-medium transition ${
                      post.user_reactions?.includes('ayni_durumdayim')
                        ? post.is_daily_win
                          ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200'
                          : 'border-violet-400/50 bg-violet-500/20 text-violet-200'
                        : 'border-white/10 bg-white/[0.02] text-slate-200 hover:border-violet-400/30'
                    }`}
                  >
                    {post.is_daily_win ? <Sprout className="h-4 w-4 text-emerald-300" /> : <Users className="h-4 w-4" />}
                    <span>
                      {post.is_daily_win
                        ? `Bana Umut Oldu (${post.same_here_count})`
                        : `Ben de aynı şeyi yaşıyorum (${post.same_here_count})`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReactPost('yanindayim')}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs transition ${
                      post.user_reactions?.includes('yanindayim')
                        ? post.is_daily_win
                          ? 'border-amber-400/50 bg-amber-500/20 text-amber-200'
                          : 'border-sky-400/50 bg-sky-500/20 text-sky-200'
                        : 'border-white/10 bg-white/[0.02] text-slate-300 hover:border-sky-400/30'
                    }`}
                  >
                    {post.is_daily_win ? <span>👏</span> : <HandHeart className="h-4 w-4" />}
                    <span>{post.is_daily_win ? 'Gurur Duydum' : 'Yanındayım'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReactPost('seni_anliyorum')}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs transition ${
                      post.user_reactions?.includes('seni_anliyorum')
                        ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200'
                        : 'border-white/10 bg-white/[0.02] text-slate-300 hover:border-emerald-400/30'
                    }`}
                  >
                    <Heart className="h-4 w-4" />
                    <span>
                      {post.is_daily_win
                        ? `Kalpten Kutluyorum (${post.empathy_count})`
                        : `Seni anlıyorum (${post.empathy_count})`}
                    </span>
                  </button>
                </div>
              </article>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <MessageCircle className="h-4 w-4 text-violet-400" />
                    Topluluk Desteği ({post.comment_count})
                  </h2>
                  <span className="text-xs text-slate-400">{REPLY_MODES[post.reply_mode].label}</span>
                </div>

                {post.reply_mode === 'empathy_only' ? (
                  <div className="rounded-xl border border-white/10 bg-[#101624] p-4 text-xs text-slate-400">
                    Paylaşım sahibi şu an yalnızca sessiz empati tepkileri almak istiyor; yorumlar kapalı.
                  </div>
                ) : (
                  <form onSubmit={handleSubmitComment} className="rounded-2xl border border-white/10 bg-[#101624] p-4">
                    {replyTarget && (
                      <div className="mb-2 flex items-center justify-between rounded-lg bg-violet-500/10 px-3 py-1.5 text-xs text-violet-200">
                        <span>@{replyTarget.username} kullanıcısına yanıt veriyorsun</span>
                        <button
                          type="button"
                          onClick={() => setReplyTarget(null)}
                          className="text-slate-400 hover:text-white"
                        >
                          İptal
                        </button>
                      </div>
                    )}

                    {/* #7 Düşük Sürtünmeli Empati Şablonları */}
                    <div className="mb-2.5">
                      <div className="mb-1.5 text-[11px] text-slate-400">
                        Nasıl başlayacağını bilemiyorsan hızlı empati cümlesi seçebilirsin:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {SUPPORT_TEMPLATES.map((tpl, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() =>
                              setCommentText((prev) => (prev ? `${prev.trim()} ${tpl}` : tpl))
                            }
                            className="rounded-full border border-white/10 bg-[#080c14] px-2.5 py-1 text-left text-[11px] text-slate-300 transition hover:border-violet-400/40 hover:text-violet-200"
                          >
                            + &ldquo;{tpl}&rdquo;
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea
                      rows={3}
                      required
                      minLength={3}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder={
                        user
                          ? 'Benzer bir deneyim yaşadıysan veya destek olmak istiyorsan yaz...'
                          : 'Yorum yazmak için oturum açmalısın...'
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#080c14] p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-400/50 focus:outline-none"
                    />

                    {/* #11 Empatik Yorum Ön-Uyarısı */}
                    {showEmpathyNudge && (
                      <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-amber-400/35 bg-amber-500/10 p-3 text-xs text-amber-200">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                        <div>
                          <span className="font-semibold">Nazik bir hatırlatma:</span> Mesajında karşı
                          tarafın duygularını küçümseyebilecek veya yargılayıcı hissedilebilecek ifadeler
                          olabilir. Yine de gönderebilirsin ama destekleyici bir dil kullanmak paylaşım
                          sahibine çok daha iyi gelecektir.
                        </div>
                      </div>
                    )}

                    {commentError && <p className="mt-2 text-xs text-rose-300">{commentError}</p>}
                    <div className="mt-2.5 flex justify-end">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex items-center gap-1.5 rounded-xl bg-violet-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-400 disabled:opacity-50"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>{submitting ? 'Gönderiliyor...' : 'Destek Yaz'}</span>
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-3">
                  {comments.map((node) => (
                    <CommentItem
                      key={node.id}
                      node={node}
                      canReply={post.reply_mode !== 'empathy_only'}
                      isPostAuthor={isAuthor}
                      currentUserId={user?.id}
                      onReply={(id, uname) => setReplyTarget({ id, username: uname })}
                      onReact={handleReactComment}
                      onReport={(id) => handleReport('comment', id)}
                      onToggleHelpful={handleToggleHelpful}
                      onHideByAuthor={handleHideCommentByAuthor}
                    />
                  ))}
                </div>
              </section>
            </div>

            <aside className="space-y-4 lg:col-span-4">
              <div className="rounded-2xl border border-white/10 bg-[#101624] p-5">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-300">
                  <Sparkles className="h-4 w-4" />
                  Benzer Dertler
                </div>
                <p className="mb-4 text-xs text-slate-400">
                  Ortak etiket ve kategoriye göre seninle aynı durumu yaşayan diğer paylaşımlar:
                </p>

                <div className="space-y-3">
                  {similarPosts.map((sp) => (
                    <Link
                      key={sp.id}
                      href={`/post/${sp.id}`}
                      className="block rounded-xl border border-white/10 bg-[#080c14] p-3.5 transition hover:border-violet-400/40"
                    >
                      <div className="line-clamp-2 text-xs font-medium text-slate-200">{sp.title}</div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                        <span>{sp.same_here_count} kişi aynı durumda</span>
                        <span>{sp.comment_count} yorum</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={() => loadData()} />
      <PostComposerModal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onCreated={() => loadData()}
        onCrisisTriggered={() => setCrisisOpen(true)}
      />
      <CrisisModal open={crisisOpen} onClose={() => setCrisisOpen(false)} />
      <ShareCardModal post={shareOpen ? post : null} onClose={() => setShareOpen(false)} />
    </div>
  );
}
