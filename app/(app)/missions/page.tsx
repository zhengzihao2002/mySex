import {requireCouple,getSessions} from '@/lib/data';
import {getMissionRuns} from '@/lib/mission-store';
import {db} from '@/lib/db';
import {MissionsView} from './MissionsView';
export const metadata={title:'Missions · mySex'};
export default async function MissionsPage(){
  const ctx=await requireCouple();
  const [sessions,runs]=await Promise.all([getSessions(ctx.couple.id),getMissionRuns(db(),ctx.couple.id)]);
  return <MissionsView sessions={sessions} runs={runs} meId={ctx.me.userId} partnerName={ctx.partner.name}/>;
}
