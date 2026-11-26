# Partner goals and Storage

Partner missions are separate from the existing automatic XP quests. Either partner may send an invitation with a custom goal, timeframe, optional prize, optional multiplier bonus and optional reverse-claim item. The catalogue has exactly Money, Delete ugly photos, Raw pass and Something else, with no preselected reward, bonus or claim. Item names and icons are assigned automatically. Money has amount/currency fields; Raw pass is an explicit option. Custom naming is available only as the fallback, while restrictions remain freely editable. The recipient joins or declines. Either participant may end a joined mission without a failure claim. Ending preserves already-earned items.

Only completed intercourse records count. Metrics: cumulative active minutes (breaks excluded), cumulative total minutes (breaks included), saved record count, and distinct known intercourse positions. Records must start after both window start and acceptance, end inside the window, and be saved before the deadline. Existing records, oral and ongoing recordings do not qualify. No XP formula changes. Both partners can open successful mission proof in Insights.

Before the deadline, eligible corrections/deletions reconcile progress and unspent rewards. Outcomes settle when the app next checks after the deadline, retaining the evaluated value and proof snapshot; settled outcomes are final. A new `mission_saved_at` timestamp blocks new backfilled saves after the deadline. Approved shared-record edits/deletions reconcile expired outcomes first, so later corrections do not rewrite the settled result.

Reward details are redacted on the server until the recipient reaches the relevant target. The issuer may review their configured terms. A failed accepted mission creates the optional claim for the issuer, with the other partner as approver. Declined, cancelled or unaccepted expired invitations never create claims. There is at most one item per mission and prize tier.

Storage: ready → requested → used (counterparty approval) or ready (decline/withdraw). Used items disappear from the active collection and remain in collapsed history. Items are agreements between partners; approval does not make payments, delete files, change contraception settings, or bypass consent in the moment. Requests expire after seven days; earned items do not expire.

All reads and writes require current membership in the active couple. Mission outcomes reconcile once per server request, shared by page/layout. Inbox attention and visible-page refresh expose invitations and item approvals without OS notifications. Polling pauses with an open dialog to protect drafts.

## Goal builder update

New goals use a system-generated name and no custom description. Up to eight conditions can be combined with AND, each specifying intercourse or oral and a recorded metric. Every condition must pass; stretch rewards multiply every target. Oral partner goals do not change the existing intercourse-only XP quests. Existing single-condition missions remain compatible.

Rewards and reverse claims offer a catalogue first, with system-selected labels and icons; only Something else opens custom naming. Every option keeps a separate restrictions field. Storage-use approvals appear directly in Inbox. Back follows app navigation history, falling back to Home on direct entry.

## Daily target and navigation refinement

Minutes per day is a planning shortcut for one cumulative goal: daily minutes multiplied by the number of selected local calendar dates. End-midnight excludes that date, and DST does not change the date count. Progress may be unevenly distributed across days. The normalized total and daily breakdown are stored with the goal.

Storage is the owner’s collection, not a second approval screen. Counterparty approvals live in Inbox. The return control is labelled with the originating screen. Metric changes reset defaults to minutes=30, records=1, positions=3.

## Per-date calendar plan

The minutes-per-day planner displays the selected local dates in a month calendar. Every date has an editable minutes amount, including zero for a partial or unavailable day. The date-only range selector uses a first tap for the start and a second tap for the inclusive end. Dates outside the selected range then become gray and disabled. A Change dates control unlocks a new selection. Only dates inside the current window are normalized and stored; their amounts sum to one cumulative goal. These are planning amounts, not independent daily completion requirements. Existing uniform per-day goals remain supported.

## Shared records, visibility and the minutes plan

- **Goals for each other count independently.** A record advances at most one goal per partner (goals for the same person still share records, shortest first), but your goal for your partner and their goal for you both progress from the same session. Settled/cancelled proof is reserved only within that partner's goals.
- **The whole window counts once joined.** Joining is still required, but records inside the goal dates count even if they were saved before the invitation was accepted. Active goals recalculate on the next visit, so goals that were stuck because an invitation was accepted late catch up automatically. Settled outcomes stay final.
- **Inbox shows goal invitations.** Incoming invitations can be joined or declined directly in Inbox; outgoing ones can be withdrawn there.
- **Visibility.** Both partners see the reward and bonus reward as soon as the invitation is sent. Only the creator sees the punishment; the recipient sees a note that any punishment stays secret.
- **Minutes plan.** Minute conditions are planned next to the calendar with three modes: *Whole period* (one total), *Same each day* (one amount for every selected date) and *Each day* (tap dates to set their own minutes, with a shortcut to apply one value to every day). Switching modes keeps the planned total.
- **Declined invitations** disappear from both partners' goal lists. The sender gets a "Goal replies" notice in Inbox; dismissing it (or seven days passing) deletes the goal. Past goals lists only finished goals; declined and cancelled goals never appear there.
- **Empty outcomes** are still shown: a goal without a reward displays "No reward", and the creator sees "No punishment" when none was set.
- **Keyboard.** `components/KeyboardFloat.tsx` makes the iOS keyboard float over the app: a tapped field is transparent for the instant it gains focus, so Safari skips its own pan, and any pan on a scroll-locked screen is undone. Sheets with text fields open at full height and only scroll their content; Notes keeps its full height and lifts just the composer; ordinary pages scroll smoothly into temporary room under the keyboard.
