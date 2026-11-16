import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {PGlite} from '@electric-sql/pglite';
import type {NeonQueryFunction} from '@neondatabase/serverless';
import {storePeriodNotStarted} from './period-status.ts';
const pg = new PGlite();
type Statement = { text: string; values: unknown[] };
const tag = (parts: TemplateStringsArray, ...values: unknown[]): Statement => ({
  text: parts.reduce((s, part, i) => s + (i ? `$${i}` : '') + part, ''), values,
});
const client = Object.assign(async (parts: TemplateStringsArray, ...values: unknown[]) => {
  const q = tag(parts, ...values);
  return (await pg.query(q.text, q.values)).rows;
}, {
  transaction: async (queries: (tx: typeof tag) => Statement[]) => pg.transaction(async (tx) => {
    const results = [];
    for (const q of queries(tag)) results.push((await tx.query(q.text, q.values)).rows);
    return results;
  }),
}) as unknown as NeonQueryFunction<false, false>;

test('period confirmation persists, preserves check-ins, undoes only self and rejects actual bleeding', async () => {
  try {
    const schema=await readFile(new URL('../db/schema.sql',import.meta.url),'utf8');
    await pg.exec(schema);await pg.exec(schema);
    await pg.exec("insert into profiles(user_id,name,invite_code) values ('her','Her','HER'),('him','Him','HIM')");
    const couple='10000000-0000-4000-8000-000000000001';
    await pg.query("insert into couples(id,male_id,female_id) values ($1,'him','her')",[couple]);
    await pg.query("insert into daily_logs(user_id,couple_id,log_date,mood,energy,note,symptoms) values ('her',$1,'2026-10-29','happy',4,'Keep this',array['cramps'])",[couple]);
    assert(await storePeriodNotStarted(client,couple,'her','2026-10-29',true));
    assert(await storePeriodNotStarted(client,couple,'her','2026-10-29',true));
    const saved=(await pg.query('select * from daily_logs')).rows[0] as {period_not_started:boolean;mood:string;energy:number;note:string;symptoms:string[]};
    assert.equal(saved.period_not_started,true);assert.equal(saved.note,'Keep this');assert.equal(saved.mood,'happy');assert.equal(saved.energy,4);assert.deepEqual(saved.symptoms,['cramps']);
    await storePeriodNotStarted(client,couple,'him','2026-10-29',false);
    assert.equal((await pg.query<{period_not_started:boolean}>("select period_not_started from daily_logs where user_id='her'")).rows[0].period_not_started,true);
    await storePeriodNotStarted(client,couple,'her','2026-10-29',false);
    assert.equal((await pg.query<{period_not_started:boolean}>("select period_not_started from daily_logs where user_id='her'")).rows[0].period_not_started,false);
    assert(await storePeriodNotStarted(client,couple,'her','2026-10-30',true));
    await pg.query("insert into periods(user_id,couple_id,start_date,end_date) values ('her',$1,'2026-10-31','2026-11-04')",[couple]);
    assert.equal(await storePeriodNotStarted(client,couple,'her','2026-11-01',true),false);
    assert.equal((await pg.query("select * from periods")).rows.length,1);
  } finally {await pg.close();}
});
