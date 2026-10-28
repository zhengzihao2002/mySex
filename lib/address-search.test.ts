import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {NeonQueryFunction} from '@neondatabase/serverless';
import {parseAddressResults,searchAddresses} from './address-search.ts';

const free=(async()=>[{name:'gps-area-lookup'}]) as unknown as NeonQueryFunction<false,false>;
test('address results accept valid zero coordinates and reject unusable provider data',()=>{
  const valid={display_name:'Example address',lat:'0',lon:'0'};
  assert.deepEqual(parseAddressResults([valid]),[{label:'Example address',latitude:0,longitude:0}]);
  assert.deepEqual(parseAddressResults([null,{}, {...valid,lat:null},{...valid,lat:''},{...valid,lat:'NaN'},{...valid,lat:'90'},{...valid,lon:'181'},{...valid,display_name:''}]),[]);
  assert.equal(parseAddressResults(Array(10).fill(valid)).length,5);
});
test('submitted searches send bounded queries and locale to the fixed provider with caching and attribution',async()=>{
  const original=globalThis.fetch;let calls=0;
  try {
    globalThis.fetch=async(input,init)=>{
      calls++;const url=new URL(String(input));assert.equal(url.origin,'https://nominatim.openstreetmap.org');assert.equal(url.pathname,'/search');
      assert.equal(url.searchParams.get('q'),'12 Example Road');assert.equal(url.searchParams.get('accept-language'),'zh');assert.equal(url.searchParams.get('limit'),'5');
      assert.match((init?.headers as Record<string,string>)['User-Agent'],/mySex/);assert.equal(init?.cache,'force-cache');
      return Response.json([{display_name:'12 Example Road, Town',lat:'40.7',lon:'-74'}]);
    };
    assert.deepEqual(await searchAddresses(free,' 12 Example Road ','zh'),{places:[{label:'12 Example Road, Town',latitude:40.7,longitude:-74}]});
    assert.deepEqual(await searchAddresses(free,'ab','en'),{error:'invalid'});assert.deepEqual(await searchAddresses(free,'x'.repeat(201),'en'),{error:'invalid'});assert.equal(calls,1);
    const busy=(async()=>[]) as unknown as NeonQueryFunction<false,false>;
    assert.deepEqual(await searchAddresses(busy,'12 Example Road','en'),{error:'busy'});assert.equal(calls,1);
  } finally {globalThis.fetch=original;}
});
test('empty matches, provider throttling, invalid responses and timeouts remain distinct from successful search',async()=>{
  const original=globalThis.fetch;
  try {
    globalThis.fetch=async()=>Response.json([]);assert.deepEqual(await searchAddresses(free,'Example Road','en'),{places:[]});
    globalThis.fetch=async()=>new Response(null,{status:429});assert.deepEqual(await searchAddresses(free,'Example Road','en'),{error:'busy'});
    globalThis.fetch=async()=>Response.json({error:'bad response'});assert.deepEqual(await searchAddresses(free,'Example Road','en'),{error:'unavailable'});
    globalThis.fetch=async()=>{throw new Error('timeout');};assert.deepEqual(await searchAddresses(free,'Example Road','en'),{error:'unavailable'});
  } finally {globalThis.fetch=original;}
});
