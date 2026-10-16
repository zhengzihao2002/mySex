export type Sex = 'male' | 'female';

export type Profile = {
  userId: string;
  name: string;
  sex: Sex | null;
  inviteCode: string;
  coupleId: string | null;
  avatar: string;
  cycleLengthDefault: number;
  periodLengthDefault: number;
  adultConsentAt: string | null;
};

export type Couple = {
  id: string;
  maleId: string;
  femaleId: string;
  anniversary: string | null;
  createdAt: string;
};

export type CoupleContext = {
  me: Profile;
  partner: Profile;
  couple: Couple;
  her: Profile;
  him: Profile;
};

export type SexSession = {
  id: string;
  createdBy: string;
  status: 'active' | 'done';
  startedAt: string;
  endedAt: string | null;
  pausedAt: string | null;
  pausedSec: number;
  durationSec: number | null;
  ip: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  geoSource: 'ip' | 'gps' | null;
  place: string | null;
  rating: number | null;
  protection: string | null;
  hisOrgasms: number | null;
  herOrgasms: number | null;
  tags: string[];
  notes: string | null;
  updatedAt: string;
};

export type Period = { id: string; start: string; end: string | null };

export type DailyLog = {
  userId: string;
  date: string;
  mood: string | null;
  energy: number | null;
  libido: number | null;
  flow: 'spotting' | 'light' | 'medium' | 'heavy' | null;
  symptoms: string[];
  note: string | null;
};

export type LoveNote = {
  id: string;
  fromUser: string;
  body: string;
  kind: 'note' | 'wish' | 'tease';
  readAt: string | null;
  createdAt: string;
};

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Auth actions can also ask the form to switch to the "enter the emailed code" step. */
export type AuthResult = ActionResult | { ok: false; error?: string; verify: string };
