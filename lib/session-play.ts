import {ACTIVITY_GROUPS,INTERCOURSE_POSITIONS} from './activity-details.ts';
export const TIMER_PROMPTS = [...INTERCOURSE_POSITIONS,'69'] as const;
export function nextPrompt(previous: number, random = Math.random, positions = true) {
  const oral=new Set(ACTIVITY_GROUPS.oral.find(g=>g.key==='positions')!.tags);
  const choices = TIMER_PROMPTS.map((_,i)=>i).filter(i=>i!==previous && (positions?TIMER_PROMPTS[i]!=='69':oral.has(TIMER_PROMPTS[i])));
  return choices[Math.min(choices.length-1,Math.floor(random()*choices.length))];
}
export function sessionPersonality(tags: string[]) {
  const has=(...values:string[])=>values.some(v=>tags.includes(v));
  const cards: {emoji:string;label:string}[]=[];
  if(has('Slow & sensual','Spooning','Massage'))cards.push({emoji:'☁️',label:'Cozy'});
  if(has('Roleplay','Lingerie','Mirror'))cards.push({emoji:'🎭',label:'Playful'});
  if(has('Toys','Blindfold','Standing'))cards.push({emoji:'🧭',label:'Adventurous'});
  if(has('Morning','Slow & sensual'))cards.push({emoji:'🌹',label:'Romantic'});
  return cards;
}
