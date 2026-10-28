import {z} from 'zod';
import {getCoupleContext} from '@/lib/data';
import {db} from '@/lib/db';
import {searchAddresses} from '@/lib/address-search';

const input=z.object({query:z.string().trim().min(3).max(200),lang:z.enum(['en','zh']).default('en')});
export async function POST(request:Request) {
  if (!await getCoupleContext()) return Response.json({error:'Not paired'},{status:401});
  let body:unknown;
  try {const raw=await request.text();if(raw.length>2048)return Response.json({error:'Invalid input'},{status:400});body=JSON.parse(raw);} catch {return Response.json({error:'Invalid input'},{status:400});}
  const parsed=input.safeParse(body);
  if (!parsed.success) return Response.json({error:'Invalid input'},{status:400});
  const result=await searchAddresses(db(),parsed.data.query,parsed.data.lang);
  const status='error' in result?result.error==='busy'?429:result.error==='invalid'?400:502:200;
  return Response.json(result,{status,headers:{'Cache-Control':'no-store',...(status===429?{'Retry-After':'1'}:{})}});
}
