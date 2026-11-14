'use client';

import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, KeyRound, MailCheck, ShieldCheck, Sparkles, X } from 'lucide-react';
import { Profile } from '@/lib/types';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (user: Profile) => void;
}

type AuthTab = 'login' | 'register' | 'reset';

export function AuthModal({ open, onClose, onSuccess }: AuthModalProps) {
  const [tab, setTab] = useState<AuthTab>('login');
  const [step, setStep] = useState<'form' | 'verify'>('form');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  function resetFormState(nextTab: AuthTab) {
    setTab(nextTab);
    setStep('form');
    setOtpCode('');
    setDevCode(null);
    setError('');
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Giriş yapılamadı.');
      onSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterRequest(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register_request',
          email,
          password,
          username: username.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Doğrulama kodu gönderilemedi.');
      setDevCode(data.devCode || null);
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register_verify',
          email,
          password,
          username: username.trim() || undefined,
          code: otpCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Doğrulama başarısız.');
      onSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetRequest(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_request', email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kod gönderilemedi.');
      setDevCode(data.devCode || null);
      setPassword('');
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_verify',
          email,
          code: otpCode,
          newPassword: password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Şifre güncellenemedi.');
      onSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickDemo() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'demo' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Başlatılamadı.');
      onSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  const passwordHasLen = password.length >= 8;
  const passwordHasLetterAndDigit = /[a-zA-ZğüşöçıİĞÜŞÖÇ]/.test(password) && /\d/.test(password);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101624] p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">
              {tab === 'login' && 'Giriş Yap'}
              {tab === 'register' && (step === 'form' ? 'Anonim Hesap Oluştur' : 'E-postanı Doğrula')}
              {tab === 'reset' && 'Şifre Sıfırlama'}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              E-postan yalnızca hesap güvenliği içindir, içeride sadece anonim rumuzun görünür.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sekme Seçici */}
        {tab !== 'reset' && step === 'form' && (
          <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-[#080c14] p-1">
            <button
              type="button"
              onClick={() => resetFormState('login')}
              className={`rounded-lg py-2 text-xs font-medium transition ${
                tab === 'login' ? 'bg-violet-500/25 text-violet-200' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Giriş Yap
            </button>
            <button
              type="button"
              onClick={() => resetFormState('register')}
              className={`rounded-lg py-2 text-xs font-medium transition ${
                tab === 'register' ? 'bg-violet-500/25 text-violet-200' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hesap Oluştur
            </button>
          </div>
        )}

        {/* GİRİŞ FORMU */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">E-posta</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@mail.com"
                className="w-full rounded-xl border border-white/10 bg-[#080c14] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-400/50 focus:outline-none"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">Şifre</label>
                <button
                  type="button"
                  onClick={() => resetFormState('reset')}
                  className="text-[11px] text-violet-300 hover:text-violet-200"
                >
                  Şifremi unuttum
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/10 bg-[#080c14] px-3.5 py-2.5 pr-10 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-400/50 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-violet-500 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-50"
            >
              {loading ? 'Kontrol ediliyor...' : 'Giriş Yap'}
            </button>
          </form>
        )}

        {/* KAYIT ADIM 1 */}
        {tab === 'register' && step === 'form' && (
          <form onSubmit={handleRegisterRequest} className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">E-posta</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="gercek@mail.com"
                className="w-full rounded-xl border border-white/10 bg-[#080c14] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-400/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Şifre</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="En az 8 karakter (harf + rakam)"
                  className="w-full rounded-xl border border-white/10 bg-[#080c14] px-3.5 py-2.5 pr-10 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-400/50 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-1.5 flex gap-3 text-[11px]">
                  <span className={passwordHasLen ? 'text-emerald-400' : 'text-slate-500'}>
                    ✓ 8+ karakter
                  </span>
                  <span className={passwordHasLetterAndDigit ? 'text-emerald-400' : 'text-slate-500'}>
                    ✓ Harf ve rakam
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Anonim Rumuz (Opsiyonel)
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Boş bırakırsan otomatik üretilir (ör. SessizMartı42)"
                className="w-full rounded-xl border border-white/10 bg-[#080c14] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-400/50 focus:outline-none"
              />
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/10 bg-[#080c14] p-3 text-xs leading-relaxed text-slate-300">
              <input
                type="checkbox"
                required
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-white/20 accent-violet-500"
              />
              <span>
                Topluluk Kurallarını, KVKK Aydınlatma Metnini ve <strong>unfold</strong>&apos;un tıbbi/psikolojik
                tedavi yerine geçmeyen bir akran dayanışma alanı olduğunu kabul ediyorum.
              </span>
            </label>

            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !acceptedTerms}
              className="w-full rounded-xl bg-violet-500 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-50"
            >
              {loading ? 'Kod gönderiliyor...' : 'Doğrulama Kodu Gönder'}
            </button>
          </form>
        )}

        {/* KAYIT ADIM 2: OTP DOĞRULAMA */}
        {tab === 'register' && step === 'verify' && (
          <form onSubmit={handleRegisterVerify} className="mt-4 space-y-3">
            <div className="flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-200">
              <MailCheck className="h-4 w-4 shrink-0" />
              <span>
                <strong>{email}</strong> hesabı için 6 haneli doğrulama kodu üretildi.
              </span>
            </div>

            {devCode && (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                <div>
                  <div className="font-semibold">Anlık Doğrulama Kodun</div>
                  <div className="mt-0.5">
                    Kod:{' '}
                    <span className="rounded bg-black/30 px-2 py-0.5 font-mono text-sm font-bold tracking-widest text-amber-100">
                      {devCode}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOtpCode(devCode)}
                  className="shrink-0 rounded-lg border border-amber-400/40 bg-amber-400/20 px-2.5 py-1.5 text-[11px] font-semibold text-amber-100 hover:bg-amber-400/30"
                >
                  Kodu Doldur
                </button>
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">6 Haneli Kod</label>
              <input
                type="text"
                inputMode="numeric"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
                className="w-full rounded-xl border border-white/10 bg-[#080c14] px-3.5 py-2.5 text-center font-mono text-lg tracking-widest text-slate-100 focus:border-violet-400/50 focus:outline-none"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep('form');
                  setError('');
                }}
                className="flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2.5 text-xs text-slate-300 hover:bg-white/5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Geri
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-violet-500 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-50"
              >
                {loading ? 'Doğrulanıyor...' : 'Hesabı Doğrula ve Katıl'}
              </button>
            </div>
          </form>
        )}

        {/* ŞİFRE SIFIRLAMA */}
        {tab === 'reset' && step === 'form' && (
          <form onSubmit={handleResetRequest} className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Kayıtlı E-posta</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@mail.com"
                className="w-full rounded-xl border border-white/10 bg-[#080c14] px-3.5 py-2.5 text-sm text-slate-100 focus:border-violet-400/50 focus:outline-none"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => resetFormState('login')}
                className="rounded-xl border border-white/10 px-3 py-2.5 text-xs text-slate-300 hover:bg-white/5"
              >
                Girişe Dön
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-violet-500 py-2.5 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-50"
              >
                <KeyRound className="h-4 w-4" />
                {loading ? 'Gönderiliyor...' : 'Sıfırlama Kodu Gönder'}
              </button>
            </div>
          </form>
        )}

        {tab === 'reset' && step === 'verify' && (
          <form onSubmit={handleResetVerify} className="mt-4 space-y-3">
            {devCode && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                Yerel Mod Kodun:{' '}
                <span className="rounded bg-black/30 px-2 py-0.5 font-mono font-bold text-amber-100">
                  {devCode}
                </span>
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Doğrulama Kodu</label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="6 haneli kod"
                className="w-full rounded-xl border border-white/10 bg-[#080c14] px-3.5 py-2.5 font-mono text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Yeni Şifre</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="En az 8 karakter (harf + rakam)"
                className="w-full rounded-xl border border-white/10 bg-[#080c14] px-3.5 py-2.5 text-sm text-slate-100"
              />
            </div>
            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-violet-500 py-2.5 text-sm font-semibold text-white hover:bg-violet-400"
            >
              Şifreyi Güncelle ve Giriş Yap
            </button>
          </form>
        )}

        <div className="mt-5 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={handleQuickDemo}
            disabled={loading}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] py-2 text-xs text-slate-300 transition hover:border-violet-400/30 hover:text-violet-200 disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5 text-violet-300" />
            Sadece denemek için: Hızlı Demo Hesabı Oluştur
          </button>

          <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>%100 Kimlik Gizliliği · Doğrulanmış Hesap Mimarisi</span>
          </div>
        </div>
      </div>
    </div>
  );
}
