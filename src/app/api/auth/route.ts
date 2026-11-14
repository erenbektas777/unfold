import { NextRequest, NextResponse } from 'next/server';
import {
  clearSessionCookie,
  deliverVerificationCode,
  getCurrentUser,
  hashPassword,
  loginAccount,
  registerAccount,
  setSessionCookie,
  validateEmailFormat,
  validatePasswordStrength,
} from '@/lib/auth';
import { generateAnonymousHandle } from '@/lib/constants';
import {
  createVerificationCode,
  getDailyUsageCounts,
  getProfileById,
  getProfileWithAuthByEmail,
  isUsernameTaken,
  updateUsername,
  updateUserPassword,
  verifyOtpCode,
} from '@/lib/db';
import { checkCooldown } from '@/lib/rate-limit';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null });
  }
  const usage = getDailyUsageCounts(user.id);
  return NextResponse.json({ user, usage });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action;

    if (action === 'logout') {
      await clearSessionCookie();
      return NextResponse.json({ ok: true });
    }

    if (action === 'register_request') {
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const username = body.username ? String(body.username).trim() : '';

      if (!validateEmailFormat(email)) {
        return NextResponse.json({ error: 'Lütfen geçerli bir e-posta adresi girin.' }, { status: 400 });
      }
      const pwCheck = validatePasswordStrength(password);
      if (!pwCheck.valid) {
        return NextResponse.json({ error: pwCheck.error }, { status: 400 });
      }
      if (getProfileWithAuthByEmail(email)) {
        return NextResponse.json(
          { error: 'Bu e-posta adresiyle zaten bir hesap var. Giriş yapmayı deneyin.' },
          { status: 400 }
        );
      }
      if (username) {
        if (username.length < 3 || username.length > 24) {
          return NextResponse.json({ error: 'Rumuz 3 ile 24 karakter arasında olmalı.' }, { status: 400 });
        }
        if (isUsernameTaken(username)) {
          return NextResponse.json({ error: 'Bu anonim rumuz zaten kullanımda.' }, { status: 400 });
        }
      }

      const cooldown = checkCooldown(`otp:reg:${email}`, 15_000);
      if (!cooldown.allowed) {
        return NextResponse.json(
          { error: `Yeni kod istemek için ${cooldown.retryAfterSec} sn bekleyin.` },
          { status: 429 }
        );
      }

      const code = createVerificationCode(email, 'register');
      const delivery = await deliverVerificationCode(email, code, 'register');
      return NextResponse.json({
        ok: true,
        deliveredVia: delivery.deliveredVia,
        devCode: delivery.devCode,
      });
    }

    if (action === 'register_verify') {
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const username = body.username ? String(body.username).trim() : undefined;
      const code = String(body.code || '').trim();

      if (!validateEmailFormat(email)) {
        return NextResponse.json({ error: 'Geçersiz e-posta adresi.' }, { status: 400 });
      }
      const pwCheck = validatePasswordStrength(password);
      if (!pwCheck.valid) {
        return NextResponse.json({ error: pwCheck.error }, { status: 400 });
      }

      const otpCheck = verifyOtpCode(email, 'register', code);
      if (!otpCheck.valid) {
        return NextResponse.json({ error: otpCheck.error }, { status: 400 });
      }

      const user = registerAccount(email, password, username);
      await setSessionCookie(user.id);
      return NextResponse.json({ user });
    }

    if (action === 'login') {
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');

      if (!validateEmailFormat(email) || !password) {
        return NextResponse.json({ error: 'Geçerli e-posta ve şifre girin.' }, { status: 400 });
      }

      const cooldown = checkCooldown(`login:${email}`, 2000);
      if (!cooldown.allowed) {
        return NextResponse.json(
          { error: `Çok sık giriş denemesi. Lütfen ${cooldown.retryAfterSec} sn bekleyin.` },
          { status: 429 }
        );
      }

      const user = loginAccount(email, password);
      await setSessionCookie(user.id);
      return NextResponse.json({ user });
    }

    if (action === 'reset_request') {
      const email = String(body.email || '').trim().toLowerCase();
      if (!validateEmailFormat(email)) {
        return NextResponse.json({ error: 'Geçerli bir e-posta adresi girin.' }, { status: 400 });
      }
      const existing = getProfileWithAuthByEmail(email);
      if (!existing) {
        return NextResponse.json(
          { error: 'Bu e-posta adresiyle kayıtlı bir hesap bulunamadı.' },
          { status: 404 }
        );
      }

      const cooldown = checkCooldown(`otp:reset:${email}`, 15_000);
      if (!cooldown.allowed) {
        return NextResponse.json(
          { error: `Yeni kod istemek için ${cooldown.retryAfterSec} sn bekleyin.` },
          { status: 429 }
        );
      }

      const code = createVerificationCode(email, 'reset');
      const delivery = await deliverVerificationCode(email, code, 'reset');
      return NextResponse.json({
        ok: true,
        deliveredVia: delivery.deliveredVia,
        devCode: delivery.devCode,
      });
    }

    if (action === 'reset_verify') {
      const email = String(body.email || '').trim().toLowerCase();
      const code = String(body.code || '').trim();
      const newPassword = String(body.newPassword || '');

      const pwCheck = validatePasswordStrength(newPassword);
      if (!pwCheck.valid) {
        return NextResponse.json({ error: pwCheck.error }, { status: 400 });
      }

      const otpCheck = verifyOtpCode(email, 'reset', code);
      if (!otpCheck.valid) {
        return NextResponse.json({ error: otpCheck.error }, { status: 400 });
      }

      updateUserPassword(email, hashPassword(newPassword));
      const profile = getProfileWithAuthByEmail(email);
      if (!profile) {
        return NextResponse.json({ error: 'Hesap bulunamadı.' }, { status: 404 });
      }
      await setSessionCookie(profile.id);
      return NextResponse.json({ user: getProfileById(profile.id) });
    }

    if (action === 'demo') {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
      const cd = checkCooldown(`demo:${ip}`, 10_000);
      if (!cd.allowed) {
        return NextResponse.json(
          { error: `Yeni demo hesabı için ${cd.retryAfterSec} sn bekleyin.` },
          { status: 429 }
        );
      }
      const randomEmail = `misafir.${Date.now()}.${Math.floor(Math.random() * 1000)}@unfold.local`;
      const user = registerAccount(randomEmail, 'UnfoldDemo123', generateAnonymousHandle());
      await setSessionCookie(user.id);
      return NextResponse.json({ user });
    }

    if (action === 'update_username') {
      const current = await getCurrentUser();
      if (!current) {
        return NextResponse.json({ error: 'Oturum bulunamadı.' }, { status: 401 });
      }
      const newName = String(body.username || '').trim();
      if (newName.length < 3 || newName.length > 24) {
        return NextResponse.json({ error: 'Rumuz 3 ile 24 karakter arasında olmalı.' }, { status: 400 });
      }
      if (newName.toLowerCase() !== current.username.toLowerCase() && isUsernameTaken(newName)) {
        return NextResponse.json({ error: 'Bu anonim rumuz zaten kullanımda.' }, { status: 400 });
      }
      const updated = updateUsername(current.id, newName);
      return NextResponse.json({ user: updated });
    }

    return NextResponse.json({ error: 'Geçersiz işlem.' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bir hata oluştu.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
