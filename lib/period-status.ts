import type {NeonQueryFunction} from '@neondatabase/serverless';

/** Change only the daily confirmation, keeping every other check-in field intact. */
export async function storePeriodNotStarted(client: NeonQueryFunction<false,false>, coupleId: string, userId: string, date: string, value: boolean) {
  if (!value) {
    await client`update daily_logs set period_not_started = false, updated_at = now()
      where user_id = ${userId} and log_date = ${date}::date`;
    return true;
  }
  // Share the start-period lock so a concurrent start cannot leave a stale flag.
  const [, rows] = await client.transaction(tx => [
    tx`select pg_advisory_xact_lock(hashtext(${userId}))`,
    tx`insert into daily_logs (user_id, couple_id, log_date, period_not_started)
      select ${userId}, ${coupleId}, ${date}::date, true
      where not exists (select 1 from periods where user_id = ${userId}
        and start_date <= ${date}::date and coalesce(end_date, start_date + 9) >= ${date}::date)
      on conflict (user_id, log_date) do update set period_not_started = true, updated_at = now()
      returning user_id`,
  ]);
  return (rows as unknown[]).length > 0;
}
