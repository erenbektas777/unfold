import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { toggleBookmarkRecord } from '@/lib/db';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Kaydetmek için giriş yapmalısın.' }, { status: 401 });
  }
  const body = await req.json();
  const postId = String(body.postId || '');
  if (!postId) {
    return NextResponse.json({ error: 'Geçersiz paylaşım.' }, { status: 400 });
  }
  const result = toggleBookmarkRecord(user.id, postId);
  return NextResponse.json(result);
}
