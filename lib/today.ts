import 'server-only';
import { cookies } from 'next/headers';
import { dayInTz, safeTz } from './tz';

export async function getTz() {
  return safeTz((await cookies()).get('tz')?.value);
}

export async function getToday() {
  const tz = await getTz();
  return { tz, today: dayInTz(new Date(), tz) };
}
