import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { votePollOption } from '@/lib/db';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Ankete oy vermek için oturum açmalısın.' }, { status: 401 });
  }

  const body = await req.json();
  const postId = String(body.postId || '');
  const optionId = String(body.optionId || '');

  if (!postId || !optionId) {
    return NextResponse.json({ error: 'Geçersiz oy.' }, { status: 400 });
  }

  const ok = votePollOption(user.id, postId, optionId);
  if (!ok) {
    return NextResponse.json({ error: 'Anket seçeneği bulunamadı.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
