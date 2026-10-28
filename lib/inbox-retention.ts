export const INBOX_LIFETIME_MS=7*24*60*60*1000;
export const INBOX_URGENT_MS=24*60*60*1000;
export function inboxTimeLeft(createdAt:string,now:number){return Math.max(0,new Date(createdAt).getTime()+INBOX_LIFETIME_MS-now);}
export function inboxUrgent(createdAt:string,now:number){return inboxTimeLeft(createdAt,now)<=INBOX_URGENT_MS;}
