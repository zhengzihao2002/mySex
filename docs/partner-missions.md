# Partner goals and Storage

Partner missions are separate from the existing automatic XP quests. Either partner may send an invitation with a custom goal, timeframe, optional prize, optional multiplier bonus and optional reverse-claim item. Item titles and conditions are free text; icons change only appearance. The recipient joins or declines. Either participant may end a joined mission without a failure claim. Ending preserves already-earned items.

Only completed intercourse records count. Metrics: cumulative active minutes (breaks excluded), cumulative total minutes (breaks included), saved record count, and distinct known intercourse positions. Records must start after both window start and acceptance, end inside the window, and be saved before the deadline. Existing records, oral and ongoing recordings do not qualify. No XP formula changes. Both partners can open successful mission proof in Insights.

Before the deadline, eligible corrections/deletions reconcile progress and unspent rewards. Outcomes settle when the app next checks after the deadline, retaining the evaluated value and proof snapshot; settled outcomes are final. A new `mission_saved_at` timestamp blocks new backfilled saves after the deadline. Approved shared-record edits/deletions reconcile expired outcomes first, so later corrections do not rewrite the settled result.

Reward details are redacted on the server until the recipient reaches the relevant target. The issuer may review their configured terms. A failed accepted mission creates the optional claim for the issuer, with the other partner as approver. Declined, cancelled or unaccepted expired invitations never create claims. There is at most one item per mission and prize tier.

Storage: ready → requested → used (counterparty approval) or ready (decline/withdraw). Used items disappear from the active collection and remain in collapsed history. Items are agreements between partners; approval does not make payments, delete files, change contraception settings, or bypass consent in the moment. Requests expire after seven days; earned items do not expire.

All reads and writes require current membership in the active couple. Mission outcomes reconcile once per server request, shared by page/layout. Inbox attention and visible-page refresh expose invitations and item approvals without OS notifications. Polling pauses with an open dialog to protect drafts.

## Goal builder update

New goals use a system-generated name and no custom description. Up to eight conditions can be combined with AND, each specifying intercourse or oral and a recorded metric. Every condition must pass; stretch rewards multiply every target. Oral partner goals do not change the existing intercourse-only XP quests. Existing single-condition missions remain compatible.

Rewards and reverse claims offer a catalogue first, with system-selected labels and icons; only Something else opens custom naming. Every option keeps a separate restrictions field. Storage-use approvals appear directly in Inbox. Back follows app navigation history, falling back to Home on direct entry.
