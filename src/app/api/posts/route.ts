import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { TIER_INFO } from '@/lib/constants';
import {
  adjustTrustScore,
  createPostRecord,
  getDailyUsageCounts,
  getGroupedTagsByCategory,
  getPosts,
  getTopTags,
  logModerationEvent,
} from '@/lib/db';
import { runAiContextualAnalysis } from '@/lib/moderation/ai-analyzer';
import { runLocalFilter } from '@/lib/moderation/local-filter';
import { checkCooldown } from '@/lib/rate-limit';
import { Mood, ReplyMode } from '@/lib/types';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const { searchParams } = req.nextUrl;
  const followedCatsParam = searchParams.get('followed_cats') || '';
  const followedTagsParam = searchParams.get('followed_tags') || '';
  const posts = getPosts({
    categorySlug: searchParams.get('category') || 'all',
    mood: searchParams.get('mood') || 'all',
    tagSlug: searchParams.get('tag') || undefined,
    search: searchParams.get('q') || undefined,
    sort:
      (searchParams.get('sort') as
        | 'newest'
        | 'unanswered'
        | 'most_supported'
        | 'same_here'
        | 'for_you'
        | 'daily_wins'
        | 'followed') || 'newest',
    followedCategories: followedCatsParam
      ? followedCatsParam.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined,
    followedTags: followedTagsParam
      ? followedTagsParam.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined,
    authorId: searchParams.get('mine') === '1' && user ? user.id : undefined,
    bookmarkedBy: searchParams.get('bookmarked') === '1' && user ? user.id : undefined,
    currentUserId: user?.id ?? null,
  });
  const topTags = getTopTags(14);
  const groupedTags = getGroupedTagsByCategory();
  return NextResponse.json({ posts, topTags, groupedTags });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Paylaşım yapmak için giriş yapmalısın.' }, { status: 401 });
    }

    const cooldown = checkCooldown(`post:${user.id}`, 5000);
    if (!cooldown.allowed) {
      return NextResponse.json(
        { error: `Çok hızlı paylaşım yapıyorsun. Lütfen ${cooldown.retryAfterSec} sn bekle.` },
        { status: 429 }
      );
    }

    const tierInfo = TIER_INFO[user.account_tier];
    if (user.account_tier === 'restricted') {
      return NextResponse.json(
        { error: 'Hesabın topluluk kuralları nedeniyle geçici olarak kısıtlandı.' },
        { status: 403 }
      );
    }

    const usage = getDailyUsageCounts(user.id);
    if (usage.postsToday >= tierInfo.dailyPostLimit) {
      return NextResponse.json(
        { error: `Günlük paylaşım limitine (${tierInfo.dailyPostLimit}) ulaştın.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const title = String(body.title || '').trim();
    const content = String(body.content || '').trim();
    const categoryId = Number(body.categoryId || 7);
    const mood = (body.mood || 'bunaldim') as Mood;
    const replyMode = (body.replyMode || 'open') as ReplyMode;
    const rawTags = Array.isArray(body.tags) ? body.tags.map(String) : [];
    const expiresInHours = body.expiresInHours ? Number(body.expiresInHours) : null;
    const pollQuestion = body.pollQuestion ? String(body.pollQuestion).trim() : null;
    const pollOptions = Array.isArray(body.pollOptions)
      ? body.pollOptions.map((o: unknown) => String(o).trim()).filter(Boolean)
      : [];
    const isDailyWin = Boolean(body.isDailyWin);

    if (title.length < 5 || content.length < 15) {
      return NextResponse.json(
        { error: 'Başlık en az 5, metin en az 15 karakter olmalı.' },
        { status: 400 }
      );
    }

    // Katman 1: Senkron Lokal PII, Küfür ve Kriz Filtresi
    const combinedText = `${title}\n${content}\n${pollQuestion || ''}\n${pollOptions.join(' ')}`;
    const l1 = runLocalFilter(combinedText);
    if (!l1.allowed) {
      logModerationEvent({
        targetType: 'post',
        targetId: null,
        layer: 'L1_LOCAL',
        riskScore: l1.status === 'crisis_flagged' ? 100 : 80,
        flags: l1.flags,
        actionTaken: l1.status,
      });

      if (l1.status === 'profanity_blocked') {
        adjustTrustScore(user.id, -8);
      }

      return NextResponse.json(
        {
          error: l1.reason,
          moderationStatus: l1.status,
          crisis: l1.status === 'crisis_flagged',
        },
        { status: 422 }
      );
    }

    // Katman 2: Opsiyonel Gemini AI / Lokal Heuristik Analiz + Etiket Önerisi
    const l2 = await runAiContextualAnalysis(combinedText);
    const baseTags = rawTags.length > 0 ? rawTags : l2.suggestedTags;
    const finalTags = isDailyWin && !baseTags.includes('küçük-zafer')
      ? ['küçük-zafer', ...baseTags].slice(0, 5)
      : baseTags;
    const moderationStatus = l2.shouldHide ? 'hidden' : 'approved';

    const post = createPostRecord({
      authorId: user.id,
      categoryId,
      title,
      content,
      mood: isDailyWin ? 'umutlu' : mood,
      replyMode,
      tags: finalTags,
      moderationStatus,
      expiresInHours,
      pollQuestion,
      pollOptions,
      isDailyWin,
    });

    logModerationEvent({
      targetType: 'post',
      targetId: post.id,
      layer: l2.layer,
      riskScore: l2.riskScore,
      flags: l2.flags,
      actionTaken: moderationStatus,
    });

    if (l2.shouldHide) {
      adjustTrustScore(user.id, -10);
      return NextResponse.json(
        { error: 'Paylaşımın topluluk güvenliği incelemesine takıldı.' },
        { status: 422 }
      );
    }

    return NextResponse.json({ post }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Paylaşım oluşturulamadı.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
