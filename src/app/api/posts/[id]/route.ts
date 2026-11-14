import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  addPostStoryUpdate,
  deletePostRecord,
  getCommentsTree,
  getPostById,
  getSimilarPosts,
  updatePostRecord,
} from '@/lib/db';
import { runAiContextualAnalysis } from '@/lib/moderation/ai-analyzer';
import { runLocalFilter } from '@/lib/moderation/local-filter';
import { ReplyMode } from '@/lib/types';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  const post = getPostById(id, user?.id ?? null);
  if (!post) {
    return NextResponse.json({ error: 'Paylaşım bulunamadı.' }, { status: 404 });
  }
  const comments = getCommentsTree(id, user?.id ?? null);
  const similarPosts = getSimilarPosts(id, 4);
  return NextResponse.json({ post, comments, similarPosts });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 });
  }

  const body = await req.json();

  // "Sonra Ne Oldu?" güncelleme bloğu ekleme (#2)
  if (body.action === 'add_update') {
    const updateText = String(body.updateText || '').trim();
    if (updateText.length < 10) {
      return NextResponse.json({ error: 'Güncelleme metni en az 10 karakter olmalı.' }, { status: 400 });
    }
    const l1 = runLocalFilter(updateText);
    if (!l1.allowed) {
      return NextResponse.json(
        { error: l1.reason, crisis: l1.status === 'crisis_flagged' },
        { status: 422 }
      );
    }
    const updated = addPostStoryUpdate(id, user.id, updateText);
    if (!updated) {
      return NextResponse.json({ error: 'Paylaşım bulunamadı veya yetkin yok.' }, { status: 404 });
    }
    return NextResponse.json({ post: updated });
  }

  // Yazar öz-moderasyonu: Tek tuşla "Sadece Empati (Yorum Kapalı)" veya "Yoruma Açık" değiştirme (#9)
  if (body.action === 'set_reply_mode') {
    const existing = getPostById(id, user.id);
    if (!existing || existing.author_id !== user.id) {
      return NextResponse.json({ error: 'Yetkin yok.' }, { status: 403 });
    }
    const nextMode = (body.replyMode || 'empathy_only') as ReplyMode;
    const updated = updatePostRecord({
      postId: id,
      authorId: user.id,
      title: existing.title,
      content: existing.content,
      replyMode: nextMode,
    });
    return NextResponse.json({ post: updated });
  }

  const title = String(body.title || '').trim();
  const content = String(body.content || '').trim();
  const replyMode = (body.replyMode || 'open') as ReplyMode;

  if (title.length < 5 || content.length < 15) {
    return NextResponse.json({ error: 'Başlık en az 5, metin en az 15 karakter olmalı.' }, { status: 400 });
  }

  const l1 = runLocalFilter(`${title}\n${content}`);
  if (!l1.allowed) {
    return NextResponse.json(
      { error: l1.reason, crisis: l1.status === 'crisis_flagged' },
      { status: 422 }
    );
  }

  const l2 = await runAiContextualAnalysis(`${title}\n${content}`);
  if (l2.shouldHide) {
    return NextResponse.json({ error: 'Güncellenen metin topluluk kurallarına uygun değil.' }, { status: 422 });
  }

  const updated = updatePostRecord({
    postId: id,
    authorId: user.id,
    title,
    content,
    replyMode,
  });

  if (!updated) {
    return NextResponse.json({ error: 'Paylaşım bulunamadı veya yetkin yok.' }, { status: 404 });
  }

  return NextResponse.json({ post: updated });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 });
  }

  const deleted = deletePostRecord(id, user.id);
  if (!deleted) {
    return NextResponse.json({ error: 'Paylaşım bulunamadı veya yetkin yok.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
