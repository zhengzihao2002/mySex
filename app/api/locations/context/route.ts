import {getCoupleContext} from '@/lib/data';
import {getRequestGeo} from '@/lib/geo';

export async function GET(){
  if(!await getCoupleContext())return Response.json({error:'Not paired'},{status:401});
  const {latitude,longitude,region,country}=await getRequestGeo();
  return Response.json({latitude,longitude,region,country},{headers:{'Cache-Control':'no-store'}});
}
