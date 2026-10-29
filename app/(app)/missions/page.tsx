import {requireCouple,getSessions} from '@/lib/data';
import {MissionsView} from './MissionsView';
export const metadata={title:'Missions · mySex'};
export default async function MissionsPage(){
  const ctx=await requireCouple();
  return <MissionsView sessions={await getSessions(ctx.couple.id)}/>;
}
