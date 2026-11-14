import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { generateAnonymousHandle } from './constants';
import {
  createProfile,
  getProfileById,
  getProfileWithAuthByEmail,
  isUsernameTaken,
} from './db';
import { Profile } from './types';

const COOKIE_NAME = 'unfold_session';

function getSecret(): string {
  return process.env.SESSION_SECRET || 'unfold-local-dev-secret-change-in-production';
}

export function validateEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Şifre en az 8 karakter olmalı.' };
  }
  if (!/[a-zA-ZğüşöçıİĞÜŞÖÇ]/.test(password) || !/\d/.test(password)) {
    return { valid: false, error: 'Şifre en az 1 harf ve 1 rakam içermeli.' };
  }
  return { valid: true };
}

export async function deliverVerificationCode(
  email: string,
  code: string,
  purpose: 'register' | 'reset'
): Promise<{ deliveredVia: 'resend' | 'local'; devCode?: string }> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    try {
      const subject =
        purpose === 'register'
          ? 'unfold — E-posta Doğrulama Kodun'
          : 'unfold — Şifre Sıfırlama Kodun';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'unfold <noreply@unfold.local>',
          to: [email],
          subject,
          text: `unfold doğrulama kodun: ${code}\nBu kod 10 dakika boyunca geçerlidir.`,
        }),
      });
      if (res.ok) {
        return { deliveredVia: 'resend' };
      }
    } catch {
      // E-posta servisi hata verirse yerel moda düş
    }
  }

  return { deliveredVia: 'local', devCode: code };
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const hashBuf = Buffer.from(hash, 'hex');
  if (derived.length !== hashBuf.length) return false;
  return crypto.timingSafeEqual(derived, hashBuf);
}

function signToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ uid: userId, iat: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token: string): string | null {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expectedSig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof parsed.uid === 'string' ? parsed.uid : null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, signToken(userId), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<Profile | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const uid = verifyToken(token);
  if (!uid) return null;
  return getProfileById(uid);
}

export function registerAccount(email: string, password: string, customUsername?: string): Profile {
  const existing = getProfileWithAuthByEmail(email);
  if (existing) {
    throw new Error('Bu e-posta adresiyle zaten bir hesap mevcut.');
  }

  let username = customUsername?.trim() || generateAnonymousHandle();
  if (customUsername?.trim() && isUsernameTaken(username)) {
    throw new Error('Bu anonim rumuz zaten kullanımda, lütfen başka bir rumuz seçin.');
  }
  while (isUsernameTaken(username)) {
    username = generateAnonymousHandle();
  }

  const avatarSeed = crypto.randomBytes(8).toString('hex');
  return createProfile({
    email,
    passwordHash: hashPassword(password),
    username,
    avatarSeed,
  });
}

export function loginAccount(email: string, password: string): Profile {
  const user = getProfileWithAuthByEmail(email);
  if (!user) {
    throw new Error('Bu e-posta adresiyle kayıtlı bir hesap bulunamadı. Lütfen önce hesap oluşturun.');
  }
  if (!verifyPassword(password, user.password_hash)) {
    throw new Error('Şifre hatalı. Şifreni unuttuysan sıfırlayabilirsin.');
  }
  return getProfileById(user.id)!;
}
