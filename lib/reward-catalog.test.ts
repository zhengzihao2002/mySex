import {test} from 'node:test';
import assert from 'node:assert/strict';
import {REWARD_CATALOG,catalogReward} from './reward-catalog.ts';
test('preset labels and icons are assigned by system while restrictions remain user supplied',()=>{
 assert(REWARD_CATALOG.some(item=>item[0]==='protection'));
 assert.deepEqual(catalogReward({catalogKey:'photos',title:'Spoofed name',icon:'crown',details:'Only mutually selected photos'}),{title:'Delete agreed photos',icon:'camera',details:'Only mutually selected photos'});
 assert.deepEqual(catalogReward({catalogKey:'custom',title:'Our own reward',icon:'coins',details:'Ask before use'}),{title:'Our own reward',icon:'gift',details:'Ask before use'});
});

test('money labels include a real amount and currency; raw pass stays available',()=>{
 assert.equal(catalogReward({catalogKey:'contribution',title:'ignored',details:'Only after agreement',amount:50,currency:'USD'}).title,'Money contribution · USD 50.00');
 assert.equal(catalogReward({catalogKey:'protection',title:'',details:'Partner provides contraception'}).title,'Raw pass');
});
