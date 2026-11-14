import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { toggleReactionRecord } from '@/lib/db';
import { ReactionType } from '@/lib/types';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Tepki vermek için giriş yapmalısın.' }, { status: 401 });
  }

  const body = await req.json();
  const targetType = body.targetType === 'comment' ? 'comment' : 'post';
  const targetId = String(body.targetId || '');
  const reactionType = body.reactionType as ReactionType;

  if (!targetId || !['ayni_durumdayim', 'yanindayim', 'seni_anliyorum'].includes(reactionType)) {
    return NextResponse.json({ error: 'Geçersiz tepki.' }, { status: 400 });
  }

  const result = toggleReactionRecord({
    userId: user.id,
    targetType,
    targetId,
    reactionType,
  });

  return NextResponse.json(result);
}
