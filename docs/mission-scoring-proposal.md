# Proposal: couple missions and harder session scoring

Status: proposal only. No mission tables, XP, score weights, timer targets, or existing achievement criteria have been changed.

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

## Decisions before implementation

1. Approve or revise the four score weights and 40-minute cap. This changes the old sex-specific weights and removes adventure bonuses from v2; those are deliberate proposed changes, not already authorized removals.
2. Approve a v2 launch boundary: existing records retain their classic score calculation; new records use v2, with a visible version label and version-aware comparisons. No silent historical rescoring.
3. Confirm whether a Rhythm chapter should have an optional deadline or use only untimed progress. No automatic reminders either way.

## Implementation order after agreement

Start with mission board, dual acceptance, 12 missions, deterministic evidence/XP, and progress in the existing timer/save reveal. Add the approved v2 formula and versioned score explanations. Add cosmetic unlocks last. Test two-device races, duplicate saves, abandoned missions, edited/deleted evidence, oral recipient handling, pause exclusion, and expiry independently of record retention.
