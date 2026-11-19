# unfold — A Safe Space to Be Understood Without Judgment

> [!IMPORTANT]
> **Prototype / Sample Project Notice:**
> This project is a **sample web application (prototype / demo project)** built to showcase concepts in **anonymous peer support**, **content safety (PII & crisis filtering)**, and **empathy-driven community design**.
> The platform does not provide medical, psychiatric, or professional psychological counseling; it includes a sample safety architecture that directs users in crisis directly to official emergency helplines (`112` and `ALO 183`).

---

## 1. Project Purpose & Vision

Traditional social media platforms are built around identity, follower counts, and like competition, making it difficult for people to open up about real struggles (workplace mobbing, exam anxiety, breakups, burnout, family pressure, or loneliness).

**unfold** is a sample community platform designed with the vision of *"an anonymous peer-support space where people going through similar challenges can easily find one another without judgment"*:
- **Anonymous Yet Safe:** Users participate with auto-generated anonymous aliases (e.g., `GeceYolcusu19`, `SessizMartı42`) and deterministic SVG avatars instead of real names.
- **Empathy Over Competition:** Replaces traditional "Likes" with **"I'm going through this too"**, **"I'm here for you"**, and **"I hear you"** reactions.
- **Celebrating Small Steps:** Features a dedicated **🌱 Daily Wins Garden** (`Küçük Zaferler Bahçesi`) where small personal victories during recovery are celebrated alongside struggles.

---

## 2. Key Features

### A. Empathy & Experience-Driven Feed Architecture
- **Multiple Feed Modes:**
  - `New`: Latest posts
  - `🌱 Daily Wins`: A celebration and hope wall with a completely distinct visual atmosphere
  - `★ Following`: Personalized feed built from topics and `#tags` starred by the user
  - `For You`: Recommendation feed weighted by the user's past empathy reactions
  - `Same Situation`, `Awaiting Replies`, and `Most Supported`
- **Smart Similarity Matching (TF-IDF + Cosine Similarity):**
  - On each post detail page, posts from other users experiencing similar situations are automatically matched and listed based on shared tags and text similarity.

### B. 🌱 Daily Wins Garden (`DailyWinsView`)
A dedicated emerald-and-amber interface separate from the standard venting feed:
- **Community Hope Counter:** Displays stats for sprouting wins, total celebrations, and inspired members.
- **Your Small Steps Today:** An interactive checklist where users can mark daily self-care steps (e.g., *"Drank a glass of water"*, *"Paused self-criticism for 5 min"*), fill their progress bar, and share with one click.
- **One-Click Win Inspiration Templates:** Ready-made starter cards for setting boundaries, focus, and emotional recovery.
- **Win Wall Reactions:** Dedicated *"👏 Proud of You"*, *"🌱 Gave Me Hope"*, and *"💚 Warmly Celebrating"* reactions.

### C. Psychological Comfort & Interaction Tools
- **4-7-8 Live Breathing Break (`BreathingWidget`):** Animated calming exercise in the right sidebar with a second-by-second countdown (`4s Inhale` → `7s Hold` → `8s Exhale`).
- **"What Happened Next?" Story Updates:** Time-stamped update block allowing authors to add follow-up outcomes to their original post days later.
- **Anonymous Decision Polls (`PollBlock`):** Community poll system for users facing dilemmas (*"What would you do in my shoes?"*).
- **Ephemeral Posts (24 Hours / 7 Days):** Timed posting mode that automatically removes posts from the feed upon expiration.
- **Shareable Story Card (`ShareCardModal`):** Exports posts as high-resolution (`1080×1080`) anonymous visual cards in PNG format using HTML5 Canvas.

### D. 3-Layer Safety, Crisis Shield & Self-Moderation
1. **Layer 1 — Instant Local Filter (`local-filter.ts`):**
   - **Personal Data (PII) Protection:** Automatically detects and blocks phone numbers (including spaced/obfuscated formats), email addresses, and social media handles.
   - **Bullying & Profanity Blocking:** Filters abusive language and character-substituted insults.
   - **Crisis & Self-Harm Shield:** Stops posts containing crisis or self-harm signals before publication and immediately opens an emergency support modal (`CrisisModal`) with `112 Emergency` and `ALO 183`.
2. **Layer 2 — Empathetic Comment Pre-Warning & Author Self-Moderation:**
   - Detects judgmental phrases while drafting comments and shows a gentle empathy reminder before submission.
   - Authors can switch posts to **"Empathy Only (Comments Disabled)"** in one click, highlight helpful replies with **"✨ This Helped Me"**, or hide comments on their own posts.
3. **Layer 3 — Admin-Protected Moderation Panel (`/moderation`):**
   - Report review and moderation log dashboard accessible only to admin accounts (`is_admin` / `MODERATION_SECRET`).

---

## 3. Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | Next.js 15 (App Router) + React 19 | Server & client components, API Route Handlers |
| **Language** | TypeScript | End-to-end type safety |
| **Styling & UI** | Tailwind CSS + Lucide Icons | Dark-mode empathetic UI and micro-animations |
| **Database** | Built-in SQLite (`node:sqlite` WAL mode) | Zero external service cost local relational DB (plus optional Supabase PostgreSQL schema `supabase/schema.sql`) |
| **Authentication** | HMAC-SHA256 signed HTTP-Only Cookie + Scrypt | Email/OTP verification, password reset, and one-click anonymous demo session |
| **Deployment** | Docker + Render Blueprint (`render.yaml`) + PWA | Installable Web App Manifest and container support |

---

## 4. Project Structure

```text
unfold/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/route.ts          # Registration, OTP verification, login, demo account, alias updates
│   │   │   ├── posts/route.ts         # Feed listing, filtering, post creation
│   │   │   ├── posts/[id]/route.ts    # Post detail, edit, delete, "What Happened Next?" update
│   │   │   ├── comments/route.ts      # Add comments, "This Helped Me" badge, author hide
│   │   │   ├── reactions/route.ts     # Empathy reactions
│   │   │   ├── polls/route.ts         # Anonymous decision poll voting
│   │   │   ├── follows/route.ts       # Follow topics and tags
│   │   │   ├── bookmarks/route.ts     # Bookmark posts
│   │   │   ├── notifications/route.ts # List notifications & mark as read
│   │   │   ├── reports/route.ts       # Community report submissions
│   │   │   ├── moderation/route.ts    # Admin auth & report/log management
│   │   │   └── health/route.ts        # Server health check (/api/health)
│   │   ├── post/[id]/page.tsx         # Post detail, comment tree & similar posts page
│   │   ├── profile/page.tsx           # Anonymous profile, trust score, impact summary & daily wins
│   │   ├── moderation/page.tsx        # Admin moderation & safety dashboard
│   │   ├── manifest.ts                # PWA web app manifest
│   │   ├── icon.svg                   # Shared Orbit vector logo
│   │   └── page.tsx                   # Main feed & Daily Wins switcher
│   ├── components/
│   │   ├── DailyWinsView.tsx          # Daily Wins Garden UI & daily step tracker
│   │   ├── Navbar.tsx                 # Top navigation, notifications & safe sign-out confirmation
│   │   ├── PostCard.tsx               # Post card component
│   │   ├── PostComposerModal.tsx      # Vent / Daily Win composer modal
│   │   ├── BreathingWidget.tsx        # 4-7-8 live countdown breathing widget
│   │   ├── PollBlock.tsx              # Anonymous poll component
│   │   ├── ShareCardModal.tsx         # PNG story card generator
│   │   ├── CrisisModal.tsx            # 112 & ALO 183 emergency support modal
│   │   ├── AuthModal.tsx              # Sign-up, login & instant OTP verification modal
│   │   ├── Footer.tsx                 # Legal notices, community guidelines & disclaimer
│   │   └── Avatar.tsx                 # Deterministic anonymous SVG avatar generator
│   └── lib/
│       ├── db.ts                      # SQLite schema, seed data & queries
│       ├── auth.ts                    # Session, hashing & OTP helpers
│       ├── constants.ts               # Categories, moods & trust tiers
│       ├── rate-limit.ts              # Flood & rate-limit protection
│       └── moderation/
│           ├── local-filter.ts        # PII, profanity, crisis & TF-IDF similarity engine
│           └── ai-analyzer.ts         # Optional Gemini AI moderation integration
├── Dockerfile                         # Production Docker image
├── render.yaml                        # One-click free Render.com deployment blueprint
└── .env.example                       # Example environment variables
```

---

## 5. Local Setup & Running

### Prerequisites
- **Node.js 22+** (for the built-in `node:sqlite` module)

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Run unit tests
npm test

# 3. Create production build
npm run build

# 4. Start the server (Default: http://localhost:3000)
npm start
```

On first launch, `.data/unfold.db` SQLite database and sample seed posts are created automatically—no paid API keys required.

### Admin Panel Access
- Navigate to `http://localhost:3000/moderation` in your browser.
- After signing in, enter the default admin key `unfold-admin-2026` (or your `MODERATION_SECRET` value from `.env`) to grant **Admin** permissions to your account.

---

## 6. Free Cloud Deployment (Render / Docker)

You can deploy the project to the cloud for free using the included `Dockerfile` and `render.yaml`:

1. Sign in with GitHub on the [Render Blueprint Deploy Page](https://render.com/deploy?repo=https://github.com/erenbektas777/unfold).
2. Confirm the service name (`unfold`) and click **Apply**.

---

## 7. Legal Notice & Disclaimer

This software is presented as a **sample portfolio / concept project**. All initial seed data is fictional. In situations requiring urgent psychological or medical assistance, please contact **112 Emergency** or **ALO 183 Social Support Line**.
