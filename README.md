# mySex 🔥

A private, **18+**, invite-only sex & cycle tracker for one couple, built to live on your iPhone home screen.

- **Live sex timer**: start the clock and it keeps running if you quit the app, lock the phone or open it on your partner's phone. The start time and any pauses are stored in the database, and elapsed time is always `now − start − paused`. Pause for round two, keep the screen awake, or use discreet mode, which dims the screen to black.
- **mySex Score (0–100)** for every session: stamina (duration, up to 40 pts), her and his orgasms (28), your 🔥 heat rating (15), variety (8) and an adventure bonus (9). It's computed on the fly, so changing the formula re-scores all your history.
- **Where you did it**: each session records the IP address and the Vercel geo headers (city, region, country, lat/long), with an optional precise GPS pin and Apple Maps links.
- **Interactive calendar**: period days, predicted periods, cycle phases, fertile window, ovulation and every session. Tap any day to log sex in the past, record when a period starts or ends, or check in.
- **Cycle predictions**: learns from her real cycles (a weighted average of the last 6, ignoring outliers) and forecasts the next 12 periods with a ± window. It also shows ovulation, the fertile window, PMS days and pregnancy risk for each day. These are estimates, not birth control.
- **Phase guide**: hormones, libido and tips for her and for him in each phase. It also charts sex by phase and her horniness by phase.
- **Insights**: monthly, weekday and time-of-day charts, an orgasm scoreboard, protection breakdown, go-to moves, places, 87 achievements (with search and unlocked/undiscovered filters) and full history.
- **Daily check-ins**: mood, horniness, energy, flow and symptoms for both partners. An **"I'm in the mood"** button pings your partner.
- **Dirty notes**: love notes, "tonight I want…" wishes and teases.
- **Play**: sex dice, a dare deck, and a private **Yes / No / Maybe** list. Only mutual matches are ever revealed; your partner never sees your answers.
- **Privacy**: an optional 4-digit passcode lock on each device, JSON export, and unpair. Re-pairing the same two people restores your history.
- **Verified backup restore**: new JSON exports are signed and bound to the exporting account and current partnership. Restore previews eligible counts, adds missing completed sessions and the owner’s periods/check-ins/notes atomically, and skips duplicates without overwriting. Active timers and inbox contents are never restored. Mutually deleted sessions leave only an opaque SHA-256 ID hash to prevent old backups from resurrecting them after replies disappear. Unsigned legacy exports are not importable; export again after deploying. Signing uses the existing auth cookie secret, so rotating that secret also invalidates old backup signatures.
- **Connection insights**: personal ratings, written memories and optional conversation prompts complement the existing stats. Counts and scores are explicitly presented as descriptions, not relationship goals. The collection also includes 16 story badges for tag combinations, crossing midnight, revisiting a place, note exchanges and paired check-ins. A Stories & surprises filter separates these from numeric milestones.
- **Mutual session deletion**: saved shared intercourse/oral records require both partners’ agreement. Declining preserves the record and sends an unread reply. Version checks prevent old consent from deleting an edited session. Running or paused timers are unfinished drafts: discard removes them immediately without a partner request and cannot delete a timer that has already been saved.
- **Live inbox and immediate cleanup**: Inbox sits beside Settings on Home, with a red dot for incoming requests, edit notices, and unread replies. Visible app tabs check a lightweight inbox fingerprint every 15 seconds; hidden tabs stop polling. Inbox access is blocked while a timer is active, including paused timers. Handled deletion requests are physically deleted in the same transaction as the decision; an unread outcome remains only for its recipient, until marked read. Reading an edit notice or outcome physically deletes it immediately. All inbox items have a seven-day maximum lifetime. Every authenticated visit or inbox poll physically removes expired requests, notices, and replies; expired requests are cancelled without changing or deleting the session. Pending edits are combined per record, with the latest change to each field retained and the deadline measured from the first submission. Items with under 24 hours left show an urgent warning. Deployment migrates unread legacy outcomes and clears already-handled history. No push notifications, browser notification permissions, or scheduled user reminders are added.
- **Device privacy**: signing out or forcing a device out physically deletes its `devices` row and every associated `login_events` row. Signing out all other devices also clears orphaned history while preserving this device’s history. Matching Neon Auth sessions are revoked where tracked. Only anonymous SHA-256 revocation hashes remain (no user ID, IP, location, or device description), for up to the 400-day device-cookie lifetime; these prevent an old browser/session from recreating IP records. A fresh sign-in rotates the device cookie. Deployment also cleans previously retained signed-out devices and orphaned login history. IP/location pins attached to shared sex-session records retain their existing behavior.
- **Recording location**: live timer location and GPS choices persist per browser. GPS opt-in requests a fresh high-accuracy browser position before starting; denied, unavailable, or timed-out requests report an error without silently saving an IP pin. Live timers and session details show the coordinate source and saved map pin. GPS area names are resolved from the saved coordinates using OpenStreetMap/Nominatim, preferring neighbourhood/suburb and city. Lookup failure preserves the GPS coordinates without presenting the IP city as the GPS area. One unnamed existing GPS record is refreshed per view; a database gate limits lookups globally to one per second. Precise coordinates are sent to OpenStreetMap for this lookup; no session notes or profile details are sent. Browser and device permission settings control repeated permission prompts.
- **Orgasm counts**: both partners can record 0–20 orgasms. Orgasm and ejaculation are distinct, and either partner may have multiple orgasms; one is not a biological maximum for men. Existing counts and scoring are preserved.
- **Small data footprint**: records remain short text and numbers. Backup restore accepts JSON up to 3 MB; files are validated in memory and not stored as uploads. Polling only runs while a tab is visible, so closed apps do not keep Neon awake.

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
   | `CRON_SECRET` | Optional. Vercel sends this as a bearer token to authenticate scheduled retention cleanup. Without it, the endpoint only accepts the Vercel cron user-agent and performs a fixed TTL sweep with no user input or user data in its response; anonymous device revocation cleanup is hourly-gated. |

3. Push. Every deploy runs `scripts/migrate.mjs` before `next build`, which applies the idempotent `db/schema.sql`. No manual migrations are needed.
4. On each iPhone, open the site in Safari, tap **Share → Add to Home Screen**, sign up with the access code, and pair.

## Local development

On macOS, use Node 22 LTS (or newer) and run commands inside this repository:

```bash
nvm install 22
nvm use 22
npm ci
cp .env.example .env.local
```

Edit `.env.local`: set your Neon `DATABASE_URL`, `NEON_AUTH_BASE_URL`, and a 32+ character `NEON_AUTH_COOKIE_SECRET` (`openssl rand -base64 32` generates one). Use a Neon development branch to keep local experiments separate from production. No secrets are committed to the repository.

```bash
npm run db:migrate
npm run dev
```

Open http://localhost:3000. The migration script now loads `.env.local`, just as Next.js does. If port 3000 is occupied, use `npm run dev -- --port 3001`. For a production preview, run `npm run build` before `npm start`; `npm start` alone needs an existing successful build. If a command still fails, the terminal error is needed to identify the specific problem.


If authentication reports **Invalid origin**, open `http://localhost:3000` rather than the Network/IP URL printed by Next.js. In the Neon Console, choose the same project/branch as `NEON_AUTH_BASE_URL`, then **Auth → Configuration → Domains**. Check that localhost connections are enabled; add the exact origin if using an IP or another hostname. The Neon CLI can enable the branch setting with `neon neon-auth domain allow-localhost enable`. See https://neon.com/docs/auth/guides/configure-domains. An origin error does not mean an email was sent or that verification is required.

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
  privacy.ts            expired device-marker cleanup and device-history deletion/revocation
db/schema.sql           schema (applied on every build)
proxy.ts                session refresh + route protection
```

- **Individual session experiences**: each partner owns their session feeling, personal rating, favourite moment and willingness to repeat. These are shared but only the author can change them. They export with the session; restore imports only the account owner’s entries. Session deletion cascades to these entries.
- **Timer prompts and personality**: opt-in position/activity shuffle, with optional 90-second prompts while visible and running. Skipping and stopping are always available. Suggestions do not become recorded session facts. Personality cards describe selected tags alongside the existing score.

Session entry and editing use one form, with no free-text location box or saved-place suggestion chips. Existing saved place text is preserved in the data. After a live recording, the save form previews the captured area and read-only map pin, identifies GPS versus approximate IP location, or states that no location was recorded. The preview uses the recording’s saved coordinates and does not request a new device location. The interactive map pin editor remains available when editing a saved record. Experience fields sit between tags and location. Initial completion/past-entry may record both partners on one phone; a one-time database flag prevents that permission being reused. Later saves update only the author’s experience. Personal-only saves are immediate and preserve any pending shared proposal. Shared edits merge only the fields changed in the editor into one proposal per record; returning a field to its saved value removes that change, and returning all fields cancels the proposal. The editor opens with pending values and shows saved values crossed out beside proposed values, including an in-app map of the proposed pin. A counterproposal from the other partner requires the original requester to approve it. Approval is bound to the exact proposal reviewed, and personal updates and the new request version commit atomically.


The saved-record editor uses one location section for the saved/proposed address, source and interactive pin; pending-change comparisons do not add another map. The time summary follows the edited values, labels active/break colours, and omits the solid no-break line. A prominent read-only score ring explains the existing six contributions and formulas; category selection only changes the explanation. Its percentages cannot be edited, and the saved score stays separate from unsaved changes.

Live recording keeps the activity chosen at start through completion, enforced by the completion query. The finish form shows the recorded type without another switch. Historical entries default to the selected type and retain their own picker; saved type corrections still use partner approval. Start options are disabled during startup, and a failed pause leaves the finish sheet closed.
