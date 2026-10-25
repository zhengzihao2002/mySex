import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { NeonQueryFunction } from '@neondatabase/serverless';
import { getGpsArea, parseGpsArea } from './gps-area.ts';
import { sessionLocation } from './session-location.ts';

test('area names prefer a neighbourhood and its city, using GPS country rather than network country',()=> {
  const area=parseGpsArea({address:{neighbourhood:'Greenwich Village',city:'New York',state:'New York',country_code:'us'}});
  assert.deepEqual(area,{city:'Greenwich Village, New York',region:'New York',country:'US'});
  const location=sessionLocation({ip:'192.0.2.1',city:'Wrong city',region:'Wrong state',country:'GB',latitude:51,longitude:0},true,{latitude:40.73,longitude:-74},area);
  assert.equal(location.city,'Greenwich Village, New York');assert.equal(location.country,'US');assert.equal(location.latitude,40.73);
});
test('village, town, duplicate locality, malformed and absent addresses are handled',()=> {
  assert.equal(parseGpsArea({address:{village:'A village',country_code:'gb'}})?.city,'A village');
  assert.equal(parseGpsArea({address:{suburb:'Same',city:'Same'}})?.city,'Same');
  assert.equal(parseGpsArea({address:{town:'A town'}})?.city,'A town');
  for(const input of [null,{}, {address:{country:'Ocean'}},{address:{city:123}}])assert.equal(parseGpsArea(input),null);
});
test('the lookup sends only coordinates with attribution headers; failures and busy rate gate keep GPS without unrelated IP names',async()=> {
  const original=globalThis.fetch;
  let calls=0;
  const client=(async()=>[{name:'gps-area-lookup'}]) as unknown as NeonQueryFunction<false,false>;
  try {
    globalThis.fetch=async(input,options)=>{
      calls++;const url=new URL(String(input));assert.equal(url.hostname,'nominatim.openstreetmap.org');
      assert.equal(url.searchParams.get('lat'),'1.2');assert.equal(url.searchParams.get('lon'),'3.4');
      assert.match((options?.headers as Record<string,string>)['User-Agent'],/mySex/);
      return Response.json({address:{town:'Actual town',country_code:'nz'}});
    };
    assert.equal((await getGpsArea(client,{latitude:1.2,longitude:3.4}))?.city,'Actual town');
    const busy=(async()=>[]) as unknown as NeonQueryFunction<false,false>;
    assert.equal(await getGpsArea(busy,{latitude:1.2,longitude:3.4}),null);assert.equal(calls,1);
    globalThis.fetch=async()=>new Response(null,{status:429});assert.equal(await getGpsArea(client,{latitude:1.2,longitude:3.4}),null);
    globalThis.fetch=async()=>{throw new Error('timeout')};assert.equal(await getGpsArea(client,{latitude:1.2,longitude:3.4}),null);
    const gpsOnly=sessionLocation({ip:'192.0.2.1',city:'Wrong city',region:'Wrong region',country:'US',latitude:50,longitude:60},true,{latitude:1.2,longitude:3.4},null);
    assert.equal(gpsOnly.city,null);assert.equal(gpsOnly.latitude,1.2);assert.equal(gpsOnly.source,'gps');
  } finally {globalThis.fetch=original}
});
