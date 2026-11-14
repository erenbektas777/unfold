import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { CATEGORIES, computeTier } from './constants';
import {
  AccountTier,
  CommentNode,
  GroupedTags,
  ModerationLogItem,
  Mood,
  NotificationItem,
  PollData,
  PollOption,
  Post,
  Profile,
  ReactionType,
  ReplyMode,
  ReportItem,
  Tag,
} from './types';

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_PATH = path.join(DATA_DIR, 'unfold.db');

declare global {
  // eslint-disable-next-line no-var
  var __unfoldDb: DatabaseSync | undefined;
}

function getDb(): DatabaseSync {
  if (global.__unfoldDb) return global.__unfoldDb;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  initSchema(db);
  seedDatabase(db);
  global.__unfoldDb = db;
  return db;
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      avatar_seed TEXT NOT NULL,
      trust_score INTEGER NOT NULL DEFAULT 50,
      account_tier TEXT NOT NULL DEFAULT 'new_observer',
      is_premium INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email_verifications (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      purpose TEXT NOT NULL,
      code TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      usage_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      mood TEXT NOT NULL,
      reply_mode TEXT NOT NULL DEFAULT 'open',
      moderation_status TEXT NOT NULL DEFAULT 'approved',
      same_here_count INTEGER NOT NULL DEFAULT 0,
      empathy_count INTEGER NOT NULL DEFAULT 0,
      comment_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS post_tags (
      post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (post_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      moderation_status TEXT NOT NULL DEFAULT 'approved',
      empathy_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      reaction_type TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (user_id, target_type, target_id, reaction_type)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      reference_id TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reporter_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS moderation_logs (
      id TEXT PRIMARY KEY,
      target_type TEXT NOT NULL,
      target_id TEXT,
      layer TEXT NOT NULL,
      risk_score INTEGER NOT NULL DEFAULT 0,
      flags TEXT NOT NULL DEFAULT '[]',
      action_taken TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, post_id)
    );

    CREATE TABLE IF NOT EXISTS poll_options (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      vote_count INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS poll_votes (
      post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      option_id TEXT NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (post_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS topic_follows (
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      target_type TEXT NOT NULL,
      target_slug TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, target_type, target_slug)
    );
  `);

  ensureColumn(db, 'profiles', 'is_admin', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn(db, 'posts', 'update_text', 'TEXT');
  ensureColumn(db, 'posts', 'updated_story_at', 'TEXT');
  ensureColumn(db, 'posts', 'expires_at', 'TEXT');
  ensureColumn(db, 'posts', 'poll_question', 'TEXT');
  ensureColumn(db, 'posts', 'is_daily_win', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn(db, 'comments', 'is_helpful', 'INTEGER NOT NULL DEFAULT 0');
}

function ensureColumn(db: DatabaseSync, table: string, col: string, def: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === col)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
  }
}

function seedDatabase(db: DatabaseSync) {
  const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (catCount.count === 0) {
    const insertCat = db.prepare('INSERT INTO categories (id, slug, name, description, icon) VALUES (?, ?, ?, ?, ?)');
    for (const c of CATEGORIES) {
      insertCat.run(c.id, c.slug, c.name, c.description, c.icon);
    }
  }

  const postCount = db.prepare('SELECT COUNT(*) as count FROM posts').get() as { count: number };
  if (postCount.count > 0) {
    seedExtraFeaturesIfMissing(db);
    return;
  }

  // Seed anonymous profiles
  const users = [
    { id: 'u-seed-1', email: 'seed1@unfold.local', username: 'SessizMartı42', seed: 'seed-marti', trust: 88, tier: 'supporter' },
    { id: 'u-seed-2', email: 'seed2@unfold.local', username: 'GeceYolcusu19', seed: 'seed-yolcu', trust: 72, tier: 'trusted' },
    { id: 'u-seed-3', email: 'seed3@unfold.local', username: 'DalgınFener64', seed: 'seed-fener', trust: 65, tier: 'trusted' },
    { id: 'u-seed-4', email: 'seed4@unfold.local', username: 'PusluLiman27', seed: 'seed-liman', trust: 54, tier: 'new_observer' },
  ];

  const insertUser = db.prepare(
    `INSERT INTO profiles (id, email, password_hash, username, avatar_seed, trust_score, account_tier)
     VALUES (?, ?, 'seed-locked', ?, ?, ?, ?)`
  );
  for (const u of users) {
    insertUser.run(u.id, u.email, u.username, u.seed, u.trust, u.tier);
  }

  const seedPosts = [
    {
      id: 'p-seed-1',
      author_id: 'u-seed-2',
      category_id: 2,
      title: 'İşimde her gün görünmez bir mobbing yaşıyorum ama istifa etmeye korkuyorum',
      content:
        'Son 6 aydır yöneticim herkesin içinde yaptığım işleri küçümsüyor, akşam 9da mesaj atıp sabah hesap soruyor. Ekonomik belirsizlik yüzünden çıkamıyorum da. Akşamları eve gelince hiçbir şeye enerjim kalmıyor. Aynı süreci atlatan veya şu an yaşayan var mı?',
      mood: 'bunaldim',
      reply_mode: 'advice_wanted',
      same_here: 14,
      empathy: 22,
      tags: ['mobbing', 'tükenmişlik', 'gelecek-kaygısı'],
      hoursAgo: 3,
    },
    {
      id: 'p-seed-2',
      author_id: 'u-seed-4',
      category_id: 4,
      title: 'Kalabalıkların içinde bile derin bir yalnızlık hissi',
      content:
        'Üniversiteden mezun olduktan sonra herkes kendi hayatına dağıldı. Gün içinde onlarca insanla konuşuyorum ama akşam telefonu elime aldığımda gerçekten "nasılsın" diye soracak kimse yokmuş gibi hissediyorum. Bunu normalleştirmek mi gerekiyor yoksa bir şeyleri yanlış mı yapıyorum?',
      mood: 'yalniz',
      reply_mode: 'open',
      same_here: 29,
      empathy: 34,
      tags: ['yalnızlık', 'mezuniyet-sonrası', 'anlaşılamama'],
      hoursAgo: 7,
    },
    {
      id: 'p-seed-3',
      author_id: 'u-seed-3',
      category_id: 1,
      title: '4 yıllık ilişkimi bitirdim, doğru karar ama boşluğu çok ağır',
      content:
        'Sürekli aynı tartışmaların içinde dönüp duruyorduk, ikimiz de birbirimizi yıpratıyorduk. Mantığım "iyi ki bitti" diyor ama sabah uyanınca ilk 10 saniye her şey yolundaymış gibi hissedip sonra gerçeğe çarpmak çok yorucu.',
      mood: 'uzgun',
      reply_mode: 'empathy_only',
      same_here: 19,
      empathy: 41,
      tags: ['ayrılık', 'uykusuzluk', 'yas-süreci'],
      hoursAgo: 12,
    },
    {
      id: 'p-seed-4',
      author_id: 'u-seed-1',
      category_id: 6,
      title: 'Sınav yaklaştıkça masanın başına oturup hiçbir şey yapamadan saatlerce bakıyorum',
      content:
        'Konular yetişmeyecek korkusu o kadar büyük ki başlamaya bile cesaret edemiyorum. Sonra gece vicdan azabından uyuyamıyorum. Bu kısır döngüyü kıran biri nasıl kırdı?',
      mood: 'kararsiz',
      reply_mode: 'advice_wanted',
      same_here: 24,
      empathy: 18,
      tags: ['sınav-stresi', 'erteleme', 'uykusuzluk'],
      hoursAgo: 1,
    },
    {
      id: 'p-seed-5',
      author_id: 'u-seed-2',
      category_id: 3,
      title: 'Ailemin beklentileriyle kendi hayatım arasında sıkıştım',
      content:
        'Ne zaman kendi istediğim bir karar alsam "biz senin iyiliğin için" cümlesiyle suçluluk hissediyorum. 26 yaşındayım ama hala onay almadan adım atamıyor gibiyim. Sınır koymayı başarabilen var mı?',
      mood: 'bunaldim',
      reply_mode: 'open',
      same_here: 17,
      empathy: 15,
      tags: ['aile-baskısı', 'sınır-koyma', 'gelecek-kaygısı'],
      hoursAgo: 18,
    },
  ];

  const insertPost = db.prepare(`
    INSERT INTO posts (id, author_id, category_id, title, content, mood, reply_mode, moderation_status, same_here_count, empathy_count, comment_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?, ?, datetime('now', ?), datetime('now', ?))
  `);

  for (const p of seedPosts) {
    const commentCount = p.id === 'p-seed-1' ? 2 : p.id === 'p-seed-2' ? 1 : 0;
    const offset = `-${p.hoursAgo} hours`;
    insertPost.run(
      p.id,
      p.author_id,
      p.category_id,
      p.title,
      p.content,
      p.mood,
      p.reply_mode,
      p.same_here,
      p.empathy,
      commentCount,
      offset,
      offset
    );
    attachTagsToPost(db, p.id, p.tags);
  }

  // Seed threaded comments
  const insertComment = db.prepare(`
    INSERT INTO comments (id, post_id, author_id, parent_id, content, moderation_status, empathy_count, created_at)
    VALUES (?, ?, ?, ?, ?, 'approved', ?, datetime('now', ?))
  `);
  insertComment.run(
    'c-seed-1',
    'p-seed-1',
    'u-seed-1',
    null,
    'Geçen yıl birebir aynısını yaşadım. İlk yaptığım şey tüm yazılı talimatları ve saat dışı mesajları ekran görüntüsüyle arşivlemek oldu. Kendini suçlama, sorun sende değil yönetim tarzında.',
    9,
    '-2 hours'
  );
  insertComment.run(
    'c-seed-2',
    'p-seed-1',
    'u-seed-2',
    'c-seed-1',
    'Çok teşekkür ederim, bunu duymaya gerçekten ihtiyacım vardı. Arşivleme fikri çok mantıklı, bugünden başlıyorum.',
    4,
    '-1 hours'
  );
  insertComment.run(
    'c-seed-3',
    'p-seed-2',
    'u-seed-1',
    null,
    'Mezuniyet sonrası o boşluk çok gerçek. Benzer bir dönemden geçerken haftada bir gün sadece kendime ait küçük bir rutin (aynı kafede kitap okumak gibi) oluşturmak biraz nefes aldırmıştı.',
    7,
    '-5 hours'
  );
  seedExtraFeaturesIfMissing(db);
}

function seedExtraFeaturesIfMissing(db: DatabaseSync) {
  const pollCount = db.prepare('SELECT COUNT(*) as c FROM poll_options').get() as { c: number };
  if (pollCount.c === 0) {
    const p1 = db.prepare('SELECT id FROM posts WHERE id = ?').get('p-seed-1');
    if (p1) {
      db.prepare('UPDATE posts SET poll_question = ? WHERE id = ?').run(
        'Siz benim yerimde olsaydınız ne yapardınız?',
        'p-seed-1'
      );
      const insOpt = db.prepare(
        'INSERT INTO poll_options (id, post_id, label, vote_count, sort_order) VALUES (?, ?, ?, ?, ?)'
      );
      insOpt.run('po-seed-1', 'p-seed-1', 'Yeni iş bulana kadar sabredip kanıt topla', 18, 0);
      insOpt.run('po-seed-2', 'p-seed-1', 'İK veya üst yönetimle resmi görüşme talep et', 7, 1);
      insOpt.run('po-seed-3', 'p-seed-1', 'Sağlığın her şeyden önemli, hemen ayrıl', 11, 2);
    }

    const p5 = db.prepare('SELECT id, update_text FROM posts WHERE id = ?').get('p-seed-5') as
      | { id: string; update_text: string | null }
      | undefined;
    if (p5 && !p5.update_text) {
      db.prepare("UPDATE posts SET update_text = ?, updated_story_at = datetime('now', '-2 hours') WHERE id = ?").run(
        'Dün akşam annemle sakin bir şekilde konuşup kendi evime çıkma kararımı netleştirdim. İlk başta zor oldu ama üzerimden tonlarca yük kalktı.',
        'p-seed-5'
      );
    }

    db.prepare('UPDATE comments SET is_helpful = 1 WHERE id = ?').run('c-seed-1');
  }

  const winCount = db.prepare('SELECT COUNT(*) as c FROM posts WHERE is_daily_win = 1').get() as { c: number };
  if (winCount.c === 0) {
    const insertWin = db.prepare(`
      INSERT OR IGNORE INTO posts (id, author_id, category_id, title, content, mood, reply_mode, moderation_status, same_here_count, empathy_count, comment_count, is_daily_win, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'umutlu', 'open', 'approved', ?, ?, 0, 1, datetime('now', ?), datetime('now', ?))
    `);
    insertWin.run(
      'p-win-1',
      'u-seed-1',
      5,
      'Aylar sonra ilk kez sabah alarmı ertelemeden kalkıp 20 dakika yürüyüş yaptım',
      'Depresif hissettiğim dönemlerde yataktan çıkmak bile dağ tırmanmak gibi geliyordu. Bugün sadece ayakkabılarımı giyip sokağa çıktım ve temiz hava aldım. Küçük bir adım ama kendimle gurur duydum.',
      16,
      28,
      '-4 hours',
      '-4 hours'
    );
    attachTagsToPost(db, 'p-win-1', ['küçük-zafer', 'iyileşme', 'özbakım']);

    insertWin.run(
      'p-win-2',
      'u-seed-3',
      2,
      'Aylarca çekindiğim sınır koyma konuşmasını bugün sakin kalarak yaptım',
      'İş yerinde sürekli başkalarının görevlerini üstlenip akşamları tükeniyordum. Bugün ilk kez sesim titremeden "şu anki iş yükümle bunu alamam" dedim ve korktuğum hiçbir felaket yaşanmadı.',
      21,
      35,
      '-9 hours',
      '-9 hours'
    );
    attachTagsToPost(db, 'p-win-2', ['küçük-zafer', 'sınır-koyma', 'özgüven']);
  }
}

function slugifyTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^#/, '')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

function attachTagsToPost(db: DatabaseSync, postId: string, rawTags: string[]) {
  const cleanTags = Array.from(
    new Set(
      rawTags
        .map((t) => ({ name: t.trim().replace(/^#/, '').toLowerCase(), slug: slugifyTag(t) }))
        .filter((t) => t.slug.length >= 2)
    )
  ).slice(0, 5);

  const upsertTag = db.prepare(`
    INSERT INTO tags (slug, name, usage_count) VALUES (?, ?, 1)
    ON CONFLICT(slug) DO UPDATE SET usage_count = usage_count + 1
  `);
  const getTag = db.prepare('SELECT id FROM tags WHERE slug = ?');
  const linkTag = db.prepare('INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)');

  for (const tag of cleanTags) {
    upsertTag.run(tag.slug, tag.name);
    const row = getTag.get(tag.slug) as { id: number } | undefined;
    if (row) {
      linkTag.run(postId, row.id);
    }
  }
}

function isConfiguredAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS || '';
  const list = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

export function getProfileById(id: string): Profile | null {
  const db = getDb();
  const row = db
    .prepare(
      'SELECT id, username, email, avatar_seed, trust_score, account_tier, is_premium, is_admin, created_at FROM profiles WHERE id = ?'
    )
    .get(id) as
    | (Omit<Profile, 'is_premium' | 'is_admin'> & { is_premium: number; is_admin?: number })
    | undefined;
  if (!row) return null;
  const realEmail = row.email && !row.email.endsWith('@unfold.local') ? row.email : null;
  return {
    ...row,
    email: realEmail,
    is_premium: Boolean(row.is_premium),
    is_admin: Boolean(row.is_admin) || isConfiguredAdminEmail(row.email),
  };
}

export function promoteUserToAdmin(userId: string): boolean {
  const db = getDb();
  const res = db.prepare('UPDATE profiles SET is_admin = 1 WHERE id = ?').run(userId);
  return Number(res.changes) > 0;
}

export function getProfileWithAuthByEmail(email: string) {
  const db = getDb();
  return db
    .prepare('SELECT * FROM profiles WHERE email = ?')
    .get(email.toLowerCase().trim()) as
    | (Omit<Profile, 'is_premium'> & { email: string; password_hash: string; is_premium: number })
    | undefined;
}

export function createProfile(data: {
  email: string;
  passwordHash: string;
  username: string;
  avatarSeed: string;
}): Profile {
  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO profiles (id, email, password_hash, username, avatar_seed, trust_score, account_tier)
     VALUES (?, ?, ?, ?, ?, 50, 'new_observer')`
  ).run(id, data.email.toLowerCase().trim(), data.passwordHash, data.username, data.avatarSeed);
  return getProfileById(id)!;
}

export function updateUsername(userId: string, username: string): Profile | null {
  const db = getDb();
  db.prepare('UPDATE profiles SET username = ? WHERE id = ?').run(username.trim(), userId);
  return getProfileById(userId);
}

export function isUsernameTaken(username: string): boolean {
  const db = getDb();
  const row = db
    .prepare('SELECT 1 FROM profiles WHERE LOWER(username) = LOWER(?)')
    .get(username.trim());
  return Boolean(row);
}

export function createVerificationCode(email: string, purpose: 'register' | 'reset'): string {
  const db = getDb();
  const normalizedEmail = email.toLowerCase().trim();
  const code = String(crypto.randomInt(100000, 999999));

  db.prepare('DELETE FROM email_verifications WHERE email = ? AND purpose = ?').run(normalizedEmail, purpose);
  db.prepare(
    `INSERT INTO email_verifications (id, email, purpose, code, expires_at)
     VALUES (?, ?, ?, ?, datetime('now', '+10 minutes'))`
  ).run(crypto.randomUUID(), normalizedEmail, purpose, code);

  return code;
}

export function verifyOtpCode(
  email: string,
  purpose: 'register' | 'reset',
  inputCode: string
): { valid: boolean; error?: string } {
  const db = getDb();
  const normalizedEmail = email.toLowerCase().trim();
  const row = db
    .prepare(
      `SELECT * FROM email_verifications
       WHERE email = ? AND purpose = ?
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(normalizedEmail, purpose) as
    | { id: string; code: string; attempts: number; expires_at: string }
    | undefined;

  if (!row) {
    return { valid: false, error: 'Doğrulama kodu bulunamadı. Lütfen yeni kod isteyin.' };
  }

  const expired = db
    .prepare("SELECT 1 FROM email_verifications WHERE id = ? AND expires_at <= datetime('now')")
    .get(row.id);
  if (expired) {
    db.prepare('DELETE FROM email_verifications WHERE id = ?').run(row.id);
    return { valid: false, error: 'Doğrulama kodunun süresi doldu. Lütfen yeni kod isteyin.' };
  }

  if (row.attempts >= 5) {
    db.prepare('DELETE FROM email_verifications WHERE id = ?').run(row.id);
    return { valid: false, error: 'Çok fazla hatalı deneme. Lütfen yeni doğrulama kodu isteyin.' };
  }

  if (row.code !== inputCode.trim()) {
    db.prepare('UPDATE email_verifications SET attempts = attempts + 1 WHERE id = ?').run(row.id);
    return { valid: false, error: `Doğrulama kodu hatalı (${4 - row.attempts} deneme hakkı kaldı).` };
  }

  db.prepare('DELETE FROM email_verifications WHERE id = ?').run(row.id);
  return { valid: true };
}

export function updateUserPassword(email: string, passwordHash: string): boolean {
  const db = getDb();
  const res = db
    .prepare('UPDATE profiles SET password_hash = ? WHERE email = ?')
    .run(passwordHash, email.toLowerCase().trim());
  return Number(res.changes) > 0;
}

export function getDailyUsageCounts(userId: string): { postsToday: number; commentsToday: number } {
  const db = getDb();
  const p = db
    .prepare("SELECT COUNT(*) as c FROM posts WHERE author_id = ? AND created_at >= datetime('now', '-1 day')")
    .get(userId) as { c: number };
  const c = db
    .prepare("SELECT COUNT(*) as c FROM comments WHERE author_id = ? AND created_at >= datetime('now', '-1 day')")
    .get(userId) as { c: number };
  return { postsToday: p.c, commentsToday: c.c };
}

export function adjustTrustScore(userId: string, delta: number, reason?: string) {
  const db = getDb();
  const profile = getProfileById(userId);
  if (!profile) return;
  const nextScore = Math.max(0, Math.min(100, profile.trust_score + delta));
  const nextTier: AccountTier = computeTier(nextScore);
  db.prepare('UPDATE profiles SET trust_score = ?, account_tier = ? WHERE id = ?').run(nextScore, nextTier, userId);

  if (nextTier !== profile.account_tier && reason) {
    db.prepare(
      `INSERT INTO notifications (id, user_id, type, title, reference_id) VALUES (?, ?, 'trust_update', ?, NULL)`
    ).run(crypto.randomUUID(), userId, reason);
  }
}

export interface PostQueryOptions {
  categorySlug?: string;
  mood?: string;
  tagSlug?: string;
  search?: string;
  sort?: 'newest' | 'unanswered' | 'most_supported' | 'same_here' | 'for_you' | 'daily_wins' | 'followed';
  followedCategories?: string[];
  followedTags?: string[];
  authorId?: string;
  bookmarkedBy?: string;
  currentUserId?: string | null;
  limit?: number;
}

export function getPosts(opts: PostQueryOptions = {}): Post[] {
  const db = getDb();
  // Süresi dolmuş geçici paylaşımları temizle
  db.prepare("DELETE FROM posts WHERE expires_at IS NOT NULL AND expires_at <= datetime('now')").run();

  const conditions: string[] = [
    "p.moderation_status = 'approved'",
    "(p.expires_at IS NULL OR p.expires_at > datetime('now'))",
  ];
  const params: (string | number)[] = [];

  if (opts.categorySlug && opts.categorySlug !== 'all') {
    conditions.push('c.slug = ?');
    params.push(opts.categorySlug);
  }
  if (opts.mood && opts.mood !== 'all') {
    conditions.push('p.mood = ?');
    params.push(opts.mood);
  }
  if (opts.authorId) {
    conditions.push('p.author_id = ?');
    params.push(opts.authorId);
  }
  if (opts.bookmarkedBy) {
    conditions.push('EXISTS (SELECT 1 FROM bookmarks b WHERE b.post_id = p.id AND b.user_id = ?)');
    params.push(opts.bookmarkedBy);
  }
  if (opts.tagSlug) {
    conditions.push(
      'EXISTS (SELECT 1 FROM post_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.post_id = p.id AND t.slug = ?)'
    );
    params.push(opts.tagSlug);
  }
  if (opts.search && opts.search.trim()) {
    const q = `%${opts.search.trim()}%`;
    conditions.push(
      '(p.title LIKE ? OR p.content LIKE ? OR EXISTS (SELECT 1 FROM post_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.post_id = p.id AND t.name LIKE ?))'
    );
    params.push(q, q, q);
  }

  if (opts.sort === 'daily_wins') {
    conditions.push("(p.is_daily_win = 1 OR p.mood = 'umutlu')");
  } else if (opts.sort === 'followed') {
    const fCats = (opts.followedCategories || []).filter(Boolean);
    const fTags = (opts.followedTags || []).filter(Boolean);
    if (fCats.length === 0 && fTags.length === 0) {
      return [];
    }
    const subParts: string[] = [];
    if (fCats.length > 0) {
      subParts.push(`c.slug IN (${fCats.map(() => '?').join(', ')})`);
      params.push(...fCats);
    }
    if (fTags.length > 0) {
      const placeholders = fTags.map(() => '?').join(', ');
      subParts.push(
        `EXISTS (SELECT 1 FROM post_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.post_id = p.id AND (t.slug IN (${placeholders}) OR t.name IN (${placeholders})))`
      );
      params.push(...fTags, ...fTags);
    }
    conditions.push(`(${subParts.join(' OR ')})`);
  }

  let orderBy = 'p.created_at DESC';
  if (opts.sort === 'daily_wins') {
    orderBy = 'p.is_daily_win DESC, p.created_at DESC';
  } else if (opts.sort === 'unanswered') {
    orderBy = 'CASE WHEN p.comment_count = 0 THEN 0 ELSE 1 END ASC, p.created_at DESC';
  } else if (opts.sort === 'most_supported') {
    orderBy = '(p.same_here_count + p.empathy_count + p.comment_count * 2) DESC, p.created_at DESC';
  } else if (opts.sort === 'same_here') {
    orderBy = 'p.same_here_count DESC, p.created_at DESC';
  } else if (opts.sort === 'for_you' && opts.currentUserId) {
    // Kullanıcının kendi gönderileri, "Ben de yaşıyorum" tepkileri ve yer işaretlerindeki ortak etiket/kategoriye göre kişiselleştirilmiş sıralama
    orderBy = `(
      (SELECT COUNT(*) FROM post_tags pt
       WHERE pt.post_id = p.id AND pt.tag_id IN (
         SELECT pt2.tag_id FROM post_tags pt2
         JOIN posts up ON up.id = pt2.post_id
         WHERE up.author_id = ?
         UNION
         SELECT pt3.tag_id FROM post_tags pt3
         JOIN reactions r ON r.target_type = 'post' AND r.target_id = pt3.post_id
         WHERE r.user_id = ? AND r.reaction_type = 'ayni_durumdayim'
       )) * 3
      + CASE WHEN p.category_id IN (
          SELECT category_id FROM posts WHERE author_id = ?
        ) THEN 2 ELSE 0 END
    ) DESC, p.same_here_count DESC, p.created_at DESC`;
    params.push(opts.currentUserId, opts.currentUserId, opts.currentUserId);
  }

  const limit = opts.limit ?? 30;
  params.push(limit);

  const sql = `
    SELECT
      p.*,
      pr.username as author_username,
      pr.avatar_seed as author_avatar_seed,
      pr.account_tier as author_tier,
      c.slug as category_slug,
      c.name as category_name
    FROM posts p
    JOIN profiles pr ON pr.id = p.author_id
    JOIN categories c ON c.id = p.category_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY ${orderBy}
    LIMIT ?
  `;

  const rows = db.prepare(sql).all(...params) as unknown as Omit<Post, 'tags' | 'user_reactions' | 'is_bookmarked'>[];
  return hydratePosts(db, rows, opts.currentUserId ?? null);
}

function hydratePosts(
  db: DatabaseSync,
  rows: Omit<Post, 'tags' | 'user_reactions' | 'is_bookmarked'>[],
  currentUserId: string | null
): Post[] {
  const getTagsStmt = db.prepare(`
    SELECT t.name FROM post_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.post_id = ?
  `);
  const getReactionsStmt = currentUserId
    ? db.prepare(`SELECT reaction_type FROM reactions WHERE user_id = ? AND target_type = 'post' AND target_id = ?`)
    : null;
  const getBookmarkStmt = currentUserId
    ? db.prepare(`SELECT 1 FROM bookmarks WHERE user_id = ? AND post_id = ?`)
    : null;
  const getPollOptsStmt = db.prepare(
    `SELECT id, label, vote_count FROM poll_options WHERE post_id = ? ORDER BY sort_order ASC`
  );
  const getPollVoteStmt = currentUserId
    ? db.prepare(`SELECT option_id FROM poll_votes WHERE post_id = ? AND user_id = ?`)
    : null;

  return rows.map((r) => {
    const tagRows = getTagsStmt.all(r.id) as { name: string }[];
    const userReactions = getReactionsStmt
      ? (getReactionsStmt.all(currentUserId!, r.id) as { reaction_type: ReactionType }[]).map((x) => x.reaction_type)
      : [];
    const isBookmarked = getBookmarkStmt ? Boolean(getBookmarkStmt.get(currentUserId!, r.id)) : false;

    let poll: PollData | null = null;
    if (r.poll_question) {
      const options = getPollOptsStmt.all(r.id) as unknown as PollOption[];
      if (options.length > 0) {
        const totalVotes = options.reduce((acc, o) => acc + o.vote_count, 0);
        const votedRow = getPollVoteStmt
          ? (getPollVoteStmt.get(r.id, currentUserId!) as { option_id: string } | undefined)
          : undefined;
        poll = {
          question: r.poll_question,
          options,
          total_votes: totalVotes,
          user_voted_option_id: votedRow?.option_id ?? null,
        };
      }
    }

    return {
      ...r,
      is_daily_win: Boolean((r as unknown as { is_daily_win?: number }).is_daily_win),
      poll,
      tags: tagRows.map((t) => t.name),
      user_reactions: userReactions,
      is_bookmarked: isBookmarked,
    };
  });
}

export function getPostById(id: string, currentUserId: string | null = null): Post | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT
        p.*,
        pr.username as author_username,
        pr.avatar_seed as author_avatar_seed,
        pr.account_tier as author_tier,
        c.slug as category_slug,
        c.name as category_name
      FROM posts p
      JOIN profiles pr ON pr.id = p.author_id
      JOIN categories c ON c.id = p.category_id
      WHERE p.id = ? AND p.moderation_status = 'approved'`
    )
    .get(id) as Omit<Post, 'tags' | 'user_reactions' | 'is_bookmarked'> | undefined;

  if (!row) return null;
  return hydratePosts(db, [row], currentUserId)[0];
}

export function getSimilarPosts(postId: string, limit = 4): Post[] {
  const db = getDb();
  const target = getPostById(postId);
  if (!target) return [];

  // Ortak etiket sayısı + aynı kategori + aynı ruh hali ağırlıklı benzer dertler
  const rows = db
    .prepare(
      `SELECT
        p.*,
        pr.username as author_username,
        pr.avatar_seed as author_avatar_seed,
        pr.account_tier as author_tier,
        c.slug as category_slug,
        c.name as category_name,
        (
          (SELECT COUNT(*) FROM post_tags pt1
           JOIN post_tags pt2 ON pt1.tag_id = pt2.tag_id
           WHERE pt1.post_id = p.id AND pt2.post_id = ?) * 3
          + CASE WHEN p.category_id = ? THEN 2 ELSE 0 END
          + CASE WHEN p.mood = ? THEN 1 ELSE 0 END
        ) as similarity_score
      FROM posts p
      JOIN profiles pr ON pr.id = p.author_id
      JOIN categories c ON c.id = p.category_id
      WHERE p.id != ? AND p.moderation_status = 'approved'
      ORDER BY similarity_score DESC, p.same_here_count DESC, p.created_at DESC
      LIMIT ?`
    )
    .all(postId, target.category_id, target.mood, postId, limit) as unknown as Omit<Post, 'tags' | 'user_reactions' | 'is_bookmarked'>[];

  return hydratePosts(db, rows, null);
}

export function createPostRecord(data: {
  authorId: string;
  categoryId: number;
  title: string;
  content: string;
  mood: Mood;
  replyMode: ReplyMode;
  tags: string[];
  moderationStatus: 'approved' | 'hidden';
  expiresInHours?: number | null;
  pollQuestion?: string | null;
  pollOptions?: string[];
  isDailyWin?: boolean;
}): Post {
  const db = getDb();
  const id = crypto.randomUUID();
  const expiresAtExpr =
    data.expiresInHours && data.expiresInHours > 0 ? `+${Number(data.expiresInHours)} hours` : null;
  const cleanPollQ =
    data.pollQuestion?.trim() && Array.isArray(data.pollOptions) && data.pollOptions.length >= 2
      ? data.pollQuestion.trim()
      : null;
  const dailyWinInt = data.isDailyWin ? 1 : 0;

  if (expiresAtExpr) {
    db.prepare(
      `INSERT INTO posts (id, author_id, category_id, title, content, mood, reply_mode, moderation_status, expires_at, poll_question, is_daily_win)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), ?, ?)`
    ).run(
      id,
      data.authorId,
      data.categoryId,
      data.title.trim(),
      data.content.trim(),
      data.mood,
      data.replyMode,
      data.moderationStatus,
      expiresAtExpr,
      cleanPollQ,
      dailyWinInt
    );
  } else {
    db.prepare(
      `INSERT INTO posts (id, author_id, category_id, title, content, mood, reply_mode, moderation_status, poll_question, is_daily_win)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      data.authorId,
      data.categoryId,
      data.title.trim(),
      data.content.trim(),
      data.mood,
      data.replyMode,
      data.moderationStatus,
      cleanPollQ,
      dailyWinInt
    );
  }

  if (cleanPollQ && data.pollOptions) {
    const insOpt = db.prepare(
      `INSERT INTO poll_options (id, post_id, label, vote_count, sort_order) VALUES (?, ?, ?, 0, ?)`
    );
    data.pollOptions
      .map((o) => o.trim())
      .filter((o) => o.length > 0)
      .slice(0, 4)
      .forEach((label, idx) => {
        insOpt.run(crypto.randomUUID(), id, label, idx);
      });
  }

  attachTagsToPost(db, id, data.tags);
  if (data.moderationStatus === 'approved') {
    adjustTrustScore(data.authorId, 1);
  }
  return getPostById(id, data.authorId) ?? ({
    id,
    author_id: data.authorId,
    author_username: '',
    author_avatar_seed: '',
    author_tier: 'new_observer',
    category_id: data.categoryId,
    category_slug: 'genel',
    category_name: 'Genel',
    title: data.title,
    content: data.content,
    mood: data.mood,
    reply_mode: data.replyMode,
    moderation_status: data.moderationStatus,
    same_here_count: 0,
    empathy_count: 0,
    comment_count: 0,
    tags: data.tags,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as Post);
}

export function getCommentsTree(postId: string, currentUserId: string | null = null): CommentNode[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT
        cm.*,
        pr.username as author_username,
        pr.avatar_seed as author_avatar_seed,
        pr.account_tier as author_tier
      FROM comments cm
      JOIN profiles pr ON pr.id = cm.author_id
      WHERE cm.post_id = ? AND cm.moderation_status = 'approved'
      ORDER BY cm.created_at ASC`
    )
    .all(postId) as unknown as Omit<CommentNode, 'replies' | 'user_reacted'>[];

  const userReactionsSet = new Set<string>();
  if (currentUserId) {
    const rRows = db
      .prepare("SELECT target_id FROM reactions WHERE user_id = ? AND target_type = 'comment'")
      .all(currentUserId) as { target_id: string }[];
    for (const r of rRows) userReactionsSet.add(r.target_id);
  }

  const map = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const row of rows) {
    map.set(row.id, {
      ...row,
      is_helpful: Boolean((row as unknown as { is_helpful?: number }).is_helpful),
      user_reacted: userReactionsSet.has(row.id),
      replies: [],
    });
  }

  for (const node of map.values()) {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  roots.sort((a, b) => Number(b.is_helpful) - Number(a.is_helpful));
  return roots;
}

export function createCommentRecord(data: {
  postId: string;
  authorId: string;
  parentId: string | null;
  content: string;
  moderationStatus: 'approved' | 'hidden';
}) {
  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO comments (id, post_id, author_id, parent_id, content, moderation_status)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, data.postId, data.authorId, data.parentId, data.content.trim(), data.moderationStatus);

  if (data.moderationStatus === 'approved') {
    db.prepare('UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?').run(data.postId);
    adjustTrustScore(data.authorId, 1);

    const post = db.prepare('SELECT author_id, title FROM posts WHERE id = ?').get(data.postId) as
      | { author_id: string; title: string }
      | undefined;

    if (post && post.author_id !== data.authorId) {
      db.prepare(
        `INSERT INTO notifications (id, user_id, type, title, reference_id) VALUES (?, ?, 'new_comment', ?, ?)`
      ).run(crypto.randomUUID(), post.author_id, `"${post.title.slice(0, 40)}..." paylaşımına yeni bir destek yorumu geldi.`, data.postId);
    }

    if (data.parentId) {
      const parentComment = db.prepare('SELECT author_id FROM comments WHERE id = ?').get(data.parentId) as
        | { author_id: string }
        | undefined;
      if (parentComment && parentComment.author_id !== data.authorId) {
        db.prepare(
          `INSERT INTO notifications (id, user_id, type, title, reference_id) VALUES (?, ?, 'comment_reply', ?, ?)`
        ).run(crypto.randomUUID(), parentComment.author_id, `Birisi yorumuna yanıt verdi.`, data.postId);
      }
    }
  }

  return id;
}

export function toggleReactionRecord(data: {
  userId: string;
  targetType: 'post' | 'comment';
  targetId: string;
  reactionType: ReactionType;
}): { active: boolean } {
  const db = getDb();
  const existing = db
    .prepare(
      'SELECT id FROM reactions WHERE user_id = ? AND target_type = ? AND target_id = ? AND reaction_type = ?'
    )
    .get(data.userId, data.targetType, data.targetId, data.reactionType) as { id: string } | undefined;

  if (existing) {
    db.prepare('DELETE FROM reactions WHERE id = ?').run(existing.id);
    if (data.targetType === 'post') {
      const col = data.reactionType === 'ayni_durumdayim' ? 'same_here_count' : 'empathy_count';
      db.prepare(`UPDATE posts SET ${col} = MAX(0, ${col} - 1) WHERE id = ?`).run(data.targetId);
    } else {
      db.prepare('UPDATE comments SET empathy_count = MAX(0, empathy_count - 1) WHERE id = ?').run(data.targetId);
    }
    return { active: false };
  }

  db.prepare(
    'INSERT INTO reactions (id, user_id, target_type, target_id, reaction_type) VALUES (?, ?, ?, ?, ?)'
  ).run(crypto.randomUUID(), data.userId, data.targetType, data.targetId, data.reactionType);

  if (data.targetType === 'post') {
    const col = data.reactionType === 'ayni_durumdayim' ? 'same_here_count' : 'empathy_count';
    db.prepare(`UPDATE posts SET ${col} = ${col} + 1 WHERE id = ?`).run(data.targetId);

    const post = db.prepare('SELECT author_id, title FROM posts WHERE id = ?').get(data.targetId) as
      | { author_id: string; title: string }
      | undefined;
    if (post && post.author_id !== data.userId) {
      const notifType = data.reactionType === 'ayni_durumdayim' ? 'same_here' : 'empathy_reaction';
      const msg =
        data.reactionType === 'ayni_durumdayim'
          ? `Birisi "${post.title.slice(0, 36)}..." paylaşımın için "Ben de aynı şeyi yaşıyorum" dedi.`
          : `Paylaşımın bir kişiden empati desteği aldı.`;
      db.prepare(
        `INSERT INTO notifications (id, user_id, type, title, reference_id) VALUES (?, ?, ?, ?, ?)`
      ).run(crypto.randomUUID(), post.author_id, notifType, msg, data.targetId);
      adjustTrustScore(post.author_id, 1);
    }
  } else {
    db.prepare('UPDATE comments SET empathy_count = empathy_count + 1 WHERE id = ?').run(data.targetId);
  }

  return { active: true };
}

export function getTopTags(limit = 14): Tag[] {
  const db = getDb();
  return db
    .prepare('SELECT id, slug, name, usage_count FROM tags ORDER BY usage_count DESC, id ASC LIMIT ?')
    .all(limit) as unknown as Tag[];
}

export function getGroupedTagsByCategory(): GroupedTags[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT
        c.slug as category_slug,
        c.name as category_name,
        t.id as tag_id,
        t.slug as tag_slug,
        t.name as tag_name,
        COUNT(*) as cat_usage_count
      FROM post_tags pt
      JOIN posts p ON p.id = pt.post_id
      JOIN categories c ON c.id = p.category_id
      JOIN tags t ON t.id = pt.tag_id
      WHERE p.moderation_status = 'approved'
      GROUP BY c.id, t.id
      ORDER BY c.id ASC, cat_usage_count DESC, t.name ASC`
    )
    .all() as Array<{
    category_slug: string;
    category_name: string;
    tag_id: number;
    tag_slug: string;
    tag_name: string;
    cat_usage_count: number;
  }>;

  const grouped = new Map<string, GroupedTags>();
  for (const r of rows) {
    if (!grouped.has(r.category_slug)) {
      grouped.set(r.category_slug, {
        category_slug: r.category_slug,
        category_name: r.category_name,
        tags: [],
      });
    }
    grouped.get(r.category_slug)!.tags.push({
      id: r.tag_id,
      slug: r.tag_slug,
      name: r.tag_name,
      usage_count: r.cat_usage_count,
    });
  }
  return Array.from(grouped.values());
}

export function getNotificationsForUser(userId: string): NotificationItem[] {
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 25')
    .all(userId) as (Omit<NotificationItem, 'is_read'> & { is_read: number })[];
  return rows.map((r) => ({ ...r, is_read: Boolean(r.is_read) }));
}

export function markAllNotificationsRead(userId: string) {
  const db = getDb();
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
}

export function createReportRecord(data: {
  reporterId: string;
  targetType: 'post' | 'comment';
  targetId: string;
  reason: string;
}) {
  const db = getDb();
  db.prepare(
    'INSERT INTO reports (id, reporter_id, target_type, target_id, reason) VALUES (?, ?, ?, ?, ?)'
  ).run(crypto.randomUUID(), data.reporterId, data.targetType, data.targetId, data.reason.trim());

  // Hedef yazarın güven skorunu hafifçe düşür (3+ raporda gizle)
  const reportCount = db
    .prepare('SELECT COUNT(*) as c FROM reports WHERE target_type = ? AND target_id = ?')
    .get(data.targetType, data.targetId) as { c: number };

  if (data.targetType === 'post') {
    const post = db.prepare('SELECT author_id FROM posts WHERE id = ?').get(data.targetId) as { author_id: string } | undefined;
    if (post) adjustTrustScore(post.author_id, -5);
    if (reportCount.c >= 3) {
      db.prepare("UPDATE posts SET moderation_status = 'hidden' WHERE id = ?").run(data.targetId);
    }
  } else {
    const comment = db.prepare('SELECT author_id FROM comments WHERE id = ?').get(data.targetId) as { author_id: string } | undefined;
    if (comment) adjustTrustScore(comment.author_id, -5);
    if (reportCount.c >= 3) {
      db.prepare("UPDATE comments SET moderation_status = 'hidden' WHERE id = ?").run(data.targetId);
    }
  }
}

export function logModerationEvent(data: {
  targetType: string;
  targetId: string | null;
  layer: 'L1_LOCAL' | 'L2_GEMINI';
  riskScore: number;
  flags: string[];
  actionTaken: string;
}) {
  const db = getDb();
  db.prepare(
    `INSERT INTO moderation_logs (id, target_type, target_id, layer, risk_score, flags, action_taken)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    crypto.randomUUID(),
    data.targetType,
    data.targetId,
    data.layer,
    data.riskScore,
    JSON.stringify(data.flags),
    data.actionTaken
  );
}

export function updatePostRecord(data: {
  postId: string;
  authorId: string;
  title: string;
  content: string;
  replyMode: ReplyMode;
}): Post | null {
  const db = getDb();
  const existing = db.prepare('SELECT author_id FROM posts WHERE id = ?').get(data.postId) as
    | { author_id: string }
    | undefined;
  if (!existing || existing.author_id !== data.authorId) return null;

  db.prepare(
    `UPDATE posts SET title = ?, content = ?, reply_mode = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(data.title.trim(), data.content.trim(), data.replyMode, data.postId);

  return getPostById(data.postId, data.authorId);
}

export function deletePostRecord(postId: string, authorId: string): boolean {
  const db = getDb();
  const res = db.prepare('DELETE FROM posts WHERE id = ? AND author_id = ?').run(postId, authorId);
  return Number(res.changes) > 0;
}

export function toggleBookmarkRecord(userId: string, postId: string): { bookmarked: boolean } {
  const db = getDb();
  const exists = db
    .prepare('SELECT 1 FROM bookmarks WHERE user_id = ? AND post_id = ?')
    .get(userId, postId);
  if (exists) {
    db.prepare('DELETE FROM bookmarks WHERE user_id = ? AND post_id = ?').run(userId, postId);
    return { bookmarked: false };
  }
  db.prepare('INSERT INTO bookmarks (user_id, post_id) VALUES (?, ?)').run(userId, postId);
  return { bookmarked: true };
}

export function getModerationDashboardData(): {
  reports: ReportItem[];
  logs: ModerationLogItem[];
} {
  const db = getDb();
  const rawReports = db
    .prepare(
      `SELECT r.*, pr.username as reporter_username
       FROM reports r
       JOIN profiles pr ON pr.id = r.reporter_id
       ORDER BY CASE WHEN r.status = 'open' THEN 0 ELSE 1 END ASC, r.created_at DESC
       LIMIT 40`
    )
    .all() as Array<{
    id: string;
    reporter_username: string;
    target_type: 'post' | 'comment';
    target_id: string;
    reason: string;
    status: 'open' | 'reviewed' | 'dismissed';
    created_at: string;
  }>;

  const reports: ReportItem[] = rawReports.map((r) => {
    if (r.target_type === 'post') {
      const p = db.prepare('SELECT title, moderation_status FROM posts WHERE id = ?').get(r.target_id) as
        | { title: string; moderation_status: string }
        | undefined;
      return {
        ...r,
        target_preview: p ? p.title : '(Silinmiş gönderi)',
        target_status: p ? p.moderation_status : 'deleted',
      };
    }
    const c = db.prepare('SELECT content, moderation_status FROM comments WHERE id = ?').get(r.target_id) as
      | { content: string; moderation_status: string }
      | undefined;
    return {
      ...r,
      target_preview: c ? c.content.slice(0, 100) : '(Silinmiş yorum)',
      target_status: c ? c.moderation_status : 'deleted',
    };
  });

  const rawLogs = db
    .prepare('SELECT * FROM moderation_logs ORDER BY created_at DESC LIMIT 40')
    .all() as Array<Omit<ModerationLogItem, 'flags'> & { flags: string }>;

  const logs: ModerationLogItem[] = rawLogs.map((l) => {
    let parsedFlags: string[] = [];
    try {
      parsedFlags = JSON.parse(l.flags);
    } catch {
      parsedFlags = [];
    }
    return { ...l, flags: parsedFlags };
  });

  return { reports, logs };
}

export function resolveReportAction(
  reportId: string,
  action: 'dismiss_report' | 'hide_target' | 'restore_target'
): boolean {
  const db = getDb();
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId) as
    | { id: string; target_type: 'post' | 'comment'; target_id: string }
    | undefined;
  if (!report) return false;

  if (action === 'dismiss_report') {
    db.prepare("UPDATE reports SET status = 'dismissed' WHERE id = ?").run(reportId);
    return true;
  }

  const nextStatus = action === 'hide_target' ? 'hidden' : 'approved';
  if (report.target_type === 'post') {
    db.prepare('UPDATE posts SET moderation_status = ? WHERE id = ?').run(nextStatus, report.target_id);
  } else {
    db.prepare('UPDATE comments SET moderation_status = ? WHERE id = ?').run(nextStatus, report.target_id);
  }
  db.prepare("UPDATE reports SET status = 'reviewed' WHERE id = ?").run(reportId);
  return true;
}

export function addPostStoryUpdate(postId: string, authorId: string, updateText: string): Post | null {
  const db = getDb();
  const post = db.prepare('SELECT author_id FROM posts WHERE id = ?').get(postId) as
    | { author_id: string }
    | undefined;
  if (!post || post.author_id !== authorId) return null;

  db.prepare(
    `UPDATE posts SET update_text = ?, updated_story_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
  ).run(updateText.trim(), postId);

  return getPostById(postId, authorId);
}

export function votePollOption(userId: string, postId: string, optionId: string): boolean {
  const db = getDb();
  const opt = db
    .prepare('SELECT id FROM poll_options WHERE id = ? AND post_id = ?')
    .get(optionId, postId) as { id: string } | undefined;
  if (!opt) return false;

  const prev = db
    .prepare('SELECT option_id FROM poll_votes WHERE post_id = ? AND user_id = ?')
    .get(postId, userId) as { option_id: string } | undefined;

  if (prev) {
    if (prev.option_id === optionId) return true;
    db.prepare('UPDATE poll_options SET vote_count = MAX(0, vote_count - 1) WHERE id = ?').run(prev.option_id);
    db.prepare('UPDATE poll_votes SET option_id = ? WHERE post_id = ? AND user_id = ?').run(optionId, postId, userId);
    db.prepare('UPDATE poll_options SET vote_count = vote_count + 1 WHERE id = ?').run(optionId);
    return true;
  }

  db.prepare('INSERT INTO poll_votes (post_id, user_id, option_id) VALUES (?, ?, ?)').run(postId, userId, optionId);
  db.prepare('UPDATE poll_options SET vote_count = vote_count + 1 WHERE id = ?').run(optionId);
  return true;
}

export function toggleCommentHelpful(commentId: string, postAuthorId: string): { isHelpful: boolean } | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT cm.id, cm.author_id as comment_author_id, cm.is_helpful, p.id as post_id, p.author_id as post_author_id
       FROM comments cm
       JOIN posts p ON p.id = cm.post_id
       WHERE cm.id = ?`
    )
    .get(commentId) as
    | {
        id: string;
        comment_author_id: string;
        is_helpful: number;
        post_id: string;
        post_author_id: string;
      }
    | undefined;

  if (!row || row.post_author_id !== postAuthorId) return null;

  const next = row.is_helpful ? 0 : 1;
  db.prepare('UPDATE comments SET is_helpful = ? WHERE id = ?').run(next, commentId);

  if (next === 1 && row.comment_author_id !== postAuthorId) {
    adjustTrustScore(
      row.comment_author_id,
      5,
      'Bir paylaşım sahibi yorumunu "Bana İyi Geldi" olarak seçti! (+5 Güven Skoru)'
    );
    db.prepare(
      `INSERT INTO notifications (id, user_id, type, title, reference_id)
       VALUES (?, ?, 'empathy_reaction', 'Paylaşım sahibi yorumunu "Bana İyi Geldi" olarak işaretledi!', ?)`
    ).run(crypto.randomUUID(), row.comment_author_id, row.post_id);
  }

  return { isHelpful: Boolean(next) };
}

export function hideCommentByPostAuthor(commentId: string, postAuthorId: string): boolean {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT cm.id, p.id as post_id, p.author_id as post_author_id
       FROM comments cm
       JOIN posts p ON p.id = cm.post_id
       WHERE cm.id = ?`
    )
    .get(commentId) as { id: string; post_id: string; post_author_id: string } | undefined;

  if (!row || row.post_author_id !== postAuthorId) return false;

  db.prepare("UPDATE comments SET moderation_status = 'hidden' WHERE id = ?").run(commentId);
  db.prepare('UPDATE posts SET comment_count = MAX(0, comment_count - 1) WHERE id = ?').run(row.post_id);
  return true;
}

export function getUserFollowedTopics(userId: string): { categories: string[]; tags: string[] } {
  const db = getDb();
  const rows = db
    .prepare('SELECT target_type, target_slug FROM topic_follows WHERE user_id = ? ORDER BY created_at ASC')
    .all(userId) as Array<{ target_type: string; target_slug: string }>;
  const categories: string[] = [];
  const tags: string[] = [];
  for (const r of rows) {
    if (r.target_type === 'category') categories.push(r.target_slug);
    else if (r.target_type === 'tag') tags.push(r.target_slug);
  }
  return { categories, tags };
}

export function toggleUserFollowTopic(
  userId: string,
  targetType: 'category' | 'tag',
  targetSlug: string
): { followed: boolean; categories: string[]; tags: string[] } {
  const db = getDb();
  const slug = targetSlug.trim().toLowerCase();
  const existing = db
    .prepare('SELECT 1 FROM topic_follows WHERE user_id = ? AND target_type = ? AND target_slug = ?')
    .get(userId, targetType, slug);

  if (existing) {
    db.prepare('DELETE FROM topic_follows WHERE user_id = ? AND target_type = ? AND target_slug = ?').run(
      userId,
      targetType,
      slug
    );
  } else {
    db.prepare('INSERT INTO topic_follows (user_id, target_type, target_slug) VALUES (?, ?, ?)').run(
      userId,
      targetType,
      slug
    );
  }

  const current = getUserFollowedTopics(userId);
  return { followed: !existing, ...current };
}
