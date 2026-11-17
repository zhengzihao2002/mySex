import {requireCouple} from '@/lib/data';
import {partnerMissionBoard} from '@/lib/partner-mission-data';
import {PartnerStorage} from '@/components/PartnerStorage';
export const metadata={title:'Storage · mySex'};
export default async function StoragePage(){
  const ctx=await requireCouple();
  const board=await partnerMissionBoard(ctx.couple.id,ctx.me.userId,ctx.partner.userId);
  return <PartnerStorage items={board.items} meId={ctx.me.userId} partnerName={ctx.partner.name}/>;
}
