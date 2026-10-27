export const TIMER_PROMPTS = [
  'Try a different position: Spooning.', 'Try a different position: Missionary.',
  'Try a different position: Cowgirl.', 'Try a different position: Standing.',
  'Slow the pace together.', 'Take a moment to kiss.', 'Ask your partner what feels good.',
  'Let your partner choose the next position.', 'Pause together and check how you both feel.',
] as const;
export function nextPrompt(previous: number, random = Math.random, positions = true) {
  const choices = TIMER_PROMPTS.map((_,i)=>i).filter(i=>i!==previous && (positions || i>=4));
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
