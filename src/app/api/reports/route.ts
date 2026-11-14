import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createReportRecord } from '@/lib/db';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Şikayet etmek için giriş yapmalısın.' }, { status: 401 });
  }

  const body = await req.json();
  const targetType = body.targetType === 'comment' ? 'comment' : 'post';
  const targetId = String(body.targetId || '');
  const reason = String(body.reason || '').trim();

  if (!targetId || reason.length < 3) {
    return NextResponse.json({ error: 'Lütfen kısa bir gerekçe belirtin.' }, { status: 400 });
  }

  createReportRecord({
    reporterId: user.id,
    targetType,
    targetId,
    reason,
  });

  return NextResponse.json({ ok: true });
}
