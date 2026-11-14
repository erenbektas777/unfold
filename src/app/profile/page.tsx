'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Bookmark, Check, Edit3, Feather, Shield, ShieldAlert } from 'lucide-react';
import { AuthModal } from '@/components/AuthModal';
import { Avatar } from '@/components/Avatar';
import { CrisisModal } from '@/components/CrisisModal';
import { Navbar } from '@/components/Navbar';
import { PostCard } from '@/components/PostCard';
import { PostComposerModal } from '@/components/PostComposerModal';
import { TIER_INFO } from '@/lib/constants';
import { Post, Profile, ReactionType } from '@/lib/types';

export default function ProfilePage() {
  const [user, setUser] = useState<Profile | null>(null);
  const [usage, setUsage] = useState<{ postsToday: number; commentsToday: number }>({
    postsToday: 0,
    commentsToday: 0,
  });
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'mine' | 'bookmarks'>('mine');
  const [loading, setLoading] = useState(true);

  const [editingName, setEditingName] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [nameError, setNameError] = useState('');

  const [authOpen, setAuthOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [crisisOpen, setCrisisOpen] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    const authRes = await fetch('/api/auth');
    const authData = await authRes.json();
    setUser(authData.user || null);
    if (authData.usage) setUsage(authData.usage);
    if (authData.user) {
      setNewUsername(authData.user.username);
      const [mineRes, bmRes] = await Promise.all([
        fetch('/api/posts?mine=1'),
        fetch('/api/posts?bookmarked=1'),
      ]);
      const [mineData, bmData] = await Promise.all([mineRes.json(), bmRes.json()]);
      setMyPosts(mineData.posts || []);
      setBookmarkedPosts(bmData.posts || []);
    } else {
      setMyPosts([]);
      setBookmarkedPosts([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function handleSaveUsername() {
    setNameError('');
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_username', username: newUsername }),
    });
    const data = await res.json();
    if (!res.ok) {
      setNameError(data.error || 'Rumuz güncellenemedi.');
      return;
    }
    setUser(data.user);
    setEditingName(false);
  }

  async function handleReact(postId: string, reactionType: ReactionType) {
    await fetch('/api/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetType: 'post', targetId: postId, reactionType }),
    });
    loadProfile();
  }

  async function handleBookmark(postId: string) {
    await fetch('/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId }),
    });
    loadProfile();
  }

  async function handleLogout() {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    setUser(null);
    setMyPosts([]);
    setBookmarkedPosts([]);
  }

  const displayedPosts = activeTab === 'mine' ? myPosts : bookmarkedPosts;

  return (
    <div className="min-h-screen bg-[#080c14]">
      <Navbar
        user={user}
        onOpenAuth={() => setAuthOpen(true)}
        onOpenComposer={() => setComposerOpen(true)}
        onLogout={handleLogout}
      />

      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-5 flex items-center justify-between">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Akışa Dön
          </a>
          {user?.is_admin && (
            <Link
              href="/moderation"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#101624] px-3 py-1.5 text-xs text-slate-300 hover:border-violet-400/40"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-violet-300" />
              Moderasyon Paneli
            </Link>
          )}
        </div>

        {loading ? (
          <div className="h-48 animate-pulse rounded-2xl bg-[#101624]" />
        ) : !user ? (
          <div className="rounded-2xl border border-white/10 bg-[#101624] p-10 text-center">
            <p className="text-sm text-slate-300">Anonim profilini ve güven skorunu görmek için giriş yap.</p>
            <button
              onClick={() => setAuthOpen(true)}
              className="mt-4 rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-400"
            >
              Oturum Aç
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-[#101624] p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Avatar seed={user.avatar_seed} size={56} />
                  <div>
                    {editingName ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          className="rounded-lg border border-white/15 bg-[#080c14] px-2.5 py-1 text-sm text-slate-100 focus:outline-none"
                        />
                        <button
                          onClick={handleSaveUsername}
                          className="rounded-lg bg-violet-500 p-1.5 text-white hover:bg-violet-400"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold text-slate-100">{user.username}</h1>
                        <button
                          onClick={() => setEditingName(true)}
                          className="text-slate-400 hover:text-violet-300"
                          title="Rumuzu Düzenle"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    {nameError && <p className="mt-1 text-xs text-rose-300">{nameError}</p>}

                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs ${TIER_INFO[user.account_tier].badgeClass}`}>
                        {TIER_INFO[user.account_tier].label}
                      </span>
                      <span className="text-xs text-slate-400">
                        Günlük kullanım: {usage.postsToday}/{TIER_INFO[user.account_tier].dailyPostLimit} gönderi ·{' '}
                        {usage.commentsToday}/{TIER_INFO[user.account_tier].dailyCommentLimit} yorum
                      </span>
                    </div>
                  </div>
                </div>

                <div className="w-full sm:w-56">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-slate-300">
                      <Shield className="h-3.5 w-3.5 text-violet-400" />
                      Güven Skoru
                    </span>
                    <span className="font-semibold text-violet-300">{user.trust_score} / 100</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-sky-400 transition-all"
                      style={{ width: `${user.trust_score}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Empati tepkileri ve yapıcı destekler skorunu yükseltir.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 border-b border-white/10 pb-2">
              <button
                onClick={() => setActiveTab('mine')}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
                  activeTab === 'mine'
                    ? 'bg-violet-500/20 text-violet-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Feather className="h-3.5 w-3.5" />
                Paylaşımlarım ({myPosts.length})
              </button>
              <button
                onClick={() => setActiveTab('bookmarks')}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
                  activeTab === 'bookmarks'
                    ? 'bg-amber-500/20 text-amber-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bookmark className="h-3.5 w-3.5" />
                Kaydedilenler ({bookmarkedPosts.length})
              </button>
            </div>

            {displayedPosts.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#101624] p-8 text-center text-sm text-slate-400">
                {activeTab === 'mine'
                  ? 'Henüz bir paylaşım yapmadın.'
                  : 'Henüz kaydettiğin bir paylaşım yok.'}
              </div>
            ) : (
              <div className="space-y-3">
                {displayedPosts.map((p) => (
                  <PostCard
                    key={p.id}
                    post={p}
                    onReact={handleReact}
                    onBookmark={handleBookmark}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={() => loadProfile()} />
      <PostComposerModal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onCreated={() => loadProfile()}
        onCrisisTriggered={() => setCrisisOpen(true)}
      />
      <CrisisModal open={crisisOpen} onClose={() => setCrisisOpen(false)} />
    </div>
  );
}
