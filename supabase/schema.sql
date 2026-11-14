-- unfold PostgreSQL / Supabase Şeması
-- Aynı dertlere sahip insanların birbirini bulabildiği anonim topluluk platformu

create extension if not exists "pgcrypto";

-- 1. Anonim Profiller
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  username text unique not null,
  avatar_seed text not null,
  trust_score integer not null default 50 check (trust_score between 0 and 100),
  account_tier text not null default 'new_observer' check (account_tier in ('new_observer', 'trusted', 'supporter', 'restricted')),
  is_premium boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2. Kategoriler
create table if not exists public.categories (
  id serial primary key,
  slug text unique not null,
  name text not null,
  description text,
  icon text
);

-- 3. Etiketler (Aynı derdi yaşayanları bulma anahtarı)
create table if not exists public.tags (
  id serial primary key,
  slug text unique not null,
  name text not null,
  usage_count integer not null default 0
);

-- 4. Forum Gönderileri
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  category_id integer not null references public.categories(id),
  title text not null,
  content text not null,
  mood text not null check (mood in ('uzgun', 'bunaldim', 'kararsiz', 'ofkeli', 'yalniz', 'umutlu')),
  reply_mode text not null default 'open' check (reply_mode in ('open', 'empathy_only', 'advice_wanted')),
  moderation_status text not null default 'approved' check (moderation_status in ('approved', 'pending_review', 'hidden', 'crisis_flagged')),
  same_here_count integer not null default 0,
  empathy_count integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Gönderi - Etiket İlişkisi
create table if not exists public.post_tags (
  post_id uuid not null references public.posts(id) on delete cascade,
  tag_id integer not null references public.tags(id) on delete cascade,
  primary key (post_id, tag_id)
);

-- 6. İç İçe Yorumlar
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null,
  moderation_status text not null default 'approved' check (moderation_status in ('approved', 'pending_review', 'hidden', 'crisis_flagged')),
  empathy_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- 7. Empati Tepkileri
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment')),
  target_id uuid not null,
  reaction_type text not null check (reaction_type in ('ayni_durumdayim', 'yanindayim', 'seni_anliyorum')),
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id, reaction_type)
);

-- 8. Bildirimler
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('new_comment', 'comment_reply', 'same_here', 'empathy_reaction', 'trust_update')),
  title text not null,
  reference_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- 9. Şikayetler & Moderasyon Kayıtları
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment')),
  target_id uuid not null,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);

create table if not exists public.moderation_logs (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid,
  layer text not null check (layer in ('L1_LOCAL', 'L2_GEMINI')),
  risk_score integer not null default 0,
  flags jsonb not null default '[]'::jsonb,
  action_taken text not null,
  created_at timestamptz not null default now()
);
