'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bell, Feather, LogOut, Search, Shield, ShieldAlert, Sprout, User } from 'lucide-react';
import { NotificationItem, Profile } from '@/lib/types';
import { TIER_INFO } from '@/lib/constants';
import { Avatar } from './Avatar';

interface NavbarProps {
  user: Profile | null;
  notifications?: NotificationItem[];
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  isWinsMode?: boolean;
  onToggleWinsMode?: () => void;
  onOpenAuth: () => void;
  onOpenComposer: () => void;
  onLogout: () => void;
  onMarkNotificationsRead?: () => void;
}

export function Navbar({
  user,
  notifications: initialNotifications = [],
  searchValue = '',
  onSearchChange,
  isWinsMode = false,
  onToggleWinsMode,
  onOpenAuth,
  onOpenComposer,
  onLogout,
  onMarkNotificationsRead,
}: NavbarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const [liveNotifs, setLiveNotifs] = useState<NotificationItem[]>(initialNotifications);

  useEffect(() => {
    setLiveNotifs(initialNotifications);
  }, [initialNotifications]);

  // Hafif periyodik bildirim kontrolü (15 sn)
  useEffect(() => {
    if (!user) return;
    let active = true;
    const fetchNotifs = async () => {
      try {
        const res = await fetch('/api/notifications');
        if (!res.ok) return;
        const data = await res.json();
        if (active && Array.isArray(data.notifications)) {
          setLiveNotifs(data.notifications);
        }
      } catch {
        // sessiz geç
      }
    };
    const interval = setInterval(fetchNotifs, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user]);

  const unreadCount = liveNotifs.filter((n) => !n.is_read).length;

  return (
    <>
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors duration-300 ${
          isWinsMode
            ? 'border-emerald-400/20 bg-[#05110f]/90'
            : 'border-white/10 bg-[#080c14]/90'
        }`}
      >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-400/35 bg-gradient-to-br from-violet-500/25 to-sky-500/25 shadow-sm shadow-violet-500/10 transition group-hover:border-violet-400/50">
            <svg
              viewBox="0 0 36 36"
              className="h-6 w-6"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle
                cx="14.5"
                cy="18"
                r="7.5"
                stroke="#c4b5fd"
                strokeWidth="1.9"
                fill="#8b5cf6"
                fillOpacity="0.2"
              />
              <circle
                cx="21.5"
                cy="18"
                r="7.5"
                stroke="#7dd3fc"
                strokeWidth="1.9"
                fill="#38bdf8"
                fillOpacity="0.2"
              />
              <path
                d="M18 14.2C19.35 16.15 19.35 19.85 18 21.8C16.65 19.85 16.65 16.15 18 14.2Z"
                fill="#f8fafc"
              />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-serif text-xl font-semibold tracking-tight text-slate-100">unfold</span>
            {isWinsMode && (
              <span className="hidden rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 sm:inline-block">
                🌱 Zaferler Bahçesi
              </span>
            )}
          </div>
        </Link>

        {onSearchChange && (
          <div className="relative hidden max-w-md flex-1 md:block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={
                isWinsMode
                  ? 'Küçük zaferlerde veya ilham hikayelerinde ara...'
                  : 'Benzer dertleri, etiketleri (#mobbing) veya hisleri ara...'
              }
              className={`w-full rounded-xl border py-2 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none ${
                isWinsMode
                  ? 'border-emerald-400/20 bg-[#0a1b18] focus:border-emerald-400/50'
                  : 'border-white/10 bg-[#101624] focus:border-violet-400/40'
              }`}
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          {onToggleWinsMode && (
            <button
              type="button"
              onClick={onToggleWinsMode}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                isWinsMode
                  ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-100 shadow-sm shadow-emerald-500/20'
                  : 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200 hover:border-emerald-400/45 hover:bg-emerald-500/20'
              }`}
            >
              <Sprout className="h-3.5 w-3.5 text-emerald-300" />
              <span className="hidden sm:inline">
                {isWinsMode ? 'Dertleşme Akışı' : 'Küçük Zaferler'}
              </span>
            </button>
          )}

          <button
            onClick={user ? onOpenComposer : onOpenAuth}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium shadow-lg transition ${
              isWinsMode
                ? 'bg-emerald-400 text-slate-950 shadow-emerald-500/20 hover:bg-emerald-300'
                : 'bg-violet-500 text-white shadow-violet-500/20 hover:bg-violet-400'
            }`}
          >
            {isWinsMode ? <Sprout className="h-4 w-4" /> : <Feather className="h-4 w-4" />}
            <span className="hidden sm:inline">
              {isWinsMode ? 'Zaferini Paylaş' : 'İçini Dök'}
            </span>
          </button>

          {user ? (
            <>
              {user.is_admin && (
                <Link
                  href="/moderation"
                  title="Moderasyon & Güvenlik Paneli"
                  className="hidden rounded-xl border border-white/10 bg-[#101624] p-2 text-slate-300 transition hover:border-violet-400/30 hover:text-violet-200 sm:inline-flex"
                >
                  <ShieldAlert className="h-4 w-4" />
                </Link>
              )}

              <div className="relative">
                <button
                  onClick={() => {
                    const next = !notifOpen;
                    setNotifOpen(next);
                    if (next && unreadCount > 0) {
                      setLiveNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
                      if (onMarkNotificationsRead) {
                        onMarkNotificationsRead();
                      } else {
                        fetch('/api/notifications', { method: 'POST' });
                      }
                    }
                  }}
                  className="relative rounded-xl border border-white/10 bg-[#101624] p-2 text-slate-300 transition hover:bg-white/5"
                  aria-label="Bildirimler"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-white/10 bg-[#101624] p-3 shadow-2xl">
                    <div className="mb-2 flex items-center justify-between px-1">
                      <span className="text-xs font-semibold text-slate-200">Bildirimler</span>
                      <span className="text-[11px] text-slate-500">{liveNotifs.length} kayıt</span>
                    </div>
                    {liveNotifs.length === 0 ? (
                      <p className="py-6 text-center text-xs text-slate-500">Henüz bildirim yok.</p>
                    ) : (
                      <div className="max-h-64 space-y-1.5 overflow-y-auto">
                        {liveNotifs.map((n) => (
                          <Link
                            key={n.id}
                            href={n.reference_id ? `/post/${n.reference_id}` : '/profile'}
                            onClick={() => setNotifOpen(false)}
                            className="block rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-xs text-slate-300 hover:bg-white/5"
                          >
                            {n.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#101624] px-2.5 py-1.5 transition hover:border-violet-400/30"
              >
                <Avatar seed={user.avatar_seed} size={26} />
                <div className="hidden text-left sm:block">
                  <div className="text-xs font-medium text-slate-200">{user.username}</div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <Shield className="h-2.5 w-2.5 text-violet-400" />
                    {TIER_INFO[user.account_tier].label} · {user.trust_score}
                  </div>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => setConfirmLogoutOpen(true)}
                title="Çıkış Yap"
                className="rounded-xl border border-white/10 bg-[#101624] p-2 text-slate-400 transition hover:text-rose-300"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#101624] px-3.5 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/5"
            >
              <User className="h-4 w-4 text-violet-300" />
              <span>Oturum Aç</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobil Arama Çubuğu */}
      {onSearchChange && (
        <div className="border-t border-white/5 px-4 py-2.5 md:hidden">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Benzer dertleri, etiketleri (#mobbing) ara..."
              className="w-full rounded-xl border border-white/10 bg-[#101624] py-2 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:border-violet-400/40 focus:outline-none"
            />
          </div>
        </div>
      )}
      </header>

      {/* Çıkış Yap İkinci Onay Modalı */}
      {confirmLogoutOpen && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#101624] p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/15 text-rose-300">
                <LogOut className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-base font-semibold text-slate-100">
                  Çıkış yapmak istiyor musun?
                </h3>
                <p className="text-xs text-slate-400">@{user.username}</p>
              </div>
            </div>

            <p className="mt-3.5 text-xs leading-relaxed text-slate-300">
              {user.email ? (
                <>
                  Hesabından çıkış yapacaksın. İstediğin zaman e-posta adresinle tekrar oturum açıp{' '}
                  <span className="font-semibold text-slate-100">@{user.username}</span> profiline
                  dönebilirsin.
                </>
              ) : (
                <>
                  Hızlı anonim oturum kullanıyorsun (e-posta bağlı değil). Çıkış yaparsan{' '}
                  <span className="font-semibold text-amber-300">@{user.username}</span> rumuzuna ve
                  güven puanına tekrar erişemeyebilirsin.
                </>
              )}
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmLogoutOpen(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/5"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmLogoutOpen(false);
                  onLogout();
                }}
                className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-400"
              >
                Evet, Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
