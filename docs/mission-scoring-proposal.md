# Automatic couple quests, XP and versioned scoring

Status: implemented according to the approved product direction and subsequent user corrections.

## Automatic intercourse quests

The board has 12 goals across Explorer, Endurance and Rhythm, plus a chapter finale. All goals track saved intercourse records automatically, including existing history. There are no invitations, acceptance, skipping, abandonment, or manual claims. Goals award their XP once when their saved evidence meets the requirements.

Explorer rewards the first recorded library position, two/three positions in one record, and four distinct positions across records. Endurance rewards 10, 15, 20, 30 and 40 active minutes; pauses never count. Rhythm rewards two/three distinct UTC dates and revisiting a position on three dates. UTC boundaries keep progress identical for both partners. The finale requires the collection, 30-minute and revisit goals plus a saved session containing 20 active minutes and two positions. The 40-minute summit is optional for the finale. Revealing a timer card supplies no proof: only selected, saved positions count. Mood and setting labels are not positions.

Oral recording remains available, with its separate activity choices and informational score; it has no quests or XP. Existing dice, dares, preferences and achievements remain available. No reminders, public rankings or penalties for stopping or taking breaks were added.

## XP and levels

Existing and new completed intercourse records earn 25 base XP plus `round(80 × min(activeMinutes / 40, 1)^1.4)` endurance XP. A historical record with unknown active duration earns base XP without an invented time bonus. Unfinished recordings and explicit zero-duration records earn none. Additional time past 40 minutes gives no additional duration XP.

Session XP plus completed-goal XP determines the couple's rank. There are 100 distinct English and Simplified Chinese titles. At zero-based rank index `i`, the cumulative threshold is `50i² + 100i`. Upgrade costs start at 150 XP and grow by 100 XP each time: 150, 250, 350, 450, etc. Level 100 naturally requires 499,950 XP. There is no fixed-total override or minimum record count.

XP is derived from distinct saved record IDs and deterministic goal definitions, never incremented by clicking Save or Claim. Repeated reads and duplicate IDs cannot double-award a goal. A deleted record or approved correction reevaluates its proof; adding a shorter record does not subtract valid previous rewards. Personal edits still save directly, while shared edits and record deletion retain their partner-approval rules.

Legacy `couple_missions` rows are no longer used to determine progress or rewards. Old-client acceptance/skip actions return an automatic-quests message without changing progress. The existing seven-day request/inbox retention remains unchanged.

## Save celebration and navigation

Live completion and both manual-entry paths return the authoritative saved session, its score, and a reward snapshot. The previous XP is reconstructed from the current history excluding that record; the new XP includes it. This identifies the new session's XP and newly completed goals without trusting a client clock estimate or stale rank.

For intercourse, a native modal first shows the previous level, title, XP total and bar. The bar fills in segments, pauses at a full bar, then resets and changes the level/title at each crossed threshold. The final state shows earned session/quest XP and completed-goal chips. Continue becomes available only when the visible animation ends. Escape and backdrop taps do not dismiss it; hidden-tab time does not advance it. Reduced-motion mode shows the original and final states without a sweep. Continue reveals the existing saved-score summary. Oral saves show the score summary without an XP celebration.

The Home progression card opens Couple quests. Its counterpart on that page is a button that scrolls to and focuses quest progress. The page's back link returns to Home. The rank ladder remains available from the board.

## Informational score v2

Classic records keep their original calculation, even though they now earn XP. New records use v2:

| Contribution | Maximum | Rule |
|---|---:|---|
| Active time | 45 | `round(45 × min(activeMinutes / 40, 1)^1.4)` |
| Heat ratings | 20 | Four times the mean submitted partner rating, rounded |
| Recorded pleasure | 20 | Intercourse: 10 points per partner with a recorded orgasm; oral: divide 20 among explicit recipients; no bonus for extra orgasms |
| Position variety | 15 | One distinct position: 3; two: 8; three or more: 15 |

Time contributes 2/6/11/17/30/45 points at 5/10/15/20/30/40 minutes. Missing ratings or orgasm data earns no provisional contribution. The score cannot be edited directly. Version-aware analytics and signed backup version preservation remain in place.

## Verification

Checks cover automatic history progress without acceptance, legacy skips having no effect, one award per goal, excluded oral/unfinished/future records, actual positions, UTC day boundaries, finale requirements, edited/deleted proof, unchanged classic scores, rank boundaries and authoritative reward snapshots. Browser verification covers both navigation fixes, multiple animated level crossings, old/new XP, full-bar reset, early-dismissal prevention, Continue, original score access, live/manual save integration, Simplified Chinese, reduced motion and narrow screens. Existing record editing, calendar navigation and nested modal behavior are regression checked.
