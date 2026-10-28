import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mergeSharedProposal,samePin,sharedValues} from './shared-session.ts';
import {inboxTimeLeft,inboxUrgent} from './inbox-retention.ts';
import type {SexSession} from './types';

const s={kind:'intercourse',startedAt:'2026-10-01T10:00:00Z',durationSec:901,pausedSec:31,place:'Home',protection:null,tags:['Kissing'],latitude:40,longitude:-74,city:'Original',region:null,country:'US',rating:4,hisOrgasms:1,herOrgasms:2,notes:null} as SexSession;
const location={latitude:42,longitude:-76,city:'New',region:null,country:'US',gpsNamedAt:null};

test('different fields combine; newest change to the same field replaces its predecessor',()=>{
  const first=mergeSharedProposal(s,null,{location});
  const second=mergeSharedProposal(s,first,{place:'Hotel'});
  const latest=mergeSharedProposal(s,second,{location:{...location,latitude:43,city:'Latest'}})!;
  assert.equal(latest.place,'Hotel');assert.equal(latest.location?.latitude,43);
  assert.equal(latest.durationMin,901/60);assert.equal(latest.breakMin,31/60);
});

test('returning a pin to the original removes only that change; restoring all fields cancels the proposal',()=>{
  let pending=mergeSharedProposal(s,null,{location,place:'Hotel'});
  pending=mergeSharedProposal(s,pending,{location:sharedValues(s).location});
  assert.equal(pending?.location,undefined);assert.equal(pending?.place,'Hotel');
  assert.equal(mergeSharedProposal(s,pending,{place:'Home'}),null);
  assert.equal(mergeSharedProposal(s,null,{location:sharedValues(s).location}),null);
  const withoutPin={...s,latitude:null,longitude:null};
  assert.equal(mergeSharedProposal(withoutPin,mergeSharedProposal(withoutPin,null,{location}),{location:null}),null);
});

test('map rounding, equivalent timestamps, and reordered tags are not new requests',()=>{
  assert.equal(samePin({latitude:40.0000001,longitude:-74},sharedValues(s).location),true);
  assert.equal(samePin({latitude:40.00001,longitude:-74},sharedValues(s).location),false);
  assert.equal(mergeSharedProposal(s,null,{startedAt:'2026-10-01T06:00:00-04:00',tags:['Kissing']}),null);
});

test('seven-day expiry and the final 24-hour urgent state cover the boundary',()=>{
  const created='2026-10-01T00:00:00Z',day=86400000;
  assert.equal(inboxUrgent(created,Date.parse(created)+6*day-1),false);
  assert.equal(inboxUrgent(created,Date.parse(created)+6*day),true);
  assert.equal(inboxTimeLeft(created,Date.parse(created)+7*day),0);
});
