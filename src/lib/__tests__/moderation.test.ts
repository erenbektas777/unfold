import test from 'node:test';
import assert from 'node:assert/strict';
import { runLocalFilter } from '../moderation/local-filter.ts';
import { suggestTagsLocally } from '../moderation/ai-analyzer.ts';
import { computeTier } from '../constants.ts';
import { checkCooldown } from '../rate-limit.ts';

test('runLocalFilter allows clean Turkish venting text', () => {
  const res = runLocalFilter('Son zamanlarda iş yerinde çok yoruluyorum ve kimseye anlatamıyorum.');
  assert.equal(res.allowed, true);
  assert.equal(res.status, 'clean');
});

test('runLocalFilter blocks standard and obfuscated phone numbers', () => {
  const r1 = runLocalFilter('Bana 05321234567 üzerinden ulaşabilirsin');
  assert.equal(r1.allowed, false);
  assert.equal(r1.status, 'pii_blocked');

  const r2 = runLocalFilter('Numaram 0 5 3 2 1 2 3 4 5 6 7 yaz');
  assert.equal(r2.allowed, false);
  assert.equal(r2.status, 'pii_blocked');
});

test('runLocalFilter blocks email and social handles', () => {
  const r1 = runLocalFilter('Mail adresim deneme@ornek.com');
  assert.equal(r1.allowed, false);
  assert.equal(r1.status, 'pii_blocked');

  const r2 = runLocalFilter('instagram: @gizlihesap ekle');
  assert.equal(r2.allowed, false);
  assert.equal(r2.status, 'pii_blocked');
});

test('runLocalFilter blocks obfuscated profanity', () => {
  const res = runLocalFilter('Senin yaptığın işin a.m.k');
  assert.equal(res.allowed, false);
  assert.equal(res.status, 'profanity_blocked');
});

test('runLocalFilter flags crisis signals', () => {
  const res = runLocalFilter('Artık gerçekten yaşamak istemiyorum, çok yoruldum');
  assert.equal(res.allowed, false);
  assert.equal(res.status, 'crisis_flagged');
});

test('computeTier maps trust scores accurately', () => {
  assert.equal(computeTier(15), 'restricted');
  assert.equal(computeTier(50), 'new_observer');
  assert.equal(computeTier(70), 'trusted');
  assert.equal(computeTier(90), 'supporter');
});

test('suggestTagsLocally extracts relevant Turkish tags', () => {
  const tags = suggestTagsLocally('Patronum ofiste mobbing yapıyor, geceleri uyuyamıyorum.');
  assert.ok(tags.includes('mobbing'));
  assert.ok(tags.includes('uykusuzluk'));
});

test('checkCooldown enforces flood rate limit', () => {
  const key = 'test-user-cooldown';
  const first = checkCooldown(key, 5000);
  const second = checkCooldown(key, 5000);
  assert.equal(first.allowed, true);
  assert.equal(second.allowed, false);
  assert.ok(second.retryAfterSec >= 1);
});
