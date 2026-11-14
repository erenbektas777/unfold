import type { AccountTier, Mood, ReactionType, ReplyMode } from './types';

export const CATEGORIES = [
  { id: 1, slug: 'iliskiler', name: 'İlişkiler', description: 'Aşk, ayrılık, evlilik ve bağlanma sorunları', icon: 'heart' },
  { id: 2, slug: 'is-kariyer', name: 'İş & Kariyer', description: 'Mobbing, tükenmişlik, işsizlik ve gelecek kaygısı', icon: 'briefcase' },
  { id: 3, slug: 'aile', name: 'Aile', description: 'Aile içi iletişim, beklentiler ve sınırlar', icon: 'home' },
  { id: 4, slug: 'yalnizlik', name: 'Yalnızlık', description: 'Anlaşılamama, sosyal izolasyon ve içsel boşluk', icon: 'moon' },
  { id: 5, slug: 'kaygi-stres', name: 'Kaygı & Stres', description: 'Panik, uykusuzluk, belirsizlik ve zihinsel yorgunluk', icon: 'cloud' },
  { id: 6, slug: 'ogrencilik', name: 'Öğrencilik', description: 'Sınav stresi, bölüm pişmanlığı ve yurt/kampüs hayatı', icon: 'book' },
  { id: 7, slug: 'genel', name: 'Genel Dertleşme', description: 'İçini dökmek istediğin herhangi bir konu', icon: 'sparkles' },
] as const;

export const MOODS: Record<Mood, { label: string; color: string }> = {
  uzgun: { label: 'Üzgün', color: 'bg-blue-500/15 text-blue-300 border-blue-500/25' },
  bunaldim: { label: 'Bunaldım', color: 'bg-purple-500/15 text-purple-300 border-purple-500/25' },
  kararsiz: { label: 'Kararsız', color: 'bg-amber-500/15 text-amber-300 border-amber-500/25' },
  ofkeli: { label: 'Öfkeli', color: 'bg-rose-500/15 text-rose-300 border-rose-500/25' },
  yalniz: { label: 'Yalnız', color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25' },
  umutlu: { label: 'Umutlu', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' },
};

export const REPLY_MODES: Record<ReplyMode, { label: string; description: string }> = {
  open: { label: 'Yoruma Açık', description: 'Herkes düşüncesini ve desteğini yazabilir' },
  advice_wanted: { label: 'Tavsiye İstiyorum', description: 'Benzer deneyimi olanlardan fikir duymak istiyorum' },
  empathy_only: { label: 'Sadece Empati', description: 'Yorum kapalı, sadece sessiz destek tepkileri' },
};

export const REACTIONS: Record<ReactionType, { label: string; shortLabel: string }> = {
  ayni_durumdayim: { label: 'Ben de aynı şeyi yaşıyorum', shortLabel: 'Ben de yaşıyorum' },
  yanindayim: { label: 'Yanındayım', shortLabel: 'Yanındayım' },
  seni_anliyorum: { label: 'Seni anlıyorum', shortLabel: 'Seni anlıyorum' },
};

export const TIER_INFO: Record<AccountTier, { label: string; badgeClass: string; dailyPostLimit: number; dailyCommentLimit: number }> = {
  new_observer: {
    label: 'Gözlemci',
    badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    dailyPostLimit: 3,
    dailyCommentLimit: 10,
  },
  trusted: {
    label: 'Güvenilir',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    dailyPostLimit: 10,
    dailyCommentLimit: 40,
  },
  supporter: {
    label: 'Destekçi',
    badgeClass: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    dailyPostLimit: 20,
    dailyCommentLimit: 100,
  },
  restricted: {
    label: 'Kısıtlı',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    dailyPostLimit: 0,
    dailyCommentLimit: 0,
  },
};

const ADJECTIVES = [
  'Sessiz', 'Sakin', 'Gece', 'Derin', 'Uzak', 'Yorgun', 'Dalgın', 'Mavi',
  'Kuzey', 'Gri', 'Loş', 'Serin', 'Bulutlu', 'Dingin', 'Ilık', 'Puslu',
];

const NOUNS = [
  'Martı', 'Yolcu', 'Fener', 'Liman', 'Rüzgar', 'Yıldız', 'Pencere', 'Orman',
  'Nehir', 'Gölge', 'Yağmur', 'Kıyı', 'Bulut', 'Ada', 'Kuş', 'Ufuk',
];

export function generateAnonymousHandle(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(10 + Math.random() * 89);
  return `${adj}${noun}${num}`;
}

export function computeTier(trustScore: number): AccountTier {
  if (trustScore < 30) return 'restricted';
  if (trustScore < 60) return 'new_observer';
  if (trustScore < 85) return 'trusted';
  return 'supporter';
}
