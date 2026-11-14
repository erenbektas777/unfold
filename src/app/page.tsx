'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Compass,
  EyeOff,
  Flame,
  Hash,
  HelpCircle,
  Layers,
  ShieldCheck,
  Sparkles,
  Sprout,
  Star,
  Tag as TagIcon,
  X,
} from 'lucide-react';
import { AuthModal } from '@/components/AuthModal';
import { BreathingWidget } from '@/components/BreathingWidget';
import { CrisisModal } from '@/components/CrisisModal';
import { DailyWinsView } from '@/components/DailyWinsView';
import { Navbar } from '@/components/Navbar';
import { PostCard } from '@/components/PostCard';
import { PostComposerModal } from '@/components/PostComposerModal';
import { ShareCardModal } from '@/components/ShareCardModal';
import { CATEGORIES, MOODS } from '@/lib/constants';
import { GroupedTags, NotificationItem, Post, Profile, ReactionType } from '@/lib/types';

type SortOption =
  | 'newest'
  | 'daily_wins'
  | 'followed'
  | 'same_here'
  | 'unanswered'
  | 'most_supported'
  | 'for_you';

const MUTED_TAGS_STORAGE_KEY = 'unfold_muted_tags';
const FOLLOWED_CATS_STORAGE_KEY = 'unfold_followed_categories';
const FOLLOWED_TAGS_STORAGE_KEY = 'unfold_followed_tags';

function FeedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [groupedTags, setGroupedTags] = useState<GroupedTags[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState(() => searchParams.get('category') || 'all');
  const [mood, setMood] = useState(() => searchParams.get('mood') || 'all');
  const [activeTag, setActiveTag] = useState<string | null>(() => searchParams.get('tag'));
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [sort, setSort] = useState<SortOption>(() => (searchParams.get('sort') as SortOption) || 'newest');
  const [mutedTags, setMutedTags] = useState<string[]>([]);
  const [followedCategories, setFollowedCategories] = useState<string[]>([]);
  const [followedTags, setFollowedTags] = useState<string[]>([]);

  const [authOpen, setAuthOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerDailyWin, setComposerDailyWin] = useState(false);
  const [composerPreset, setComposerPreset] = useState<{
    title?: string;
    categoryId?: number;
    tags?: string[];
  }>({});
  const [crisisOpen, setCrisisOpen] = useState(false);
  const [sharePost, setSharePost] = useState<Post | null>(null);

  useEffect(() => {
    try {
      const savedMuted = localStorage.getItem(MUTED_TAGS_STORAGE_KEY);
      if (savedMuted) setMutedTags(JSON.parse(savedMuted));

      const savedCats = localStorage.getItem(FOLLOWED_CATS_STORAGE_KEY);
      if (savedCats) {
        const parsed = JSON.parse(savedCats) as string[];
        const valid = parsed.filter((s) => CATEGORIES.some((c) => c.slug === s));
        setFollowedCategories(valid.length > 0 ? valid : ['is-kariyer', 'yalnizlik']);
      } else {
        // İlk kullanımda varsayılan örnek takip edilen konular
        const initialCats = ['is-kariyer', 'yalnizlik'];
        setFollowedCategories(initialCats);
        localStorage.setItem(FOLLOWED_CATS_STORAGE_KEY, JSON.stringify(initialCats));
      }

      const savedTags = localStorage.getItem(FOLLOWED_TAGS_STORAGE_KEY);
      if (savedTags) {
        setFollowedTags(JSON.parse(savedTags));
      } else {
        const initialTags = ['tukenmislik', 'mobbing'];
        setFollowedTags(initialTags);
        localStorage.setItem(FOLLOWED_TAGS_STORAGE_KEY, JSON.stringify(initialTags));
      }
    } catch {
      // ignore localStorage errors
    }
  }, []);

  function toggleMuteTag(tag: string) {
    setMutedTags((prev) => {
      const next = prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag];
      try {
        localStorage.setItem(MUTED_TAGS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    if (activeTag === tag) setActiveTag(null);
  }

  async function toggleFollowCategory(slug: string) {
    setFollowedCategories((prev) => {
      const next = prev.includes(slug) ? prev.filter((c) => c !== slug) : [...prev, slug];
      try {
        localStorage.setItem(FOLLOWED_CATS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    if (user) {
      fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType: 'category', targetSlug: slug }),
      }).catch(() => {});
    }
  }

  async function toggleFollowTag(slug: string) {
    setFollowedTags((prev) => {
      const next = prev.includes(slug) ? prev.filter((t) => t !== slug) : [...prev, slug];
      try {
        localStorage.setItem(FOLLOWED_TAGS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    if (user) {
      fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType: 'tag', targetSlug: slug }),
      }).catch(() => {});
    }
  }

  // URL parametreleri ile state senkronizasyonu
  useEffect(() => {
    const p = new URLSearchParams();
    if (category !== 'all') p.set('category', category);
    if (mood !== 'all') p.set('mood', mood);
    if (activeTag) p.set('tag', activeTag);
    if (search.trim()) p.set('q', search.trim());
    if (sort !== 'newest') p.set('sort', sort);
    const qs = p.toString();
    if (qs !== searchParams.toString()) {
      router.replace(qs ? `/?${qs}` : '/', { scroll: false });
    }
  }, [category, mood, activeTag, search, sort, router, searchParams]);

  const loadUserAndNotifs = useCallback(async () => {
    const authRes = await fetch('/api/auth');
    const authData = await authRes.json();
    setUser(authData.user || null);
    if (authData.user) {
      const [nRes, fRes] = await Promise.all([
        fetch('/api/notifications'),
        fetch('/api/follows'),
      ]);
      const nData = await nRes.json();
      setNotifications(nData.notifications || []);
      if (fRes.ok) {
        const fData = await fRes.json();
        if (
          (Array.isArray(fData.categories) && fData.categories.length > 0) ||
          (Array.isArray(fData.tags) && fData.tags.length > 0)
        ) {
          setFollowedCategories(fData.categories);
          setFollowedTags(fData.tags);
          try {
            localStorage.setItem(FOLLOWED_CATS_STORAGE_KEY, JSON.stringify(fData.categories));
            localStorage.setItem(FOLLOWED_TAGS_STORAGE_KEY, JSON.stringify(fData.tags));
          } catch {
            // ignore
          }
        }
      }
    } else {
      setNotifications([]);
    }
  }, []);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category !== 'all') params.set('category', category);
    if (mood !== 'all') params.set('mood', mood);
    if (activeTag) params.set('tag', activeTag);
    if (search.trim()) params.set('q', search.trim());
    params.set('sort', sort);
    if (sort === 'followed') {
      if (followedCategories.length > 0) {
        params.set('followed_cats', followedCategories.join(','));
      }
      if (followedTags.length > 0) {
        params.set('followed_tags', followedTags.join(','));
      }
    }

    const res = await fetch(`/api/posts?${params.toString()}`);
    const data = await res.json();
    setPosts(data.posts || []);
    setGroupedTags(data.groupedTags || []);
    setLoading(false);
  }, [category, mood, activeTag, search, sort, followedCategories, followedTags]);

  useEffect(() => {
    loadUserAndNotifs();
  }, [loadUserAndNotifs]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadFeed();
    }, 150);
    return () => clearTimeout(timer);
  }, [loadFeed]);

  async function handleReact(postId: string, reactionType: ReactionType) {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    const res = await fetch('/api/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetType: 'post', targetId: postId, reactionType }),
    });
    if (res.ok) loadFeed();
  }

  async function handleBookmark(postId: string) {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    const res = await fetch('/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId }),
    });
    if (res.ok) loadFeed();
  }

  async function handleVotePoll(postId: string, optionId: string) {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    const res = await fetch('/api/polls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, optionId }),
    });
    if (res.ok) loadFeed();
  }

  async function handleLogout() {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    setUser(null);
    setNotifications([]);
    if (sort === 'for_you') setSort('newest');
    loadFeed();
  }

  async function handleMarkNotificationsRead() {
    await fetch('/api/notifications', { method: 'POST' });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  const visiblePosts = posts.filter(
    (p) => !p.tags.some((t) => mutedTags.includes(t))
  );

  const totalFollowedCount = followedCategories.length + followedTags.length;

  const sortTabs = [
    { id: 'newest', label: 'Yeni', icon: Sparkles },
    { id: 'daily_wins', label: 'Küçük Zaferler', icon: Sprout },
    { id: 'followed', label: `Takip Edilenler (${totalFollowedCount})`, icon: Star },
    ...(user ? [{ id: 'for_you', label: 'Sana Özel', icon: Compass }] : []),
    { id: 'same_here', label: 'Aynı Durumdakiler', icon: Flame },
    { id: 'unanswered', label: 'Cevap Bekleyenler', icon: HelpCircle },
    { id: 'most_supported', label: 'En Çok Destek', icon: ShieldCheck },
  ];

  const isWinsMode = sort === 'daily_wins';

  return (
    <div
      className={`min-h-screen transition-colors duration-500 ${
        isWinsMode ? 'bg-[#05100e]' : 'bg-[#080c14]'
      }`}
    >
      <Navbar
        user={user}
        notifications={notifications}
        searchValue={search}
        onSearchChange={setSearch}
        isWinsMode={isWinsMode}
        onToggleWinsMode={() => {
          setCategory('all');
          setActiveTag(null);
          setSort(isWinsMode ? 'newest' : 'daily_wins');
        }}
        onOpenAuth={() => setAuthOpen(true)}
        onOpenComposer={() => {
          setComposerPreset({});
          setComposerDailyWin(isWinsMode);
          setComposerOpen(true);
        }}
        onLogout={handleLogout}
        onMarkNotificationsRead={handleMarkNotificationsRead}
      />

      {/* Mobil Yatay Konu & Ruh Hali Şeridi */}
      <div className="border-b border-white/5 bg-[#0b101b] px-4 py-2.5 lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => {
              setCategory('all');
              setSort('newest');
            }}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs ${
              category === 'all' && sort !== 'followed' && sort !== 'daily_wins'
                ? 'border-violet-400/50 bg-violet-500/20 text-violet-200'
                : 'border-white/10 text-slate-400'
            }`}
          >
            Tüm Konular
          </button>
          <button
            onClick={() => {
              setCategory('all');
              setSort('daily_wins');
            }}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs ${
              sort === 'daily_wins'
                ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200'
                : 'border-white/10 text-slate-400'
            }`}
          >
            🌱 Küçük Zaferler
          </button>
          <button
            onClick={() => {
              setCategory('all');
              setSort('followed');
            }}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs ${
              sort === 'followed'
                ? 'border-amber-400/50 bg-amber-500/20 text-amber-200'
                : 'border-white/10 text-slate-400'
            }`}
          >
            ★ Takip Edilenler ({totalFollowedCount})
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setCategory(c.slug);
                if (sort === 'daily_wins') setSort('newest');
              }}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs ${
                category === c.slug && sort !== 'daily_wins'
                  ? 'border-violet-400/50 bg-violet-500/20 text-violet-200'
                  : 'border-white/10 text-slate-400'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {isWinsMode ? (
        <main className="mx-auto max-w-6xl px-4 py-6">
          <DailyWinsView
            posts={visiblePosts}
            loading={loading}
            onBackToFeed={() => setSort('newest')}
            onOpenWinComposer={(preset) => {
              if (!user) {
                setAuthOpen(true);
              } else {
                setComposerPreset(preset || {});
                setComposerDailyWin(true);
                setComposerOpen(true);
              }
            }}
            onReact={handleReact}
            onBookmark={handleBookmark}
            onVotePoll={handleVotePoll}
            onShare={(p) => setSharePost(p)}
            onTagClick={(tag) => {
              setActiveTag(tag);
              setSort('newest');
            }}
          />
        </main>
      ) : (
        <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-12">
        {/* Sol Kenar Çubuğu (Masaüstü) */}
        <aside className="hidden space-y-5 lg:col-span-3 lg:block">
          {/* Takip Edilen Konular Bölümü */}
          <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-b from-[#131a2c] to-[#101624] p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                Takip Edilen Konular
              </div>
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-200">
                {totalFollowedCount}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setCategory('all');
                setActiveTag(null);
                setSort(sort === 'followed' ? 'newest' : 'followed');
              }}
              className={`mb-3 flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-medium transition ${
                sort === 'followed'
                  ? 'border-amber-400/50 bg-amber-500/20 text-amber-100'
                  : 'border-white/10 bg-[#080c14] text-slate-200 hover:border-amber-400/30'
              }`}
            >
              <span>Takip Ettiklerim Akışı</span>
              <span className="text-[10px] opacity-80">{sort === 'followed' ? 'Aktif ✓' : 'Filtrele →'}</span>
            </button>

            {totalFollowedCount === 0 ? (
              <p className="text-xs leading-relaxed text-slate-400">
                Aşağıdaki konularda veya sağdaki etiketlerde <strong className="text-amber-300">★</strong> ikonuna
                tıklayarak ilgilendiğin dert başlıklarını buraya sabitleyebilirsin.
              </p>
            ) : (
              <div className="space-y-2.5">
                {followedCategories.length > 0 && (
                  <div>
                    <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                      Konular
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {followedCategories.map((slug) => {
                        const catObj = CATEGORIES.find((c) => c.slug === slug);
                        if (!catObj) return null;
                        return (
                          <div
                            key={slug}
                            className={`inline-flex items-center rounded-full border text-xs transition ${
                              category === slug
                                ? 'border-violet-400/50 bg-violet-500/20 text-violet-100'
                                : 'border-white/10 bg-[#080c14] text-slate-200 hover:border-violet-400/30'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setCategory(category === slug ? 'all' : slug)}
                              className="py-1 pl-2.5 pr-1.5 text-[11px]"
                            >
                              {catObj.name}
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleFollowCategory(slug)}
                              title="Takipten çıkar"
                              className="pr-2 text-slate-500 hover:text-rose-300"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {followedTags.length > 0 && (
                  <div>
                    <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                      Ortak Dert Etiketleri
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {followedTags.map((tagSlug) => (
                        <div
                          key={tagSlug}
                          className={`inline-flex items-center rounded-full border font-mono text-[11px] transition ${
                            activeTag === tagSlug
                              ? 'border-sky-400/50 bg-sky-500/20 text-sky-200'
                              : 'border-white/10 bg-[#080c14] text-sky-300 hover:border-sky-400/30'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setActiveTag(activeTag === tagSlug ? null : tagSlug)}
                            className="py-0.5 pl-2.5 pr-1.5"
                          >
                            #{tagSlug}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleFollowTag(tagSlug)}
                            title="Takipten çıkar"
                            className="pr-2 text-slate-500 hover:text-rose-300"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#101624] p-4">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Layers className="h-3.5 w-3.5 text-violet-400" />
              Konular
            </div>
            <p className="mb-2.5 text-[11px] text-slate-500">
              Konuyu takip etmek için sağdaki ★ ikonuna dokun.
            </p>
            <div className="space-y-1">
              <button
                onClick={() => setCategory('all')}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                  category === 'all'
                    ? 'bg-violet-500/15 font-medium text-violet-200'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <span>Tüm Dertler</span>
              </button>
              {CATEGORIES.map((c) => {
                const isFollowed = followedCategories.includes(c.slug);
                return (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between rounded-xl pr-2 transition ${
                      category === c.slug
                        ? 'bg-violet-500/15 font-medium text-violet-200'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setCategory(c.slug)}
                      className="flex-1 py-2 pl-3 pr-2 text-left text-sm"
                    >
                      {c.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFollowCategory(c.slug)}
                      title={isFollowed ? 'Takipten çıkar' : 'Bu konuyu takip et'}
                      className={`rounded-lg p-1.5 transition ${
                        isFollowed
                          ? 'text-amber-400 hover:text-amber-300'
                          : 'text-slate-600 hover:text-slate-300'
                      }`}
                    >
                      <Star className={`h-3.5 w-3.5 ${isFollowed ? 'fill-amber-400' : ''}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#101624] p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Ruh Haline Göre Bul
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setMood('all')}
                className={`rounded-full border px-2.5 py-1 text-xs transition ${
                  mood === 'all'
                    ? 'border-violet-400/50 bg-violet-500/20 text-violet-200'
                    : 'border-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                Tümü
              </button>
              {Object.entries(MOODS).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => setMood(key)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${
                    mood === key ? info.color : 'border-white/10 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {info.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Orta Kolon: Forum Akışı */}
        <section className="space-y-4 lg:col-span-6">
          <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-[#161e33] via-[#111829] to-[#0d1220] p-6">
            <h1 className="font-serif text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl">
              Aynı yoldan geçenlerle buluş, yargılanmadan içini dök.
            </h1>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400 sm:text-sm">
              Gerçek kimliğin gizli kalır. Etiketlerle seninle aynı durumu yaşayanları bulabilir,
              tek tıkla destek olabilirsin.
            </p>
          </div>

          {/* Sıralama Sekmeleri */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-white/10 bg-[#101624] p-1">
              {sortTabs.map((tab) => {
                const Icon = tab.icon;
                const isDailyWinTab = tab.id === 'daily_wins';
                const isFollowedTab = tab.id === 'followed';
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSort(tab.id as SortOption)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      sort === tab.id
                        ? isDailyWinTab
                          ? 'bg-emerald-500/20 text-emerald-200'
                          : isFollowedTab
                            ? 'bg-amber-500/20 text-amber-200'
                            : 'bg-violet-500/20 text-violet-200'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {activeTag && (
              <button
                onClick={() => setActiveTag(null)}
                className="flex items-center gap-1 rounded-full border border-sky-400/40 bg-sky-500/15 px-3 py-1 text-xs text-sky-200"
              >
                <Hash className="h-3 w-3" />
                <span>{activeTag}</span>
                <X className="ml-1 h-3 w-3" />
              </button>
            )}
          </div>

          {/* Gönderi Listesi */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-44 animate-pulse rounded-2xl border border-white/5 bg-[#101624]/60"
                />
              ))}
            </div>
          ) : visiblePosts.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#101624] p-10 text-center">
              <p className="text-sm text-slate-300">
                {sort === 'followed' && totalFollowedCount === 0
                  ? 'Henüz takip ettiğin bir konu veya etiket yok. Sol menüden ★ ikonuna basarak konu takip edebilirsin.'
                  : 'Bu filtrelerde henüz bir paylaşım yok.'}
              </p>
              <button
                onClick={() => {
                  setCategory('all');
                  setMood('all');
                  setActiveTag(null);
                  setSearch('');
                  setSort('newest');
                }}
                className="mt-3 rounded-xl border border-white/10 px-4 py-2 text-xs text-violet-300 hover:bg-white/5"
              >
                Tüm Akışa Dön
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {visiblePosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onTagClick={(tag) => setActiveTag(tag)}
                  onReact={handleReact}
                  onBookmark={handleBookmark}
                  onVotePoll={handleVotePoll}
                  onShare={(p) => setSharePost(p)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Sağ Kenar Çubuğu */}
        <aside className="space-y-5 lg:col-span-3">
          {/* #4 60 Saniyelik Nefes Molası Widget'ı */}
          <BreathingWidget />

          {/* #10 Sessize Alınan Etiketler */}
          {mutedTags.length > 0 && (
            <div className="rounded-2xl border border-amber-400/20 bg-[#101624] p-4">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-amber-300">
                <span className="flex items-center gap-1.5">
                  <EyeOff className="h-3.5 w-3.5" />
                  Sessize Alınan Etiketler
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMutedTags([]);
                    try {
                      localStorage.removeItem(MUTED_TAGS_STORAGE_KEY);
                    } catch {
                      // ignore
                    }
                  }}
                  className="text-[11px] text-slate-400 hover:text-slate-200"
                >
                  Tümünü Aç
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {mutedTags.map((mt) => (
                  <button
                    key={mt}
                    type="button"
                    onClick={() => toggleMuteTag(mt)}
                    title="Sessizden çıkar"
                    className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[11px] text-amber-200 hover:bg-amber-500/20"
                  >
                    <span>#{mt}</span>
                    <X className="h-3 w-3" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-[#101624] p-4">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <TagIcon className="h-3.5 w-3.5 text-sky-400" />
              Konulara Göre Ortak Dertler
            </div>
            <p className="mb-3 text-[11px] text-slate-500">
              ★ ile etiketi takip et, göz ikonuyla akışında gizle.
            </p>
            <div className="space-y-3.5">
              {groupedTags.map((group) => (
                <div key={group.category_slug} className="border-b border-white/5 pb-3 last:border-none last:pb-0">
                  <button
                    type="button"
                    onClick={() =>
                      setCategory(category === group.category_slug ? 'all' : group.category_slug)
                    }
                    className={`mb-2 block text-left text-[11px] font-semibold uppercase tracking-wide transition ${
                      category === group.category_slug
                        ? 'text-violet-300'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {group.category_name}
                  </button>
                  <div className="flex flex-wrap gap-1.5">
                    {group.tags
                      .filter((t) => !mutedTags.includes(t.slug))
                      .map((t) => {
                        const isTagFollowed = followedTags.includes(t.slug);
                        return (
                          <div
                            key={t.id}
                            className={`inline-flex items-center rounded-full border font-mono text-[11px] transition ${
                              activeTag === t.slug
                                ? 'border-sky-400/50 bg-sky-500/20 text-sky-200'
                                : 'border-white/10 bg-[#080c14] text-slate-300 hover:border-sky-400/30'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setActiveTag(activeTag === t.slug ? null : t.slug)}
                              className="py-0.5 pl-2.5 pr-1"
                            >
                              #{t.name}
                              <span className="ml-1 text-[10px] text-slate-500">{t.usage_count}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleFollowTag(t.slug)}
                              title={isTagFollowed ? `#${t.name} takibini bırak` : `#${t.name} etiketini takip et`}
                              className={`px-1 transition ${
                                isTagFollowed
                                  ? 'text-amber-400 hover:text-amber-300'
                                  : 'text-slate-500 hover:text-amber-300'
                              }`}
                            >
                              <Star className={`h-3 w-3 ${isTagFollowed ? 'fill-amber-400' : ''}`} />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleMuteTag(t.slug)}
                              title={`#${t.name} etiketini akışımda gizle`}
                              className="pr-2 text-slate-500 transition hover:text-rose-300"
                            >
                              <EyeOff className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#101624] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
              Güvenli Alan Protokolü
            </div>
            <ul className="mt-2.5 space-y-2 text-xs leading-relaxed text-slate-400">
              <li>• Telefon, e-posta ve sosyal medya hesapları otomatik engellenir.</li>
              <li>• Kriz anlarında 112 &amp; ALO 183 destek hatlarına yönlendirme yapılır.</li>
              <li>• Kademeli Güven Skoru ile trolleme ve zorbalık önlenir.</li>
            </ul>
          </div>
        </aside>
        </main>
      )}

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={(u) => {
          setUser(u);
          loadUserAndNotifs();
          loadFeed();
        }}
      />

      <PostComposerModal
        open={composerOpen}
        defaultDailyWin={composerDailyWin}
        initialTitle={composerPreset.title}
        initialCategoryId={composerPreset.categoryId}
        initialTags={composerPreset.tags}
        onClose={() => setComposerOpen(false)}
        onCreated={() => loadFeed()}
        onCrisisTriggered={() => setCrisisOpen(true)}
      />

      <CrisisModal open={crisisOpen} onClose={() => setCrisisOpen(false)} />
      <ShareCardModal post={sharePost} onClose={() => setSharePost(null)} />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080c14]" />}>
      <FeedContent />
    </Suspense>
  );
}
