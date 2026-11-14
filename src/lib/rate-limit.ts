// Kısa süreli spam / flood koruması (kullanıcı veya IP bazlı cooldown)

const cooldownStore = new Map<string, number>();

export function checkCooldown(key: string, windowMs: number): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const last = cooldownStore.get(key);

  if (last && now - last < windowMs) {
    const retryAfterSec = Math.ceil((windowMs - (now - last)) / 1000);
    return { allowed: false, retryAfterSec };
  }

  cooldownStore.set(key, now);

  // Bellek sızıntısını önlemek için eski kayıtları temizle
  if (cooldownStore.size > 5000) {
    for (const [k, ts] of cooldownStore.entries()) {
      if (now - ts > 60_000) cooldownStore.delete(k);
    }
  }

  return { allowed: true, retryAfterSec: 0 };
}
