import { getDesires, requireCouple } from '@/lib/data';
import { PlayView } from './PlayView';

export const metadata = { title: 'Play · mySex' };

export default async function PlayPage() {
  const ctx = await requireCouple();
  const rows = await getDesires([ctx.me.userId, ctx.partner.userId]);
  const mine: Record<string, 'yes' | 'maybe' | 'no'> = {};
  const theirs = new Map<string, string>();
  for (const r of rows) {
    if (r.user_id === ctx.me.userId) mine[r.item] = r.answer;
    else theirs.set(r.item, r.answer);
  }
  // Privacy: only mutual yes/maybe overlaps leave the server — never the partner's raw answers.
  const matches = Object.entries(mine)
    .filter(([item, a]) => a !== 'no' && theirs.has(item) && theirs.get(item) !== 'no')
    .map(([item, a]) => ({ item, both: a === 'yes' && theirs.get(item) === 'yes' }));
  return <PlayView mine={mine} matches={matches} partnerAnswered={theirs.size} partnerName={ctx.partner.name} />;
}
