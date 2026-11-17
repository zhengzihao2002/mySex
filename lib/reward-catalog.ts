// i18n:begin
export const REWARD_CATALOG=[
 ['date','Choose our next date','heart'],['dinner','Dinner treat','gift'],['dessert','Dessert treat','gift'],['coffee','Coffee treat','gift'],['breakfast','Breakfast in bed','gift'],['takeout','Choose the takeout','ticket'],['movie','Movie choice','ticket'],['playlist','Choose the playlist','sparkles'],['outing','Plan a surprise outing','sparkles'],['gift','A small gift','gift'],['flowers','Flowers','heart'],['shopping','Shopping contribution','coins'],['contribution','Money contribution','coins'],['photos','Delete agreed photos','camera'],['photo','Take a favourite photo together','camera'],['chores','Take over a chore','ticket'],['dishes','Do the dishes','ticket'],['laundry','Laundry turn','ticket'],['tidy','Tidy the room','ticket'],['cook','Cook a meal','gift'],['massage','Massage voucher','heart'],['cuddle','Cuddle time','heart'],['kiss','Kiss voucher','heart'],['surprise','A romantic surprise','sparkles'],['choice','Partner’s choice','crown'],['position','Choose a position together','ticket'],['protection','Protection choice pass','ticket'],['costs','Cover agreed contraception costs','coins'],['custom','Something else','gift']
] as const;
// i18n:end
export function catalogReward(value:{catalogKey?:string;title:string;details:string;icon?:string}){
 const choice=REWARD_CATALOG.find(c=>c[0]===value.catalogKey);
 return {title:choice&&choice[0]!=='custom'?choice[1]:value.title,details:value.details,icon:choice?.[2]??'gift'};
}
