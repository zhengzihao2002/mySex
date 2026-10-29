
'use server';
import {requireCouple} from '@/lib/data';
import type {ActionResult} from '@/lib/types';
/** Compatibility for an already-open old client. Quests can no longer be skipped or accepted. */
export async function changeMission(_input:unknown):Promise<ActionResult>{
  await requireCouple();
  return {ok:false,error:/*i18n*/'Quests now complete automatically from saved records. Refresh to see your progress.'};
}
