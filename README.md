# Qweezy — Club Doubles Tennis Predictions

A phone-friendly web app where you act as "the house": you set a game
spread on upcoming doubles matches, members bet play-money points against
that spread, and results settle automatically once you enter the final
score. No cash value — points only.

## How it works

- **Roster**: Only you (admin) can add players — one at a time by name +
  email, or in bulk via **Players → Import players** (upload an Excel/CSV
  export, or paste a Name/Email range copied straight out of Google
  Sheets). Everyone starts with **1,000 points**.
- **Drafts and publishing**: Only you (admin) can log a match. It starts as a
  **draft** that nobody else can see. While it's a draft you can change the
  teams, the cutoff time and the line, or delete it. When you're happy, hit
  **Publish** — that opens betting and locks the match (its teams and line can
  no longer change, because people are betting against them). If a published
  match has to be scrapped, **Cancel match & refund bets** returns every
  pending stake and removes it.
- **Ratings and suggested lines**: Each player can carry an individual
  (USTA/NTRP) rating, shown next to their name for everyone, plus a doubles
  rating, team # and 1-30 team ranking that only you can see. When you draft a
  match the app suggests a line from the two teams' combined doubles ratings
  (`scale × gap^exponent`, rounded to 0.5 — default 9.5 × gap^0.72; tune it on
  the Players page). You confirm or change it before publishing.
- **Spreads**: expressed relative to Team A in points, in steps of 0.5 starting
  at 0 (0 = even). In the draft panel you pick the favorite and the size, e.g.
  "Team B favored by 4" is stored as Team A `+4`. A game is 1 point, a 1st/2nd
  set tiebreaker 1.5, a 3rd-set match tiebreaker 2.5.
- **Players page**: admin-only (roster, emails, balances, ratings, roster
  import). Other users just see names and individual ratings on matches.
- **Betting**: Members bet points on Team A or Team B against the spread.
  Betting closes automatically once the match's cutoff time passes, even
  if you haven't clicked **Lock betting** yet — that button is still there
  for closing it early.
- **Max bet**: dynamic — a player's max bet on any one open match is their
  current balance divided by however many matches are currently open for
  betting. (1,000 balance ÷ 5 open matches = 200 max; ÷ 4 = 250 max, etc.)
  This recalculates live as matches open and close.
- **Scoring the spread**: you enter the final score set by set. Each set
  counts its real game differential, **except**:
  - A set decided by a standard tiebreak (1st or 2nd set, e.g. 7-6) always
    counts as **1.5 games** for whichever team won it.
  - A 3rd-set match tiebreak ("super tiebreak," e.g. first to 10) always
    counts as **2.5 games** for whichever team won it.
  The match margin is the sum of each set's value. A bet on Team A wins if
  `margin + line > 0`, loses if `< 0`, and **pushes** (points returned,
  nobody wins or loses) if exactly `0`. Team B is the mirror image.
- **Payouts**: even money — win a bet and you net +stake, lose and you net
  -stake, push returns your stake untouched.
- **Stats**: every player has a profile with bet record (W-L-Push), net
  points from betting, and match participation/wins. There's a
  club-wide leaderboard on the home page.
- **Sign-in**: passwordless magic-link email — no passwords to manage.

## Tech stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- PostgreSQL via Prisma ORM
- NextAuth (email/magic-link provider) for auth
- Resend for sending the sign-in emails
- Deploys cleanly to Vercel

## Setting it up

### 1. Install dependencies

```bash
npm install
```

(This downloads Prisma's engine binaries from the network — if you're
behind a restrictive firewall, run this step somewhere with normal
internet access, e.g. your own machine or inside Vercel's build.)

### 2. Create a Postgres database

Easiest path: in your Vercel dashboard, go to **Storage → Create Database
→ Postgres** (Vercel's own, or the Neon/Supabase marketplace integrations
all work identically). Copy the connection string it gives you.

### 3. Set up Resend (for magic-link emails)

1. Create a free account at [resend.com](https://resend.com).
2. Verify a sending domain (or use their shared test domain while you try
   it out).
3. Grab an API key.

### 4. Configure environment variables

Copy `.env.example` to `.env` locally (and add the same values in Vercel
under **Settings → Environment Variables** for the deployed app):

- `DATABASE_URL` — your Postgres connection string
- `NEXTAUTH_URL` — `http://localhost:3000` locally, your real domain in prod
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
- `RESEND_API_KEY` — from step 3
- `EMAIL_FROM` — e.g. `Qweezy <qweezy@yourclubdomain.com>`
- `ADMIN_EMAIL` / `ADMIN_NAME` — your own info, used only by the seed script

### 5. Push the schema and seed yourself as admin

```bash
npm run db:push
npm run db:seed
```

This creates all the tables and marks you (`ADMIN_EMAIL`) as an admin with
1,000 points, so you can immediately set spreads, lock betting, and enter
results once you sign in.

### 6. Run it

```bash
npm run dev
```

Visit `http://localhost:3000`, sign in with your admin email, and:

1. Go to **Players** and add your regular group by name + email.
2. Go to **Matches → Log a match**, pick the two doubles teams.
3. Open the match and set the spread — betting opens immediately.
4. Members sign in (magic link) and place their bets.
5. Right before the match, hit **Lock betting**.
6. After the match, enter the final score — bets settle and balances
   update automatically.

### Deploying to Vercel

Push this project to a GitHub repo and import it in Vercel (or use the
Vercel CLI: `vercel`). Add the environment variables from step 4 in the
Vercel project settings, then deploy. Run `npm run db:push` and
`npm run db:seed` once against the production `DATABASE_URL` (locally,
pointed at the prod database, or via `vercel env pull` + the same
commands) to set up the schema and your admin account there too.

## Notes / things you may want to adjust later

- Invite flow is currently: you add a player's name + email under
  **Players**, then they sign in with that same email whenever they're
  ready — no separate "accept invite" step needed.
- One bet per player per match is enforced. If you want to allow players
  to change or add to a bet before lock, that's a small addition to the
  bets API.
- The spread input takes any 0.5 increment, so you can quote lines like
  `-4.5` to avoid pushes if you'd rather never have a push outcome.
