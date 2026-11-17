import {INTERCOURSE_POSITIONS} from './activity-details.ts';

export type Metric = 'active_minutes' | 'total_minutes' | 'sessions' | 'positions';
export type MissionRule = {
  metric: Metric;
  target: number;
  startsAt: string;
  endsAt: string;
  acceptedAt: string | null;
};
export type MissionSession = {
  id: string;
  kind: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  durationSec: number | null;
  pausedSec: number;
  tags: string[];
};
export type MissionProgress = {
  value: number;
  sessionIds: string[];
  baseComplete: boolean;
  expired: boolean;
};

const positions = new Set<string>(INTERCOURSE_POSITIONS);
const metrics = new Set<string>(['active_minutes', 'total_minutes', 'sessions', 'positions']);

/** Evaluate saved intercourse inside the agreed window; never count live or pre-acceptance activity. */
export function progressForMission(rule: MissionRule, sessions: MissionSession[], now: Date): MissionProgress {
  const nowAt = now.getTime();
  const startsAt = Date.parse(rule.startsAt);
  const endsAt = Date.parse(rule.endsAt);
  const acceptedAt = rule.acceptedAt === null ? NaN : Date.parse(rule.acceptedAt);
  const expired = Number.isFinite(nowAt) && Number.isFinite(endsAt) && nowAt >= endsAt;
  const empty: MissionProgress = {value: 0, sessionIds: [], baseComplete: false, expired};
  if (!Number.isFinite(nowAt) || !Number.isFinite(startsAt) || !Number.isFinite(endsAt) ||
      !Number.isFinite(acceptedAt) || endsAt <= startsAt || acceptedAt >= endsAt ||
      !Number.isFinite(rule.target) || rule.target <= 0 || !metrics.has(rule.metric)) return empty;

  const from = Math.max(startsAt, acceptedAt);
  const through = Math.min(nowAt, endsAt);
  const eligible = sessions.filter(session => {
    const start = Date.parse(session.startedAt);
    const end = session.endedAt === null ? NaN : Date.parse(session.endedAt);
    return session.id.length > 0 && session.kind === 'intercourse' && session.status === 'done' &&
      Number.isFinite(start) && Number.isFinite(end) && end >= start && start >= from && start < endsAt && end <= through &&
      session.durationSec !== null && Number.isFinite(session.durationSec) && session.durationSec >= 0 &&
      Number.isFinite(session.pausedSec) && session.pausedSec >= 0;
  }).sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt) || a.id.localeCompare(b.id));

  const seen = new Set<string>();
  const usedPositions = new Set<string>();
  const sessionIds: string[] = [];
  let value = 0;
  let seconds = 0;
  for (const session of eligible) {
    if (seen.has(session.id)) continue;
    seen.add(session.id);
    // For position goals, proof should contain only records that add a position.
    if (rule.metric === 'positions') {
      const before = usedPositions.size;
      for (const tag of session.tags) if (positions.has(tag)) usedPositions.add(tag);
      if (usedPositions.size > before) sessionIds.push(session.id);
      continue;
    }
    sessionIds.push(session.id);
    if (rule.metric === 'active_minutes') seconds += session.durationSec!;
    else if (rule.metric === 'total_minutes') seconds += session.durationSec! + session.pausedSec;
    else value += 1;
  }
  if (rule.metric === 'positions') value = usedPositions.size;
  else if (rule.metric === 'active_minutes' || rule.metric === 'total_minutes') value = seconds / 60;
  return {value, sessionIds, baseComplete: value >= rule.target, expired};
}
