import assert from 'node:assert/strict';
import { test } from 'node:test';
import {homeHeadline} from './home-headline.ts';
import {zh} from './i18n/zh.ts';
const session=(startedAt:string,kind:'intercourse'|'oral'='intercourse',status:'done'|'active'='done')=>({startedAt,kind,status});
const headline=(sessions:ReturnType<typeof session>[])=>homeHeadline(sessions,'2026-11-04','America/New_York');
test('Home reflects gaps in intercourse records without treating oral or future records as recent intercourse',()=>{
 assert.deepEqual(headline([]),{state:'first',daysSince:null});
 assert.deepEqual(headline([session('2026-10-01T15:00:00Z'),session('2026-11-04T15:00:00Z','oral'),session('2027-01-01T15:00:00Z'),session('invalid')]),{state:'longBreak',daysSince:34});
 assert.deepEqual(headline([session('2026-10-28T15:00:00Z')]),{state:'week',daysSince:7});
 assert.deepEqual(headline([session('2026-11-01T15:00:00Z')]),{state:'recent',daysSince:3});
 assert.equal(headline([session('2026-10-01T15:00:00Z'),session('2026-11-04T15:00:00Z','oral','active')]).state,'recording');
});
test('Home uses local calendar dates, handles unsorted records and counts distinct intercourse days for rhythm',()=>{
 assert.deepEqual(headline([session('2026-11-04T02:00:00Z')]),{state:'yesterday',daysSince:1});
 assert.deepEqual(headline([session('2026-11-04T06:00:00Z')]),{state:'today',daysSince:0});
 assert.deepEqual(headline([session('2026-11-02T15:00:00Z'),session('2026-10-31T15:00:00Z'),session('2026-11-01T15:00:00Z')]),{state:'rhythm',daysSince:2});
 assert.equal(headline(Array.from({length:3},()=>session('2026-11-02T15:00:00Z'))).state,'recent');
 for(const title of ['A moment for two.','Your story starts here.','Today’s spark.','Keep the spark alive.','Finding your rhythm.','Make room for each other.','Ready to reconnect?','It’s been a while.'])assert(zh[title]);
});
