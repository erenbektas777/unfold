'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Clock, Hash, Plus, ShieldAlert, Sparkles, Trash2, X } from 'lucide-react';
import { CATEGORIES, MOODS, REPLY_MODES } from '@/lib/constants';
import { Mood, Post, ReplyMode } from '@/lib/types';

interface PostComposerModalProps {
  open: boolean;
  defaultDailyWin?: boolean;
  initialTitle?: string;
  initialCategoryId?: number;
  initialTags?: string[];
  onClose: () => void;
  onCreated: (post: Post) => void;
  onCrisisTriggered: () => void;
}

const QUICK_TAGS = ['mobbing', 'yalnızlık', 'ayrılık', 'sınav-stresi', 'uykusuzluk', 'tükenmişlik', 'gelecek-kaygısı', 'aile-baskısı'];

const EXPIRY_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'Kalıcı Paylaşım' },
  { value: 24, label: '24 Saat Sonra Silinsin' },
  { value: 168, label: '7 Gün Sonra Silinsin' },
];

export function PostComposerModal({
  open,
  defaultDailyWin = false,
  initialTitle = '',
  initialCategoryId,
  initialTags,
  onClose,
  onCreated,
  onCrisisTriggered,
}: PostComposerModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState<number>(7);
  const [mood, setMood] = useState<Mood>('bunaldim');
  const [replyMode, setReplyMode] = useState<ReplyMode>('open');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [expiresInHours, setExpiresInHours] = useState<number | null>(null);
  const [isDailyWin, setIsDailyWin] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setIsDailyWin(defaultDailyWin);
      if (defaultDailyWin) setMood('umutlu');
      if (initialTitle) setTitle(initialTitle);
      if (initialCategoryId) setCategoryId(initialCategoryId);
      if (initialTags && initialTags.length > 0) setTags(initialTags);
    }
  }, [open, defaultDailyWin, initialTitle, initialCategoryId, initialTags]);

  if (!open) return null;

  function addTag(raw: string) {
    const cleaned = raw.trim().toLowerCase().replace(/^#/, '');
    if (!cleaned || tags.includes(cleaned) || tags.length >= 5) return;
    setTags([...tags, cleaned]);
    setTagInput('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const cleanedPollOptions = showPoll
        ? pollOptions.map((o) => o.trim()).filter(Boolean)
        : [];
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          categoryId,
          mood: isDailyWin ? 'umutlu' : mood,
          replyMode,
          tags,
          expiresInHours,
          isDailyWin,
          pollQuestion: showPoll && cleanedPollOptions.length >= 2 ? pollQuestion.trim() : null,
          pollOptions: showPoll && cleanedPollOptions.length >= 2 ? cleanedPollOptions : [],
        }),
      });
      const data = await res.json();
      if (data.crisis) {
        onClose();
        onCrisisTriggered();
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Paylaşım gönderilemedi.');
      setTitle('');
      setContent('');
      setTags([]);
      setExpiresInHours(null);
      setIsDailyWin(false);
      setShowPoll(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      onCreated(data.post);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-xl rounded-2xl border border-white/10 bg-[#101624] p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              {isDailyWin ? '🌱 Küçük Zaferini Paylaş' : 'İçini Dök'}
            </h2>
            <p className="text-xs text-slate-400">
              {isDailyWin
                ? 'Bugün attığın küçük ama anlamlı adımı paylaşarak başkalarına da umut ol.'
                : 'Tamamen anonimsin. Doğru etiketler aynı derdi yaşayanların seni bulmasını sağlar.'}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3.5 py-2.5">
            <div className="flex items-center gap-2 text-xs text-emerald-200">
              <Sparkles className="h-4 w-4 text-emerald-300" />
              <span>Bu paylaşım bir <strong>Küçük Zafer (Daily Win)</strong> mi?</span>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !isDailyWin;
                setIsDailyWin(next);
                if (next) setMood('umutlu');
              }}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                isDailyWin
                  ? 'bg-emerald-400 text-slate-950'
                  : 'border border-white/15 bg-[#080c14] text-slate-300 hover:border-emerald-400/40'
              }`}
            >
              {isDailyWin ? '🌱 Küçük Zafer Aktif' : 'Küçük Zafer Olarak İşaretle'}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Kategori</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                className="w-full rounded-xl border border-white/10 bg-[#080c14] px-3 py-2 text-sm text-slate-100 focus:border-violet-400/50 focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Şu Anki Hissin</label>
              <select
                value={mood}
                onChange={(e) => setMood(e.target.value as Mood)}
                className="w-full rounded-xl border border-white/10 bg-[#080c14] px-3 py-2 text-sm text-slate-100 focus:border-violet-400/50 focus:outline-none"
              >
                {Object.entries(MOODS).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Başlık</label>
            <input
              type="text"
              required
              minLength={5}
              maxLength={140}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: İşimde tükenmiş hissediyorum ve kimseye anlatamıyorum"
              className="w-full rounded-xl border border-white/10 bg-[#080c14] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-400/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Neler Oluyor?</label>
            <textarea
              required
              minLength={15}
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Aklından geçenleri yargılanma korkusu olmadan yaz... (Telefon, e-posta veya sosyal medya adı paylaşma)"
              className="w-full rounded-xl border border-white/10 bg-[#080c14] px-3.5 py-2.5 text-sm leading-relaxed text-slate-100 placeholder-slate-500 focus:border-violet-400/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-300">
              Dert Etiketleri (En fazla 5 — boş bırakırsan sistem otomatik önerir)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Hash className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      addTag(tagInput);
                    }
                  }}
                  placeholder="etiket yazıp Enter'a bas"
                  className="w-full rounded-xl border border-white/10 bg-[#080c14] py-2 pl-8 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:border-violet-400/50 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => addTag(tagInput)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-slate-200 hover:bg-white/10"
              >
                Ekle
              </button>
            </div>

            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTags(tags.filter((x) => x !== t))}
                    className="rounded-full border border-violet-400/30 bg-violet-500/15 px-2.5 py-0.5 text-xs text-violet-200 hover:bg-rose-500/20"
                  >
                    #{t} ×
                  </button>
                ))}
              </div>
            )}

            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK_TAGS.filter((qt) => !tags.includes(qt)).map((qt) => (
                <button
                  key={qt}
                  type="button"
                  onClick={() => addTag(qt)}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] text-slate-400 hover:border-violet-400/30 hover:text-slate-200"
                >
                  + #{qt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-300">Etkileşim Tercihin</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(Object.entries(REPLY_MODES) as [ReplyMode, { label: string; description: string }][]).map(
                ([key, info]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setReplyMode(key)}
                    className={`rounded-xl border p-2.5 text-left transition ${
                      replyMode === key
                        ? 'border-violet-400/50 bg-violet-500/15 text-violet-100'
                        : 'border-white/10 bg-[#080c14] text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <div className="text-xs font-medium">{info.label}</div>
                    <div className="mt-0.5 text-[10px] opacity-75">{info.description}</div>
                  </button>
                )
              )}
            </div>
          </div>

          {/* #8 Geçici Paylaşım (Süre Seçimi) + #5 Anonim Karar Anketi */}
          <div className="grid grid-cols-1 gap-3 border-t border-white/10 pt-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-300">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                Paylaşım Süresi
              </label>
              <select
                value={expiresInHours === null ? 'permanent' : String(expiresInHours)}
                onChange={(e) =>
                  setExpiresInHours(e.target.value === 'permanent' ? null : Number(e.target.value))
                }
                className="w-full rounded-xl border border-white/10 bg-[#080c14] px-3 py-2 text-xs text-slate-100 focus:border-violet-400/50 focus:outline-none"
              >
                {EXPIRY_OPTIONS.map((opt) => (
                  <option key={String(opt.value)} value={opt.value === null ? 'permanent' : opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setShowPoll(!showPoll)}
                className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${
                  showPoll
                    ? 'border-violet-400/50 bg-violet-500/15 text-violet-200'
                    : 'border-white/10 bg-[#080c14] text-slate-300 hover:border-white/20'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5 text-violet-400" />
                <span>{showPoll ? 'Karar Anketini Kaldır' : 'Karar Anketi Ekle ("Ne yapardınız?")'}</span>
              </button>
            </div>
          </div>

          {showPoll && (
            <div className="space-y-2.5 rounded-xl border border-violet-500/25 bg-[#080c14]/90 p-3.5">
              <div className="text-xs font-medium text-violet-200">
                Anonim Karar Anketi (En az 2, en fazla 4 seçenek)
              </div>
              <input
                type="text"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Soru (boş bırakırsan: 'Siz olsanız ne yapardınız?')"
                maxLength={120}
                className="w-full rounded-lg border border-white/10 bg-[#101624] px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-violet-400/50 focus:outline-none"
              />
              <div className="space-y-1.5">
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const next = [...pollOptions];
                        next[idx] = e.target.value;
                        setPollOptions(next);
                      }}
                      placeholder={`${idx + 1}. Seçenek`}
                      maxLength={90}
                      className="flex-1 rounded-lg border border-white/10 bg-[#101624] px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-violet-400/50 focus:outline-none"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-rose-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {pollOptions.length < 4 && (
                <button
                  type="button"
                  onClick={() => setPollOptions([...pollOptions, ''])}
                  className="inline-flex items-center gap-1 text-[11px] text-violet-300 hover:text-violet-200"
                >
                  <Plus className="h-3 w-3" /> Seçenek Ekle
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-violet-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-50"
            >
              {loading ? 'Kontrol ediliyor...' : 'Anonim Paylaş'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
