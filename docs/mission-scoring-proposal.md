# Couple missions, progression and versioned session scoring

Status: approved by the user and implemented. Existing achievements and the original recording controls remain available.

## Product direction

An opt-in cooperative game for the two partners: choose a challenge together, record what actually happened, earn XP, and unlock the next chapter. The missions encourage exploration, longer active sessions, and returning to the app. There are no public rankings, notifications, loss streaks, or penalties for stopping or taking a break.

## Quest board

Add a Missions destination from Home and Play without replacing the existing dice, dares, private preferences, or achievements. A compact Home card shows the accepted mission and progress. Three paths:

- Explorer: learn and revisit different positions. Example sequence: record a position absent from your history; record two different positions in one session; complete a three-position session; complete a chapter containing several distinct positions across sessions.
- Endurance: active-time milestones of 10, 15, 20, 30, then an optional 40 minutes. Breaks never count toward active time and never reset earned time. Targets are chosen before starting, remain optional, and are capped rather than escalating indefinitely.
- Rhythm: complete a chosen number of sessions on distinct days in a self-started chapter. Show progress without a daily streak that resets. An optional seven-day challenge can be restarted with no XP debt or loss of previous chapter rewards.

A chapter culminates in a combined challenge, such as a 20-minute active session with two positions. Start with 12 carefully written missions rather than many renamed count thresholds. Separate oral/intercourse catalogs; intercourse position cards remain absent from oral recordings.

Both partners accept the mission; either can skip or abandon it. Suggestions respect exclusions and mutual preferences. Historical Yes/Maybe answers do not automatically accept a new mission. One phone can support the initial recording as it does now, but must not impersonate the other account's mission acceptance.

## Rewards and proof

Suggested base rewards: 50 XP for an introductory mission, 100 for an intermediate mission, 150 for an advanced mission, and a chapter-completion reward. Reward chapter completion with a badge or optional card-back/ring accent, preserving the original theme by default.

Show concrete requirements before accepting, and exact saved-record evidence afterwards. New sessions after acceptance qualify; no retroactive instant campaign completion. One mission reward per mission instance, atomically awarded. Duration uses saved active seconds; positions use explicitly selected position tags. Revealing a random card does not prove it was performed. Existing data cannot prove time spent in an individual position, so do not offer that requirement without a separately approved segment-timing feature.

Manual past entries can qualify when their actual recorded start follows acceptance. They remain honestly self-reported. No extra GPS tracking or new recording permissions. Personal-only edits remain immediate; shared changes still need approval. Corrected or deleted proof is reevaluated so duplicate or invalid records cannot permanently inflate rewards. A subsequent short session does not subtract XP.

Mission progress is separate from the inbox's seven-day request retention. Any mission invitations placed in Inbox follow that retention policy. Accepting an invitation records mission membership independently; expiring an unanswered invitation never auto-accepts it.

## Proposed score v2: 100 informational points

Keep session score and lifetime XP separate. The score cannot be directly edited.

| Contribution | Maximum | Proposed rule |
|---|---:|---|
| Active time | 45 | round(45 × min(activeMinutes / 40, 1)^1.4) |
| Partner heat ratings | 20 | 4 × mean of submitted 1–5 ratings, rounded; clearly show when only one rated |
| Recorded pleasure | 20 | Intercourse: 10 points for each partner recording at least one orgasm; oral: divide 20 across explicitly recorded recipients; additional orgasms do not add points |
| Position variety | 15 | One distinct position: 3; two: 8; three or more: 15; ordinary mood/setting tags do not count |

Time examples: 5 minutes = 2/45; 10 = 6; 15 = 11; 20 = 17; 30 = 30; 40 = 45. With all other contributions maximized, 20 minutes reaches 72%, 30 reaches 85%, and 40 reaches 100%. Additional time beyond 40 adds no points. Missing orgasm data remains unknown rather than displaying zero; it earns no provisional contribution. Oral recipient selection must be unambiguous before allocating that contribution.

This makes high scores harder and makes duration matter more while preventing score farming by adding descriptive tags or ever-higher orgasm counts. The timer may show the chosen milestone and active-time progress, but Pause, Finish, and Discard remain available at every score.

## Implemented progression

The board has 12 missions plus a chapter finale for each activity. Explorer, Endurance and Rhythm unlock sequentially within their paths. Either partner can skip without XP; an unfinished mission can be abandoned and invited again. Rhythm uses untimed progress, not streak resets. The 40-minute summit is optional for reaching the finale. Completion awards the chapter crown on the board.

New completed records with positive active duration earn 25 base XP for intercourse or 15 for oral, plus `round(80 × min(activeMinutes / 40, 1)^1.4)` endurance XP. Classic records do not receive retroactive XP. Session XP and mission XP feed 50 ranks with localized titles, including 月蚀领航者、极光登峰者、双生凤凰 超新星双皇 and 无上未竟神话; every level has its own title. The threshold for zero-based rank index `i` is `100i² + 50i`; each subsequent level therefore takes more additional XP. The last rank remains a title while lifetime XP continues to grow.

The Home card shows the current rank, total XP, next threshold, and an active mission or pending invitations. The full ladder and XP explanation open from Missions. Live recordings show projected session XP and an accepted endurance goal, and the save reveal shows XP and level-ups. Scores remain informational, with per-category explanations in record details.

## Persistence and verification boundaries

`couple_missions` has a unique `(couple_id, kind, mission_key)` row and a server-generated ID. The proposer accepts by inviting; only the other authenticated account can activate that exact invitation. A withdrawn/replaced ID cannot activate a newer invitation. Pending invitations are physically removed after seven days by the existing authenticated-visit cleanup. Accepted/skipped mission state persists separately from inbox retention. Invitations are on the mission board, not in the record-approval inbox.

XP is derived from distinct current saved record IDs and canonical mission rows rather than an incrementing balance or claimed-award table. Repeated requests cannot double-award XP. Deletion or an approved correction reevaluates evidence and removes invalid rewards; a later short record cannot erase a valid earlier reward. Records and their active durations are self-reported; the app does not verify what happened physically. Mission day boundaries use the timezone saved with the invitation.

The schema adds score version 1 to existing rows before setting the default for newly created records to 2. Classic scoring uses only classic records for its history-dependent context, so new past entries cannot silently alter old adventure bonuses. Analytics compare average/best scores within a selected version, and location averages label each version separately. Signed backups preserve the session score version; older backups restore as classic. Mission acceptance remains in the live database and is not replayed by a one-person backup restore.

Automated checks cover migration reruns, unchanged classic scores, v2 thresholds, recipient handling, position filtering, rating averages, dual acceptance, duplicate invitations/acceptance, expiry, unpairing, abandoned/replaced IDs, local-day evidence, skipped goals, corrected/deleted proof, and backup score-version integrity. Browser checks cover the board, rank ladder, read-only score chart, timer, Simplified Chinese and narrow screens.
