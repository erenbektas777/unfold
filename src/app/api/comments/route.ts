import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { TIER_INFO } from '@/lib/constants';
import {
  adjustTrustScore,
  createCommentRecord,
  getDailyUsageCounts,
  getPostById,
  hideCommentByPostAuthor,
  logModerationEvent,
  toggleCommentHelpful,
} from '@/lib/db';
import { runAiContextualAnalysis } from '@/lib/moderation/ai-analyzer';
import { runLocalFilter } from '@/lib/moderation/local-filter';
import { checkCooldown } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Yorum yapmak için giriş yapmalısın.' }, { status: 401 });
    }

    const cooldown = checkCooldown(`comment:${user.id}`, 3000);
    if (!cooldown.allowed) {
      return NextResponse.json(
        { error: `Çok hızlı yorum gönderiyorsun. Lütfen ${cooldown.retryAfterSec} sn bekle.` },
        { status: 429 }
      );
    }

    const tierInfo = TIER_INFO[user.account_tier];
    if (user.account_tier === 'restricted') {
      return NextResponse.json({ error: 'Hesabın geçici olarak kısıtlandı.' }, { status: 403 });
    }

    const usage = getDailyUsageCounts(user.id);
    if (usage.commentsToday >= tierInfo.dailyCommentLimit) {
      return NextResponse.json(
        { error: `Günlük yorum limitine (${tierInfo.dailyCommentLimit}) ulaştın.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const postId = String(body.postId || '');
    const parentId = body.parentId ? String(body.parentId) : null;
    const content = String(body.content || '').trim();

    if (content.length < 3) {
      return NextResponse.json({ error: 'Yorum en az 3 karakter olmalı.' }, { status: 400 });
    }

    const post = getPostById(postId);
    if (!post) {
      return NextResponse.json({ error: 'Gönderi bulunamadı.' }, { status: 404 });
    }
    if (post.reply_mode === 'empathy_only') {
      return NextResponse.json(
        { error: 'Bu paylaşım yalnızca sessiz empati tepkilerine açık.' },
        { status: 403 }
      );
    }

    const l1 = runLocalFilter(content);
    if (!l1.allowed) {
      logModerationEvent({
        targetType: 'comment',
        targetId: null,
        layer: 'L1_LOCAL',
        riskScore: l1.status === 'crisis_flagged' ? 100 : 80,
        flags: l1.flags,
        actionTaken: l1.status,
      });
      if (l1.status === 'profanity_blocked') adjustTrustScore(user.id, -8);

      return NextResponse.json(
        { error: l1.reason, crisis: l1.status === 'crisis_flagged' },
        { status: 422 }
      );
    }

    const l2 = await runAiContextualAnalysis(content);
    const status = l2.shouldHide ? 'hidden' : 'approved';
    const commentId = createCommentRecord({
      postId,
      authorId: user.id,
      parentId,
      content,
      moderationStatus: status,
    });

    logModerationEvent({
      targetType: 'comment',
      targetId: commentId,
      layer: l2.layer,
      riskScore: l2.riskScore,
      flags: l2.flags,
      actionTaken: status,
    });

    if (l2.shouldHide) {
      adjustTrustScore(user.id, -10);
      return NextResponse.json(
        { error: 'Yorumun kırıcı veya manipülatif dil nedeniyle yayınlanmadı.' },
        { status: 422 }
      );
    }

    return NextResponse.json({ id: commentId }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Yorum gönderilemedi.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 });
  }

  const body = await req.json();
  const commentId = String(body.commentId || '');
  const action = body.action as 'toggle_helpful' | 'hide_by_post_author';

  if (!commentId) {
    return NextResponse.json({ error: 'Geçersiz yorum.' }, { status: 400 });
  }

  if (action === 'toggle_helpful') {
    const res = toggleCommentHelpful(commentId, user.id);
    if (!res) {
      return NextResponse.json({ error: 'Bu işlem için gönderi sahibi olmalısın.' }, { status: 403 });
    }
    return NextResponse.json(res);
  }

  if (action === 'hide_by_post_author') {
    const ok = hideCommentByPostAuthor(commentId, user.id);
    if (!ok) {
      return NextResponse.json({ error: 'Bu işlem için gönderi sahibi olmalısın.' }, { status: 403 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Geçersiz işlem.' }, { status: 400 });
}
