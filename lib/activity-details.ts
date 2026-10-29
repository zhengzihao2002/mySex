import type {SessionKind} from './types';

export type ActivityGroup={key:string;label:string;emoji:string;tags:readonly string[]};
// i18n:begin
export const INTERCOURSE_POSITIONS=[
  'Missionary','Doggy','Cowgirl','Reverse cowgirl','Spooning','Standing','Side by side','Seated',
  'Lotus','Butterfly','Coital alignment','Prone','Legs raised','Legs over shoulders',
  'Kneeling face to face','Kneeling from behind','Edge of bed','Reverse seated',
  'Side saddle','Scissors','Bridge','Squatting','Standing from behind','Seated leaning back',
] as const;
const pace=['Slow & sensual','Gentle','Teasing','Playful','Eye contact','Quickie'];
const extras=['Toys','Lingerie','Blindfold','Mirror','Roleplay'];

export const ACTIVITY_GROUPS:Record<SessionKind,ActivityGroup[]>={
  intercourse:[
    {key:'positions',label:'Positions',emoji:'🃏',tags:INTERCOURSE_POSITIONS},
    {key:'warmup',label:'Warm-up',emoji:'💋',tags:['Oral (her)','Oral (him)','69','Massage']},
    {key:'pace',label:'Pace & mood',emoji:'🎚️',tags:[...pace,'Rough','Makeup sex']},
    {key:'extras',label:'Extras',emoji:'✨',tags:extras},
    {key:'setting',label:'Setting',emoji:'🌙',tags:['Morning','Shower','Car','Outdoors','Period sex']},
  ],
  oral:[
    {key:'focus',label:'Who received?',emoji:'💞',tags:['Oral (her)','Oral (him)','Taking turns']},
    {key:'positions',label:'Positions',emoji:'🃏',tags:['69','Lying down','Seated','Side by side','Standing']},
    {key:'pace',label:'Pace & mood',emoji:'🎚️',tags:pace},
    {key:'extras',label:'Extras',emoji:'✨',tags:[...extras,'Massage']},
    {key:'setting',label:'Setting',emoji:'🌙',tags:['Morning','Shower','Car','Outdoors']},
  ],
};
// i18n:end

export function tagsForKind(kind:SessionKind){return ACTIVITY_GROUPS[kind].flatMap(group=>group.tags);}

/** New entries use their activity's choices; existing historical labels can be retained explicitly. */
export function activityDetails(kind:SessionKind,d:{tags?:readonly string[];protection?:string|null},preserve:readonly string[]=[]){
  const allowed=new Set([...tagsForKind(kind),...preserve]);
  return {protection:kind==='oral'?null:d.protection??null,tags:[...new Set(d.tags??[])].filter(tag=>allowed.has(tag)).slice(0,20)};
}
