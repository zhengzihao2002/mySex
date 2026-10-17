import type { Phase } from './cycle';

// All display strings below are English keys; the UI translates them with t() (see lib/i18n/zh.ts).
// i18n:begin

// Phase colors validated for colour-blind separation on the dark surface.
export const PHASES: Record<
  Phase,
  {
    name: string;
    emoji: string;
    color: string;
    tint: string;
    blurb: string;
    hormones: string;
    her: string;
    him: string;
    libido: string;
  }
> = {
  menstrual: {
    name: 'Period',
    emoji: '🩸',
    color: '#e11d48',
    tint: 'rgba(225,29,72,0.22)',
    blurb: 'The uterine lining sheds. Energy dips, cramps and cravings are common.',
    hormones: 'Estrogen & progesterone at their lowest.',
    her: 'Heat pad, iron-rich snacks, slow orgasms are a legit cramp reliever.',
    him: 'Be the hot-water-bottle guy. Chocolate, back rubs, zero complaining. Shower sex if she’s into it.',
    libido: 'Mixed — some feel extra frisky, others want cuddles only. Ask, don’t assume.',
  },
  follicular: {
    name: 'Follicular',
    emoji: '🌱',
    color: '#0d9488',
    tint: 'rgba(13,148,136,0.20)',
    blurb: 'A new egg matures. Estrogen climbs — mood, skin and confidence glow up.',
    hormones: 'Estrogen rising, FSH active.',
    her: 'Great time to try something new — energy and adventurousness are climbing.',
    him: 'She’s warming up. Plan a date, flirt all day, suggest that thing on your Yes list.',
    libido: 'Rising steadily. Teasing pays off.',
  },
  ovulation: {
    name: 'Ovulation',
    emoji: '🔥',
    color: '#7c3aed',
    tint: 'rgba(124,58,237,0.24)',
    blurb: 'An egg is released. Peak fertility — and usually peak horniness.',
    hormones: 'LH surge, estrogen peaks, a little testosterone bump.',
    her: 'Peak sex drive. Also peak fertility — protect accordingly if you’re not trying.',
    him: 'Her desire is at its peak. Bring your A-game — and a condom unless you want a mini-me.',
    libido: 'Highest of the month 🔥',
  },
  luteal: {
    name: 'Luteal',
    emoji: '🌙',
    color: '#d97706',
    tint: 'rgba(217,119,6,0.20)',
    blurb: 'Progesterone takes over. Bloating, tender breasts and PMS can show up near the end.',
    hormones: 'Progesterone high, estrogen dips then falls.',
    her: 'Cozy, slow sex and lots of foreplay. Magnesium and sleep help with PMS.',
    him: 'Extra patience and extra foreplay. Snacks are foreplay too. Don’t touch the boobs without asking — they may be sore.',
    libido: 'Gradually cooling; intimacy over intensity.',
  },
};

export const PREGNANCY_CHANCE = {
  low: { label: 'Low', color: '#0d9488' },
  medium: { label: 'Medium', color: '#d97706' },
  high: { label: 'High', color: '#e11d48' },
} as const;

export const MOODS = [
  { key: 'horny', emoji: '😈', label: 'Horny' },
  { key: 'flirty', emoji: '😏', label: 'Flirty' },
  { key: 'happy', emoji: '😊', label: 'Happy' },
  { key: 'loved', emoji: '🥰', label: 'Loved' },
  { key: 'chill', emoji: '😌', label: 'Chill' },
  { key: 'tired', emoji: '😴', label: 'Tired' },
  { key: 'stressed', emoji: '😩', label: 'Stressed' },
  { key: 'sad', emoji: '🥺', label: 'Needy' },
  { key: 'grumpy', emoji: '😤', label: 'Grumpy' },
] as const;

export const SYMPTOMS = [
  'Cramps',
  'Bloating',
  'Headache',
  'Tender breasts',
  'Acne',
  'Back pain',
  'Cravings',
  'Mood swings',
  'Fatigue',
  'Discharge',
  'Insomnia',
  'Nausea',
] as const;

export const FLOWS = ['spotting', 'light', 'medium', 'heavy'] as const;

export const PROTECTION = [
  { key: 'condom', label: 'Condom', emoji: '🎈' },
  { key: 'pill', label: 'Pill / IUD', emoji: '💊' },
  { key: 'pullout', label: 'Pull-out', emoji: '🏃' },
  { key: 'none', label: 'Raw', emoji: '😳' },
  { key: 'na', label: 'No PIV', emoji: '👅' },
] as const;

export const TAGS = [
  'Missionary',
  'Doggy',
  'Cowgirl',
  'Reverse cowgirl',
  'Spooning',
  'Standing',
  '69',
  'Oral (her)',
  'Oral (him)',
  'Toys',
  'Quickie',
  'Morning',
  'Shower',
  'Car',
  'Outdoors',
  'Roleplay',
  'Rough',
  'Slow & sensual',
  'Makeup sex',
  'Period sex',
  'Lingerie',
  'Blindfold',
  'Massage',
  'Mirror',
] as const;

export const HEAT = ['Meh', 'Nice', 'Hot', 'Steamy', 'Mind-blowing'] as const;

// Yes / No / Maybe list. Partners answer privately; only overlaps are revealed.
export const DESIRES: { group: string; items: string[] }[] = [
  {
    group: 'Warm-up',
    items: ['Sexting during the day', 'Naked massage', 'Strip tease', 'Making out like teenagers', 'Shower together', 'Dirty talk'],
  },
  {
    group: 'Positions & places',
    items: ['Sex in the car', 'Sex outdoors', 'Hotel weekend', 'In front of a mirror', 'Kitchen counter', 'Standing against the wall', 'Morning sex', 'Quickie before going out'],
  },
  {
    group: 'Spice',
    items: ['Blindfold', 'Light bondage', 'Spanking', 'Hair pulling', 'Role-play', 'Toys together', 'Edging', 'Ice / wax play', 'Choking (with safe word)', 'Lingerie show', 'Filming (never shared)', 'Phone sex / video call'],
  },
  {
    group: 'Oral & more',
    items: ['69', 'Face sitting', 'Swallowing', 'Butt play', 'Anal', 'Multiple rounds in one night', 'Period sex'],
  },
];

export const DARES = [
  'Kiss every inch of their neck — slowly. No hands allowed.',
  'Undress them using only your teeth.',
  'Blindfold them for 5 minutes and tease with your fingertips.',
  'Whisper the dirtiest thing you’ve thought about them today.',
  'Give a 3-minute massage that ends wherever they point.',
  'They choose the position. You aren’t allowed to argue.',
  'Edge them twice before they’re allowed to finish.',
  'Recreate your hottest night from memory — in reverse order.',
  'Strip down one item at a time to a song of their choice.',
  'No talking for 10 minutes — only touch.',
  'Take a shower together and wash every part of them.',
  'Try a position neither of you has tried before.',
  'Tie their hands (gently) and take control for 10 minutes.',
  'Lick something sweet off a place of their choosing.',
  'Make out like it’s your first date for 5 whole minutes. Clothes stay on.',
  'Tell them exactly what you want, in detail, before you touch them.',
  'Pick a room you’ve never done it in. Go.',
  'Let them use any toy on you for 5 minutes.',
  'Ice cube trail from lips to wherever it melts.',
  'Rate their best move ever — then ask for an encore.',
];

export const NOTE_KINDS = {
  note: { label: 'Love note', emoji: '💌' },
  wish: { label: 'Tonight I want…', emoji: '😈' },
  tease: { label: 'Tease', emoji: '🔥' },
} as const;

export const AVATARS = ['💋', '😈', '🍑', '🍆', '🔥', '🌶️', '💦', '🦊', '🐻', '🐰', '👑', '🌹', '💜', '🖤', '😇', '🥂'];

// i18n:end

export function flagEmoji(cc: string | null | undefined) {
  if (!cc || cc.length !== 2) return '📍';
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}
