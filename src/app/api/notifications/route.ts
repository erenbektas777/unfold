import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getNotificationsForUser, markAllNotificationsRead } from '@/lib/db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ notifications: [] });
  }
  const notifications = getNotificationsForUser(user.id);
  return NextResponse.json({ notifications });
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Yetkisiz.' }, { status: 401 });
  }
  markAllNotificationsRead(user.id);
  return NextResponse.json({ ok: true });
}
