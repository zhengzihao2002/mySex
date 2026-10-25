import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getGps } from './gps.ts';
import { sessionLocation } from './session-location.ts';

test('GPS requests a fresh high-accuracy fix and retains zero coordinates', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  try {
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:{geolocation:{getCurrentPosition(success:PositionCallback,_failure:PositionErrorCallback,options:PositionOptions){
      assert.equal(options.enableHighAccuracy,true);assert.equal(options.maximumAge,0);
      success({coords:{latitude:0,longitude:0}} as GeolocationPosition);
    }}}});
    assert.deepEqual(await getGps(),{latitude:0,longitude:0});
  } finally { if(original)Object.defineProperty(globalThis,'navigator',original);else Reflect.deleteProperty(globalThis,'navigator'); }
});
test('permission denial, timeout, unavailable GPS and invalid coordinates reject instead of silently falling back',async()=> {
  const original = Object.getOwnPropertyDescriptor(globalThis,'navigator');
  try {
    for (const [code,message] of [[1,/permission is blocked/],[2,/location services/],[3,/timed out/]] as const) {
      Object.defineProperty(globalThis,'navigator',{configurable:true,value:{geolocation:{getCurrentPosition(_s:PositionCallback,f:PositionErrorCallback){f({code} as GeolocationPositionError)}}}});
      await assert.rejects(getGps(),message);
    }
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:{}});
    await assert.rejects(getGps(),/unavailable in this browser/);
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:{geolocation:{getCurrentPosition(s:PositionCallback){s({coords:{latitude:NaN,longitude:10}} as GeolocationPosition)}}}});
    await assert.rejects(getGps(),/valid GPS position/);
  } finally { if(original)Object.defineProperty(globalThis,'navigator',original);else Reflect.deleteProperty(globalThis,'navigator'); }
});
test('saving uses GPS pin instead of network pin; IP-only and disabled recording retain their behavior',()=> {
  const network={ip:'192.0.2.1',city:'Network city',region:null,country:'US',latitude:40,longitude:-70};
  assert.deepEqual(sessionLocation(network,true,{latitude:0,longitude:0}),{...network,city:null,region:null,country:null,latitude:0,longitude:0,source:'gps'});
  assert.deepEqual(sessionLocation(network,true),{...network,source:'ip'});
  assert.deepEqual(sessionLocation(network,false,{latitude:0,longitude:0}),{ip:null,city:null,region:null,country:null,latitude:null,longitude:null,source:null});
});
