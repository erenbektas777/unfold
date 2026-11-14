import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getModerationDashboardData, promoteUserToAdmin, resolveReportAction } from '@/lib/db';

function getAdminSecret(): string {
  return process.env.MODERATION_SECRET || 'unfold-admin-2026';
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Moderasyon paneli için giriş yapmalısın.' }, { status: 401 });
  }
  if (!user.is_admin) {
    return NextResponse.json({ error: 'Bu alan yalnızca platform yöneticilerine açıktır.' }, { status: 403 });
  }
  const data = getModerationDashboardData();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Yetkisiz.' }, { status: 401 });
  }
  const body = await req.json();

  if (body.action === 'claim_admin') {
    const inputSecret = String(body.secret || '').trim();
    if (!inputSecret || inputSecret !== getAdminSecret()) {
      return NextResponse.json({ error: 'Yönetici anahtarı hatalı.' }, { status: 403 });
    }
    promoteUserToAdmin(user.id);
    return NextResponse.json({ ok: true });
  }

  if (!user.is_admin) {
    return NextResponse.json({ error: 'Bu işlem için yönetici yetkisi gerekiyor.' }, { status: 403 });
  }

  const reportId = String(body.reportId || '');
  const action = body.action as 'dismiss_report' | 'hide_target' | 'restore_target';

  if (!reportId || !['dismiss_report', 'hide_target', 'restore_target'].includes(action)) {
    return NextResponse.json({ error: 'Geçersiz moderasyon işlemi.' }, { status: 400 });
  }

  const ok = resolveReportAction(reportId, action);
  if (!ok) {
    return NextResponse.json({ error: 'Rapor bulunamadı.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
