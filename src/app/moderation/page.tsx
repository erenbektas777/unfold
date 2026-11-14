'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, ShieldAlert, XCircle } from 'lucide-react';
import { AuthModal } from '@/components/AuthModal';
import { CrisisModal } from '@/components/CrisisModal';
import { Navbar } from '@/components/Navbar';
import { formatRelativeTime } from '@/components/PostCard';
import { PostComposerModal } from '@/components/PostComposerModal';
import { ModerationLogItem, Profile, ReportItem } from '@/lib/types';

export default function ModerationPage() {
  const router = useRouter();
  const [user, setUser] = useState<Profile | null>(null);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [logs, setLogs] = useState<ModerationLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [crisisOpen, setCrisisOpen] = useState(false);

  const [adminSecret, setAdminSecret] = useState('');
  const [claimError, setClaimError] = useState('');
  const [claiming, setClaiming] = useState(false);

  const loadModeration = useCallback(async () => {
    setLoading(true);
    const authRes = await fetch('/api/auth');
    const authData = await authRes.json();
    setUser(authData.user || null);

    if (authData.user?.is_admin) {
      const modRes = await fetch('/api/moderation');
      if (modRes.ok) {
        const modData = await modRes.json();
        setReports(modData.reports || []);
        setLogs(modData.logs || []);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadModeration();
  }, [loadModeration]);

  async function handleClaimAdmin(e: React.FormEvent) {
    e.preventDefault();
    setClaimError('');
    setClaiming(true);
    try {
      const res = await fetch('/api/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim_admin', secret: adminSecret }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Yetki doğrulanamadı.');
      setAdminSecret('');
      await loadModeration();
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Hata oluştu.');
    } finally {
      setClaiming(false);
    }
  }

  async function handleAction(reportId: string, action: 'dismiss_report' | 'hide_target' | 'restore_target') {
    const res = await fetch('/api/moderation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId, action }),
    });
    if (res.ok) loadModeration();
  }

  async function handleLogout() {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    setUser(null);
  }

  return (
    <div className="min-h-screen bg-[#080c14]">
      <Navbar
        user={user}
        onOpenAuth={() => setAuthOpen(true)}
        onOpenComposer={() => setComposerOpen(true)}
        onLogout={handleLogout}
      />

      <main className="mx-auto max-w-5xl px-4 py-6">
        <a
          href="/"
          className="mb-5 inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Akışa Dön
        </a>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Moderasyon &amp; Güvenlik Paneli</h1>
            <p className="text-xs text-slate-400">
              Yalnızca yetkili platform yöneticilerine özel içerik denetim alanı
            </p>
          </div>
        </div>

        {loading ? (
          <div className="h-48 animate-pulse rounded-2xl bg-[#101624]" />
        ) : !user ? (
          <div className="rounded-2xl border border-white/10 bg-[#101624] p-10 text-center">
            <p className="text-sm text-slate-300">Moderasyon panelini görüntülemek için oturum açmalısın.</p>
            <button
              onClick={() => setAuthOpen(true)}
              className="mt-4 rounded-xl bg-violet-500 px-5 py-2 text-sm font-medium text-white"
            >
              Oturum Aç
            </button>
          </div>
        ) : !user.is_admin ? (
          <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-[#101624] p-6">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-amber-300">
              <KeyRound className="h-4 w-4" />
              Yönetici Yetkisi Gerekli
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Bu sayfa standart kullanıcılara kapalıdır. Platform yöneticisiysen hesabına yönetici
              yetkisi tanımlamak için <code className="text-slate-200">MODERATION_SECRET</code> anahtarını gir:
            </p>
            <form onSubmit={handleClaimAdmin} className="mt-4 space-y-3">
              <input
                type="password"
                required
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
                placeholder="Yönetici anahtarı (varsayılan: unfold-admin-2026)"
                className="w-full rounded-xl border border-white/10 bg-[#080c14] px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-violet-400/50 focus:outline-none"
              />
              {claimError && <p className="text-xs text-rose-300">{claimError}</p>}
              <button
                type="submit"
                disabled={claiming}
                className="w-full rounded-xl bg-violet-500 py-2.5 text-xs font-semibold text-white hover:bg-violet-400 disabled:opacity-50"
              >
                {claiming ? 'Doğrulanıyor...' : 'Hesabıma Yönetici Yetkisi Tanımla'}
              </button>
            </form>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Şikayetler */}
            <section className="rounded-2xl border border-white/10 bg-[#101624] p-5">
              <h2 className="mb-4 text-sm font-semibold text-slate-200">
                Topluluk Şikayetleri ({reports.length})
              </h2>

              {reports.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">Henüz incelenecek şikayet yok.</p>
              ) : (
                <div className="space-y-3">
                  {reports.map((r) => (
                    <div key={r.id} className="rounded-xl border border-white/10 bg-[#080c14] p-3.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">
                          {r.reporter_username} · {formatRelativeTime(r.created_at)}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            r.status === 'open'
                              ? 'bg-amber-500/15 text-amber-300'
                              : 'bg-emerald-500/15 text-emerald-300'
                          }`}
                        >
                          {r.status === 'open' ? 'Açık' : r.status === 'reviewed' ? 'İncelendi' : 'Reddedildi'}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs font-medium text-slate-200">
                        [{r.target_type === 'post' ? 'Gönderi' : 'Yorum'}] {r.target_preview}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">Gerekçe: {r.reason}</p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => handleAction(r.id, 'hide_target')}
                          className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-200 hover:bg-rose-500/20"
                        >
                          <EyeOff className="h-3 w-3" />
                          İçeriği Gizle
                        </button>
                        <button
                          onClick={() => handleAction(r.id, 'restore_target')}
                          className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-200 hover:bg-emerald-500/20"
                        >
                          <Eye className="h-3 w-3" />
                          Yayınla / Geri Al
                        </button>
                        <button
                          onClick={() => handleAction(r.id, 'dismiss_report')}
                          className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-slate-400 hover:bg-white/5"
                        >
                          <XCircle className="h-3 w-3" />
                          Reddet
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Otomatik Moderasyon Logları */}
            <section className="rounded-2xl border border-white/10 bg-[#101624] p-5">
              <h2 className="mb-4 text-sm font-semibold text-slate-200">
                AI &amp; Lokal Moderasyon Logları ({logs.length})
              </h2>

              {logs.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">Henüz moderasyon kaydı oluşmadı.</p>
              ) : (
                <div className="max-h-[540px] space-y-2.5 overflow-y-auto">
                  {logs.map((l) => (
                    <div key={l.id} className="rounded-xl border border-white/10 bg-[#080c14] p-3">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono text-violet-300">{l.layer}</span>
                        <span className="text-slate-500">{formatRelativeTime(l.created_at)}</span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-slate-200">
                          <CheckCircle2 className="h-3.5 w-3.5 text-sky-400" />
                          Aksiyon: <strong>{l.action_taken}</strong>
                        </span>
                        <span className="text-slate-400">Risk: {l.risk_score}/100</span>
                      </div>
                      {l.flags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {l.flags.map((f, idx) => (
                            <span
                              key={idx}
                              className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400"
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={() => loadModeration()} />
      <PostComposerModal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onCreated={(post) => router.push(`/post/${post.id}`)}
        onCrisisTriggered={() => setCrisisOpen(true)}
      />
      <CrisisModal open={crisisOpen} onClose={() => setCrisisOpen(false)} />
    </div>
  );
}
