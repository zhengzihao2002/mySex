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
test('Chinese results use Simplified names and remove repeated semicolon aliases without inventing street translations',()=>{
  const result=parseAddressResults([{display_name:'19, Hirth Drive, 新澤西州;新泽西州;紐澤西州, 美國;美国',lat:'40',lon:'-74',address:{country:'美國;美国',country_code:'us'}}],'zh');
  assert.equal(result[0].label,'19 Hirth Drive，新泽西州');
  const named=parseAddressResults([{display_name:'Central Library, 臺北, Taiwan',name:'Central Library',namedetails:{'name:zh-Hans':'中央圖書館'},address:{country:'Taiwan',country_code:'tw'},lat:'25',lon:'121'}],'zh');
  assert.equal(named[0].label,'中央图书馆，台北');
});
test('address results contain only street address, town/city, state and zip',()=>{
  const row={display_name:'19, Hirth Drive, Groveville, Hamilton Township, Mercer County, 新泽西州, 08620, 美国',lat:'40',lon:'-74',address:{house_number:'19',road:'Hirth Drive',hamlet:'Groveville',municipality:'Hamilton Township',county:'Mercer County',state:'新泽西州',postcode:'08620',country:'美国',country_code:'us'}};
  assert.equal(parseAddressResults([row],'zh')[0].label,'19 Hirth Drive，Groveville，新泽西州，08620');
  const english={...row,display_name:'19, Hirth Drive, Groveville, New Jersey, 08620, United States',address:{...row.address,state:'New Jersey'}};
  assert.equal(parseAddressResults([english],'en')[0].label,'19 Hirth Drive, Groveville, New Jersey, 08620');
  const chinese={display_name:'19, 中山路, 臺北, 臺灣',lat:'25',lon:'121',address:{house_number:'19',road:'中山路',city:'臺北'}};
  assert.equal(parseAddressResults([chinese],'zh')[0].label,'中山路19号，台北');
  assert.equal(parseAddressResults([{display_name:'08620, New Jersey, United States',lat:'40',lon:'-74'}],'en')[0].label,'08620, New Jersey, United States');
  assert.deepEqual(parseAddressResults([{display_name:'United States',lat:'40',lon:'-74',address:{country:'United States',country_code:'us'}}],'en'),[]);
});
test('submitted searches send bounded queries and locale to the fixed provider with caching and attribution',async()=>{
  const original=globalThis.fetch;let calls=0;
  try {
    globalThis.fetch=async(input,init)=>{
      calls++;const url=new URL(String(input));assert.equal(url.origin,'https://nominatim.openstreetmap.org');assert.equal(url.pathname,'/search');
      assert.equal(url.searchParams.get('q'),'12 Example Road');assert.equal(url.searchParams.get('accept-language'),'zh-Hans,zh-CN,zh,en');assert.equal(url.searchParams.get('limit'),'5');
      assert.match((init?.headers as Record<string,string>)['User-Agent'],/mySex/);assert.equal(init?.cache,'force-cache');
      return Response.json([{display_name:'12 Example Road, Town',lat:'40.7',lon:'-74'}]);
    };
    assert.deepEqual(await searchAddresses(free,' 12 Example Road ','zh'),{places:[{label:'12 Example Road，Town',latitude:40.7,longitude:-74}]});
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
test('nearby addresses rank first while searches can still return distant matches',async()=>{
  const original=globalThis.fetch;
  try{
    globalThis.fetch=async input=>{
      const url=new URL(String(input));assert.equal(url.searchParams.get('bounded'),'0');assert.ok(url.searchParams.has('viewbox'));assert.equal(url.searchParams.has('countrycodes'),false);
      return Response.json([{display_name:'Distant address',lat:'51.5',lon:'-.1'},{display_name:'Nearby address',lat:'40.71',lon:'-74.01'}]);
    };
    const result=await searchAddresses(free,'Example Road','en',{latitude:40.7,longitude:-74});
    assert.ok('places' in result);assert.deepEqual(result.places.map(p=>p.label),['Nearby address','Distant address']);
  }finally{globalThis.fetch=original;}
});
