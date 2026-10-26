import { dayInTz } from './tz.ts';
import type { Achievement } from './achievements';
import type { SexSession, DailyLog, LoveNote } from './types';

/** Story badges use explicit tags and recorded events, never guesses about consent or feelings. */
export function storyAchievements(sessions: SexSession[], tz: string, activity: { logs: DailyLog[]; notes: LoveNote[] }): Achievement[] {
  const done = sessions.filter(s => s.status === 'done').sort((a,b) => Date.parse(a.startedAt)-Date.parse(b.startedAt));
  const combo = (...tags: string[]) => done.some(s => tags.every(tag => s.tags.includes(tag)));
  const place = (s: SexSession) => s.place?.trim().toLocaleLowerCase() || null;
  let homecoming = false;
  let encore = false;
  const seen = new Map<string, { day: string; signature: string }[]>();
  let previousPlace: string | null = null;
  for (const s of done) {
    const p = place(s);
    if (!p) continue;
    const day = dayInTz(s.startedAt,tz);
    const earlier = seen.get(p) ?? [];
    const signature = `${s.kind}:${[...new Set(s.tags)].sort().join('|')}`;
    if (earlier.some(e => e.day !== day)) {
      if (previousPlace && previousPlace !== p) homecoming = true;
      if (s.tags.length && earlier.some(e => e.day !== day && e.signature === signature)) encore = true;
    }
    seen.set(p,[...earlier,{day,signature}]);
    previousPlace = p;
  }
  const pairedLogs = new Map<string, DailyLog[]>();
  for (const l of activity.logs) pairedLogs.set(l.date,[...(pairedLogs.get(l.date) ?? []),l]);
  const pairMatches = (predicate: (a:DailyLog,b:DailyLog)=>boolean) => [...pairedLogs.values()].some(logs =>
    logs.some((a,i) => logs.slice(i+1).some(b => a.userId !== b.userId && predicate(a,b))));
  const noteDays = new Map<string, Set<string>>();
  for (const n of activity.notes.filter(n => n.kind === 'note')) {
    const day = dayInTz(n.createdAt,tz);
    const authors = noteDays.get(day) ?? new Set<string>();
    authors.add(n.fromUser); noteDays.set(day,authors);
  }
  const add = (key:string,emoji:string,title:string,desc:string,unlocked:boolean):Achievement => ({key,emoji,title,desc,unlocked,collection:'stories'});
  return [
    add('spa-night','🛁',/*i18n*/ 'Spa night',/*i18n*/ 'Tag a session with Massage and Slow & sensual.',combo('Massage','Slow & sensual')),
    add('dress-rehearsal','🎭',/*i18n*/ 'Dress rehearsal',/*i18n*/ 'Combine Lingerie and Roleplay in a session.',combo('Lingerie','Roleplay')),
    add('pillow-fort','🛌',/*i18n*/ 'Pillow fort',/*i18n*/ 'Combine Spooning and Slow & sensual in a session.',combo('Spooning','Slow & sensual')),
    add('velvet-morning','🌤️',/*i18n*/ 'Velvet morning',/*i18n*/ 'Combine Morning and Slow & sensual in a session.',combo('Morning','Slow & sensual')),
    add('mirrorball','🪩',/*i18n*/ 'Mirrorball',/*i18n*/ 'Combine Mirror and Lingerie in a session.',combo('Mirror','Lingerie')),
    add('sensory-remix','🫧',/*i18n*/ 'Sensory remix',/*i18n*/ 'Combine Blindfold and Massage in a session.',combo('Blindfold','Massage')),
    add('midnight-chapter','🌙',/*i18n*/ 'Midnight chapter',/*i18n*/ 'Save a session that starts before midnight and ends on a later local date.',done.some(s => s.endedAt && Date.parse(s.endedAt)>Date.parse(s.startedAt) && dayInTz(s.endedAt,tz)!==dayInTz(s.startedAt,tz))),
    add('homecoming','🏡',/*i18n*/ 'Homecoming',/*i18n*/ 'Return to a named place on a different day after recording somewhere else.',homecoming),
    add('encore-scene','🎬',/*i18n*/ 'Encore scene',/*i18n*/ 'Revisit a named place on another day with the same session kind and nonempty tag combination.',encore),
    add('plot-twist','📜',/*i18n*/ 'Plot twist',/*i18n*/ 'Save a Roleplay session with a personal note about the memory.',done.some(s => s.tags.includes('Roleplay') && !!s.notes?.trim())),
    add('paper-planes','🕊️',/*i18n*/ 'Paper planes',/*i18n*/ 'Both partners send a love note on the same local date.',[...noteDays.values()].some(authors => authors.size>=2)),
    add('same-wavelength','📻',/*i18n*/ 'Same wavelength',/*i18n*/ 'Both partners record the same mood on the same day.',pairMatches((a,b)=>!!a.mood && a.mood===b.mood)),
    add('different-pages','📖',/*i18n*/ 'Different pages, same book',/*i18n*/ 'Both partners check in on the same day with different moods. Every mood belongs here.',pairMatches((a,b)=>!!a.mood && !!b.mood && a.mood!==b.mood)),
    add('post-credits','💌',/*i18n*/ 'Post-credits note',/*i18n*/ 'Send a love note within two hours after a saved session ends.',done.some(s => s.endedAt && activity.notes.some(n => n.kind==='note' && Date.parse(n.createdAt)>=Date.parse(s.endedAt!) && Date.parse(n.createdAt)-Date.parse(s.endedAt!)<=2*60*60*1000))),
    add('offline-keepsake','🗝️',/*i18n*/ 'Offline keepsake',/*i18n*/ 'Save a named place and a personal note with location recording off.',done.some(s => !s.geoSource && !s.ip && s.latitude==null && s.longitude==null && !!place(s) && !!s.notes?.trim())),
    add('two-perspectives','🖋️',/*i18n*/ 'Two perspectives',/*i18n*/ 'Both partners add their own written check-in note on the same day.',pairMatches((a,b)=>!!a.note?.trim() && !!b.note?.trim())),
  ];
}
