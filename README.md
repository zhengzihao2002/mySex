# mySex 🔥

A private, **18+**, invite-only sex & cycle tracker for one couple, built to live on your iPhone home screen.

- **Live sex timer**: start the clock and it keeps running if you quit the app, lock the phone or open it on your partner's phone. The start time and any pauses are stored in the database, and elapsed time is always `now − start − paused`. Pause for round two, keep the screen awake, or use discreet mode, which dims the screen to black.
- **mySex Score (0–100)** for every session: stamina (duration, up to 40 pts), her and his orgasms (28), your 🔥 heat rating (15), variety (8) and an adventure bonus (9). It's computed on the fly, so changing the formula re-scores all your history.
- **Where you did it**: each session records the IP address and the Vercel geo headers (city, region, country, lat/long), with an optional precise GPS pin and Apple Maps links.
- **Interactive calendar**: period days, predicted periods, cycle phases, fertile window, ovulation and every session. Tap any day to log sex in the past, record when a period starts or ends, or check in.
- **Cycle predictions**: learns from her real cycles (a weighted average of the last 6, ignoring outliers) and forecasts the next 12 periods with a ± window. It also shows ovulation, the fertile window, PMS days and pregnancy risk for each day. These are estimates, not birth control.
- **Phase guide**: hormones, libido and tips for her and for him in each phase. It also charts sex by phase and her horniness by phase.
- **Insights**: monthly, weekday and time-of-day charts, an orgasm scoreboard, protection breakdown, go-to moves, places, 21 achievements and full history.
- **Daily check-ins**: mood, horniness, energy, flow and symptoms for both partners. An **"I'm in the mood"** button pings your partner.
- **Dirty notes**: love notes, "tonight I want…" wishes and teases.
- **Play**: sex dice, a dare deck, and a private **Yes / No / Maybe** list. Only mutual matches are ever revealed; your partner never sees your answers.
- **Privacy**: an optional 4-digit passcode lock on each device, JSON export, and unpair. Re-pairing the same two people restores your history.
- **Mutual session deletion**: deleting a shared intercourse/oral record, including discarding a live timer, sends a request to the partner’s **Inbox**. Nothing is removed until the other partner explicitly agrees. Declining keeps the record and gives the requester an unread inbox notification; approvals and outdated requests also generate notifications. Requests can be withdrawn. Edits, pauses, or finishing a session invalidate the requested version, so it cannot be deleted using old consent. Unpairing preserves active records as well as completed history. Periods, check-ins, notes, and private preferences keep their existing controls.
- **Orgasm counts**: both partners can record 0–20 orgasms. Orgasm and ejaculation are distinct, and either partner may have multiple orgasms; one is not a biological maximum for men. Existing counts and scoring are preserved.
- **No uploads**: everything is short text and numbers, sized for Neon's free tier. There's no background polling; the app refreshes when it comes back to the foreground, so Neon compute can scale to zero.

## Access control

- **Invite-only sign-up.** Creating an account requires the access code (`SIGNUP_ACCESS_CODE`, which defaults to `zzh_zj_99`). The check happens on the server. The raw `/api/auth/sign-up/*` endpoints are blocked, and an account created any other way can't get a profile.
- **18+ consent.** Sign-up needs two checkboxes: confirming you are 18 or older, and consenting to explicit content. Both are enforced on the server and timestamped in `profiles.adult_consent_at`.
- **Pairing.** Each user picks a sex during onboarding and gets a random 6-character invite code. Pairing only works between a him and a her, and only one of you needs to enter the other's code.

## Stack

Next.js 16 (App Router, server actions) · React 19 · Tailwind CSS 4 · **Neon Auth** (`@neondatabase/auth`) · **Neon Postgres** (`@neondatabase/serverless` HTTP driver).

## Deploy (GitHub → Vercel)

1. **Neon**: create a project, then open **Auth** and enable Neon Auth with email and password. Under the Auth settings, add your Vercel domain (e.g. `https://mysex.vercel.app`) to the trusted domains.
2. **Vercel**: import this GitHub repo. In the project's environment variables, set:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Neon connection string (the Vercel ↔ Neon integration sets this for you) |
   | `NEON_AUTH_BASE_URL` | The Auth URL from Neon Console → Auth → Configuration |
   | `NEON_AUTH_COOKIE_SECRET` | 32+ random characters: `openssl rand -base64 32` |
   | `SIGNUP_ACCESS_CODE` | Optional. Overrides the default `zzh_zj_99` |

3. Push. Every deploy runs `scripts/migrate.mjs` before `next build`, which applies the idempotent `db/schema.sql`. No manual migrations are needed.
4. On each iPhone, open the site in Safari, tap **Share → Add to Home Screen**, sign up with the access code, and pair.

## Local development

```bash
cp .env.example .env.local   # fill in the values
npm install
npm run db:migrate           # needs DATABASE_URL in the environment
npm run dev
npm test                     # cycle, scoring, and isolated Postgres deletion tests
npm run lint                 # TypeScript type check
```

## Layout

```
app/
  actions.ts            all server actions (auth, pairing, sessions, periods, notes…)
  auth/                 sign-in / sign-up (access code + 18+ consent)
  onboarding/, pair/    pick sex → pair with invite code
  (app)/                signed-in & paired area: home, calendar, timer, insights, notes, play, settings, inbox
  api/auth/[...path]    Neon Auth proxy (sign-up blocked)
  api/export            JSON export
lib/
  cycle.ts              cycle model: stats, predictions, phases, fertile window
  score.ts              mySex Score
  data.ts               queries; db.ts Neon client; geo.ts IP geolocation
  session-deletions.ts  transactional requests and partner decisions
db/schema.sql           schema (applied on every build)
proxy.ts                session refresh + route protection
```
