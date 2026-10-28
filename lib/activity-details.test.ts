import assert from 'node:assert/strict';
import {test} from 'node:test';
import {ACTIVITY_GROUPS,activityDetails,tagsForKind} from './activity-details.ts';
import {TAGS} from './content.ts';
import {mergeSharedProposal} from './shared-session.ts';
import type {SexSession} from './types';

test('the grouped intercourse library retains every original choice without duplicated controls',()=>{
  const tags=tagsForKind('intercourse');
  assert.equal(new Set(tags).size,tags.length);
  for(const tag of TAGS)assert.ok(tags.includes(tag),tag);
  assert.ok(tags.includes('Side by side'));assert.ok(tags.includes('Seated'));
  const oral=tagsForKind('oral');assert.equal(new Set(oral).size,oral.length);
  assert.ok(!oral.includes('Missionary'));assert.ok(oral.includes('Taking turns'));
  assert.ok(ACTIVITY_GROUPS.oral.some(g=>g.label==='Who received?'));
});

test('new oral records cannot save protection or incompatible positions; shared choices remain',()=>{
  assert.deepEqual(activityDetails('oral',{protection:'condom',tags:['Missionary','Taking turns','Massage','Seated','Massage']}),{protection:null,tags:['Taking turns','Massage','Seated']});
  assert.deepEqual(activityDetails('intercourse',{protection:'condom',tags:['Missionary','Taking turns','Massage']}),{protection:'condom',tags:['Missionary','Massage']});
});

test('a type correction includes its dependent cleanup in the proposal while historical data stays intact',()=>{
  const s={kind:'intercourse',startedAt:'2026-10-01T10:00:00Z',durationSec:600,pausedSec:0,place:null,protection:'condom',tags:['Missionary','Massage'],latitude:null,longitude:null,rating:4,hisOrgasms:1,herOrgasms:2,notes:null} as SexSession;
  const proposal=mergeSharedProposal(s,null,{kind:'oral'})!;
  assert.equal(proposal.kind,'oral');assert.equal(proposal.protection,null);assert.deepEqual(proposal.tags,['Massage']);
  assert.deepEqual(s.tags,['Missionary','Massage']);assert.equal(s.protection,'condom');
  assert.equal(mergeSharedProposal(s,proposal,{kind:s.kind,tags:s.tags,protection:s.protection}),null);
  const legacy={...s,kind:'oral' as const,tags:['Custom legacy label','Missionary']};
  assert.equal(mergeSharedProposal(legacy,null,{}),null);
  assert.deepEqual(mergeSharedProposal(legacy,null,{tags:[...legacy.tags,'Taking turns']})?.tags,['Custom legacy label','Missionary','Taking turns']);
  const away=mergeSharedProposal(legacy,null,{kind:'intercourse'})!;
  assert.equal(mergeSharedProposal(legacy,away,{kind:'oral',tags:legacy.tags,protection:legacy.protection}),null);
});
