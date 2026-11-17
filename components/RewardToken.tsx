'use client';

import {Camera,Coins,Crown,Gift,Heart,Sparkles,Ticket,type LucideIcon} from 'lucide-react';

export const REWARD_ICONS = ['gift','ticket','sparkles','camera','coins','heart','crown'] as const;
export type RewardIcon = typeof REWARD_ICONS[number];
const icons:Record<RewardIcon,LucideIcon>={gift:Gift,ticket:Ticket,sparkles:Sparkles,camera:Camera,coins:Coins,heart:Heart,crown:Crown};
const colors:Record<RewardIcon,string>={gift:'from-rose/25 to-plum/20 text-rose-2',ticket:'from-ovulation/25 to-plum/20 text-ovulation',sparkles:'from-luteal/20 to-rose/15 text-luteal',camera:'from-follicular/20 to-ovulation/15 text-follicular',coins:'from-luteal/25 to-plum/15 text-luteal',heart:'from-rose/25 to-menstrual/15 text-rose-2',crown:'from-luteal/25 to-ovulation/20 text-luteal'};
export function RewardToken({icon='gift',small=false}:{icon?:string;small?:boolean}){
  const key=REWARD_ICONS.includes(icon as RewardIcon)?icon as RewardIcon:'gift';
  const Icon=icons[key];
  return <span aria-hidden="true" className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-white/10 bg-gradient-to-br shadow-[inset_0_1px_0_#ffffff12] ${colors[key]} ${small?'h-10 w-10 rounded-2xl':'h-16 w-16 rounded-[22px]'}`}><span className="absolute -right-2 -top-3 h-10 w-10 rounded-full bg-white/10 blur-xl"/><Icon size={small?19:29} strokeWidth={1.5} className="relative"/></span>;
}
