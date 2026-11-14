export type AccountTier = 'new_observer' | 'trusted' | 'supporter' | 'restricted';

export type Mood = 'uzgun' | 'bunaldim' | 'kararsiz' | 'ofkeli' | 'yalniz' | 'umutlu';

export type ReplyMode = 'open' | 'empathy_only' | 'advice_wanted';

export type ModerationStatus = 'approved' | 'pending_review' | 'hidden' | 'crisis_flagged';

export type ReactionType = 'ayni_durumdayim' | 'yanindayim' | 'seni_anliyorum';

export interface Profile {
  id: string;
  username: string;
  email?: string | null;
  avatar_seed: string;
  trust_score: number;
  account_tier: AccountTier;
  is_premium: boolean;
  is_admin?: boolean;
  created_at: string;
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
}

export interface Tag {
  id: number;
  slug: string;
  name: string;
  usage_count: number;
}

export interface GroupedTags {
  category_slug: string;
  category_name: string;
  tags: Tag[];
}

export interface PollOption {
  id: string;
  label: string;
  vote_count: number;
}

export interface PollData {
  question: string;
  options: PollOption[];
  total_votes: number;
  user_voted_option_id?: string | null;
}

export interface Post {
  id: string;
  author_id: string;
  author_username: string;
  author_avatar_seed: string;
  author_tier: AccountTier;
  category_id: number;
  category_slug: string;
  category_name: string;
  title: string;
  content: string;
  mood: Mood;
  reply_mode: ReplyMode;
  moderation_status: ModerationStatus;
  same_here_count: number;
  empathy_count: number;
  comment_count: number;
  update_text?: string | null;
  updated_story_at?: string | null;
  expires_at?: string | null;
  poll_question?: string | null;
  poll?: PollData | null;
  is_daily_win?: boolean;
  tags: string[];
  user_reactions?: ReactionType[];
  is_bookmarked?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommentNode {
  id: string;
  post_id: string;
  author_id: string;
  author_username: string;
  author_avatar_seed: string;
  author_tier: AccountTier;
  parent_id: string | null;
  content: string;
  moderation_status: ModerationStatus;
  empathy_count: number;
  is_helpful: boolean;
  user_reacted?: boolean;
  created_at: string;
  replies: CommentNode[];
}

export interface NotificationItem {
  id: string;
  user_id: string;
  type: 'new_comment' | 'comment_reply' | 'same_here' | 'empathy_reaction' | 'trust_update';
  title: string;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface ReportItem {
  id: string;
  reporter_username: string;
  target_type: 'post' | 'comment';
  target_id: string;
  target_preview: string;
  target_status: string;
  reason: string;
  status: 'open' | 'reviewed' | 'dismissed';
  created_at: string;
}

export interface ModerationLogItem {
  id: string;
  target_type: string;
  target_id: string | null;
  layer: 'L1_LOCAL' | 'L2_GEMINI';
  risk_score: number;
  flags: string[];
  action_taken: string;
  created_at: string;
}

export interface LocalFilterResult {
  allowed: boolean;
  status: 'clean' | 'pii_blocked' | 'profanity_blocked' | 'crisis_flagged';
  reason?: string;
  flags: string[];
}

export interface AiAnalysisResult {
  layer: 'L1_LOCAL' | 'L2_GEMINI';
  riskScore: number;
  flags: string[];
  shouldHide: boolean;
  suggestedTags: string[];
}
