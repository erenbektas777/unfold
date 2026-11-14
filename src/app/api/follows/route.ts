import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserFollowedTopics, toggleUserFollowTopic } from '@/lib/db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ categories: [], tags: [] });
  }
  const follows = getUserFollowedTopics(user.id);
  return NextResponse.json(follows);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Takip listesini kaydetmek için oturum açmalısın.' }, { status: 401 });
  }
  const body = await req.json();
  const targetType = body.targetType === 'tag' ? 'tag' : 'category';
  const targetSlug = String(body.targetSlug || '').trim();
  if (!targetSlug) {
    return NextResponse.json({ error: 'Konu veya etiket belirtilmedi.' }, { status: 400 });
  }
  const res = toggleUserFollowTopic(user.id, targetType, targetSlug);
  return NextResponse.json(res);
}
