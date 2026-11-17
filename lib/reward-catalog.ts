// i18n:begin
export const REWARD_CATALOG=[
 ['contribution','Money','coins'],['photos','Delete ugly photos','camera'],['protection','Raw pass','ticket'],['custom','Something else','gift']
] as const;
// i18n:end
export function catalogReward(value:{catalogKey?:string;title:string;details:string;icon?:string;amount?:number;currency?:string}){
 const choice=REWARD_CATALOG.find(c=>c[0]===value.catalogKey);
 const money=choice?.[0]==='contribution';
 return {title:money?`Money contribution · ${value.currency??'USD'} ${(value.amount??0).toFixed(2)}`:choice&&choice[0]!=='custom'?choice[1]:value.title,details:value.details,icon:choice?.[2]??'gift'};
}
export function rewardLabel(title:string,t:(key:string)=>string){return title.startsWith('Money contribution · ')?t('Money contribution')+title.slice('Money contribution'.length):t(title);}
