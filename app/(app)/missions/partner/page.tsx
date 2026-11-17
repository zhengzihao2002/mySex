import {requireCouple} from '@/lib/data';
import {partnerMissionBoard} from '@/lib/partner-mission-data';
import {PartnerMissions} from '@/components/PartnerMissions';
export const metadata={title:'Partner missions · mySex'};
export default async function PartnerMissionsPage(){
  const ctx=await requireCouple();
  const board=await partnerMissionBoard(ctx.couple.id,ctx.me.userId,ctx.partner.userId);
  return <PartnerMissions missions={board.missions} meId={ctx.me.userId} partnerName={ctx.partner.name}/>;
}
