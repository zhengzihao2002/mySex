# Automatic couple quests, XP and versioned scoring

Status: implemented according to the approved product direction and subsequent user corrections.

## Automatic intercourse quests

The board has 12 goals across Explorer, Endurance and Rhythm, plus a chapter finale. Every goal tracks distinct saved intercourse records automatically, including existing history. No acceptance, skipping, abandonment or manual claims are needed. Single-session goals stay at zero until one record meets every condition; shorter records cannot be added together. Only completed goals display saved-record proof.

Endurance goals now start at 60 active minutes:

| Goal | Full qualifying record | One-time XP |
|---|---|---:|
| The iron hour | ONE session, 60 active minutes, four positions | 120 |
| The ninety-minute ascent | ONE session, 90 active minutes, five positions | 240 |
| The two-hour legend | ONE session, 120 active minutes, six positions | 400 |
| Three summits | Three distinct days, each with a 90-minute/five-position session | 600 |
| The crown circuit | Five distinct days, each with a 120-minute/six-position session | 1,000 |

The intercourse library contains 24 positions, including all eight original labels. The form keeps the original eight visible, supports expanding the rest, shows selected new positions even when collapsed, and searches both English and Simplified Chinese. Timer cards and the Play dice use the expanded library too. Oral choices remain separate. The atlas still needs eight distinct positions, now chosen from all 24, so existing atlas proof stays valid. Explorer and Rhythm goals retain their position collections, distinct combinations and qualifying days. Actual position-library tags count; extra labels, duplicate tags, reordered combinations, oral records, unfinished recordings and future records cannot supply proof. Breaks never add to active minutes. Multi-day goals use UTC dates and have no deadlines.

The finale requires all twelve other quests, followed by a separate session starting after their supporting records finish, with 120 active minutes and six positions. Completing the catalogue awards 10,710 quest XP. Quest bonuses and proof are reevaluated against these harder requirements.

Oral recording keeps its separate activity choices and informational score; it has no quests or XP. Existing dice, dares, preferences and achievements remain available. There are no reminders or penalties for taking breaks.

## XP and levels

Every completed intercourse record earns 25 base XP plus `round(80 × min(activeMinutes / 120, 1)²)` endurance XP. The final point is reserved until the entire 120-minute target is met rather than rounding up early. The steeper curve awards very little endurance XP for short sessions, reaches 45 endurance XP at 90 active minutes, and caps at 80 endurance XP at 120 active minutes. More time past two active hours does not add XP.

| Active minutes | Endurance XP | Total session XP |
|---:|---:|---:|
| 10 | 1 | 26 |
| 20 | 2 | 27 |
| 30 | 5 | 30 |
| 40 | 9 | 34 |
| 60 | 20 | 45 |
| 90 | 45 | 70 |
| 120 or more | 80 | 105 |

Quest bonuses are separate. This curve applies to existing and new intercourse history, so previous records still count, while XP totals and levels can decrease under the harder rules. Unknown historical duration earns base XP without an invented time bonus. Unfinished recordings and explicit zero-duration records earn none; oral records and breaks earn none.

The ladder has 25 distinct rank titles selected across the full original title range, ending at The Boundless Myth. At zero-based index `i`, cumulative XP is `850i² + 450i`. Upgrade costs start at 1,300 XP and increase by 1,700 XP each level: 1,300, 3,000, 4,700, and so on. Level 25 naturally requires 500,400 XP, with no fixed-total override or minimum record-count gate. Condensing the ranks does not change earned XP; the displayed level and title are derived from the same XP total under the new thresholds.

XP is derived from current distinct saved IDs and deterministic goal definitions, never incremented by clicking Save or Claim. Repeated reads and duplicate IDs cannot double-award XP. Corrections/deletions reevaluate proof and rewards. Personal edits save directly; shared edits and deletion retain partner approval. Legacy mission invitations/skips cannot affect rewards, and the existing inbox retention remains unchanged.

## Save celebration and navigation

Edit, finish-save and record-detail sheets retain their layout height while the keyboard opens; their inner scroll area follows the usable keyboard space. A smaller Safari visual viewport without a keyboard does not lift the panel above the bottom edge. Edit and Save buttons stay in normal document flow. Sheets, the XP modal and the saved-score overlay share one page-scroll lock, so closing them in different orders cannot leave another overlay's temporary body/root styles behind. A brief viewport recovery restores the original page scroll as Safari's keyboard settles, stops on the next user gesture, and removes its listeners after 500 milliseconds.

Live completion and both manual-entry paths return the authoritative saved session, its score, and a reward snapshot. The previous XP is reconstructed from the current history excluding that record; the new XP includes it. This identifies the new session's XP and newly completed goals without trusting a client clock estimate or stale rank.

For intercourse, a native modal first shows the previous level, title, XP total and bar. The bar fills in segments, pauses at a full bar, then resets and changes the level/title at each crossed threshold. The final state shows earned session/quest XP and completed-goal chips. Continue becomes available only when the visible animation ends. Escape and backdrop taps do not dismiss it; hidden-tab time does not advance it. Reduced-motion mode shows the original and final states without a sweep. Continue reveals the existing saved-score summary. Oral saves show the score summary without an XP celebration.

The Home progression card opens Couple quests. Its counterpart on that page is a button that scrolls to and focuses quest progress. The page's back link returns to Home. The rank ladder remains available from the board.

## Informational scores

Existing saved v1 and v2 records keep their original formulas. The current v3 endurance score uses the requested one-hour maximum, independently of the two-hour XP maximum. A migration defaults only newly inserted records to v3 and preserves all existing version values on reruns. Signed backups preserve all three versions. Analytics compare scores within one version rather than averaging different formulas together.

New v3 intercourse records use:

| Contribution | Maximum | Rule |
|---|---:|---|
| Active time | 45 | `round(45 × min(activeMinutes / 60, 1)²)` |
| Heat ratings | 20 | Four times the mean submitted partner rating, rounded |
| Recorded pleasure | 20 | Ten points per partner with a recorded orgasm; extra orgasms add no points |
| Position variety | 15 | One distinct position: 3; two: 8; three or more: 15 |

The active-time contribution is 1/5/11/20/45 points at 10/20/30/40/60 minutes. The final score point requires the full 60 minutes instead of rounding up early. Endurance XP separately retains its 120-minute maximum. Breaks never contribute. New oral records retain their previous 40-minute informational time curve and recipient-based pleasure calculation; the intercourse progression change does not add oral quests or XP.

The score stays read-only, with a prominent version label and expandable calculation. Existing saved scores remain unchanged when XP recalculates under the harder curve.

## Verification

Checks cover automatic history progress without acceptance, legacy skips having no effect, one award per goal, excluded oral/unfinished/future records, actual positions, UTC day boundaries, strict single-session thresholds, advanced position/time combinations, finale chronology, edited/deleted proof, unchanged classic scores, rank boundaries and authoritative reward snapshots. Browser verification covers both navigation fixes, multiple animated level crossings, old/new XP, full-bar reset, early-dismissal prevention, Continue, original score access, live/manual save integration, Simplified Chinese, reduced motion and narrow screens. Existing record editing, calendar navigation and nested modal behavior are regression checked.
