import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nextPrompt,TIMER_PROMPTS,sessionPersonality} from './session-play.ts';
test('shuffle never immediately repeats the previous prompt',()=>{for(let i=-1;i<TIMER_PROMPTS.length;i++)for(const seed of [0,.25,.5,.999]){const n=nextPrompt(i,()=>seed);assert.notEqual(n,i);assert.ok(n>=0&&n<TIMER_PROMPTS.length)}});
test('personality derives from explicit tags and does not invent feelings',()=>{assert.deepEqual(sessionPersonality([]),[]);assert.deepEqual(sessionPersonality(['Massage']).map(c=>c.label),['Cozy']);assert.ok(sessionPersonality(['Roleplay']).some(c=>c.label==='Playful'))});

test('oral compatibility is based on labels rather than fragile array offsets',()=>{for(const seed of [0,.25,.5,.999])assert.ok(['Standing','Side by side','Seated','69'].includes(TIMER_PROMPTS[nextPrompt(-1,()=>seed,false)]))});

test('every expanded intercourse position is reachable without recommending oral-only 69',()=>{const seen=new Set(Array.from({length:24},(_,i)=>TIMER_PROMPTS[nextPrompt(-1,()=>(i+.5)/24)]));assert.equal(seen.size,24);assert.ok(seen.has('Lotus'));assert.ok(seen.has('Seated leaning back'));assert.ok(!seen.has('69'));});
