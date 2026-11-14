import type { LocalFilterResult } from '../types';

// Katman 1 (<5ms): Güçlendirilmiş Türkçe PII, bypass/obfuscation ve kriz tespiti

const CRISIS_PATTERNS = [
  /\bintihar\s*(etmek|edece[gğ]im|düşünüyorum|fikri|etsem)\b/i,
  /\bkendime\s*zarar\s*(vermek|verece[gğ]im|veriyorum)\b/i,
  /\byaşamak\s*istemiyorum\b/i,
  /\bölsem\s*(keşke|kurtulsam|daha\s*iyi)\b/i,
  /\bcanıma\s*kıymak\b/i,
  /\bhayatıma\s*son\s*ver/i,
];

const PII_PATTERNS: { pattern: RegExp; flag: string }[] = [
  { pattern: /\b0?5\d{2}[\s.\-_)]*\d{3}[\s.\-_]*\d{2}[\s.\-_]*\d{2}\b/, flag: 'phone_number' },
  { pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, flag: 'email_address' },
  { pattern: /\b[1-9]\d{10}\b/, flag: 'tc_kimlik_or_id' },
  { pattern: /(?:instagram|ig|insta|telegram|tg|snapchat|whatsapp|wp)\s*[:@]?\s*[@a-z0-9._]{3,}/i, flag: 'social_handle' },
  { pattern: /(?:^|\s)@[a-z0-9._]{3,30}\b/i, flag: 'mention_handle' },
];

const SEVERE_ABUSE_WORDS = [
  'amk',
  'aq',
  'orospu',
  'siktir',
  'gotveren',
  'yavsak',
  'kahpe',
  'gebersin',
  'ol git',
  'kendini oldur',
  'defol git',
];

function normalizeTurkishForFilter(input: string): string {
  return input
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

function deobfuscate(input: string): string {
  return input
    .replace(/(?<=\b[a-z0-9])[.\-_*]+(?=[a-z0-9]\b)/gi, '')
    .replace(/(?<=\b[a-z0-9])\s+(?=[a-z0-9]\b)/gi, '');
}

export function runLocalFilter(text: string): LocalFilterResult {
  const trimmed = text.trim();
  const normalizedTr = trimmed.toLocaleLowerCase('tr-TR');
  const asciiCompact = deobfuscate(normalizeTurkishForFilter(trimmed));
  const flags: string[] = [];

  for (const pattern of CRISIS_PATTERNS) {
    if (pattern.test(normalizedTr)) {
      flags.push('crisis_signal');
      return {
        allowed: false,
        status: 'crisis_flagged',
        reason: 'Kendine zarar verme veya yoğun kriz sinyali tespit edildi.',
        flags,
      };
    }
  }

  for (const { pattern, flag } of PII_PATTERNS) {
    if (pattern.test(trimmed) || pattern.test(asciiCompact)) {
      flags.push(flag);
    }
  }
  const digitsOnly = trimmed.replace(/[\s.\-()]/g, '');
  if (!flags.includes('phone_number') && /(?:^|\D)0?5\d{9}(?:\D|$)/.test(digitsOnly)) {
    flags.push('phone_number_obfuscated');
  }

  if (flags.length > 0) {
    return {
      allowed: false,
      status: 'pii_blocked',
      reason: 'Anonimliğini korumak için telefon, e-posta, kimlik veya sosyal medya kullanıcı adı paylaşamazsın.',
      flags,
    };
  }

  for (const word of SEVERE_ABUSE_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(asciiCompact)) {
      flags.push('severe_profanity_or_harassment');
      return {
        allowed: false,
        status: 'profanity_blocked',
        reason: 'Platformun güvenli kalması için ağır hakaret veya kırıcı ifadeler içeren metinler yayınlanamaz.',
        flags,
      };
    }
  }

  return {
    allowed: true,
    status: 'clean',
    flags: [],
  };
}
