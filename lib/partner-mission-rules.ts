import {ACTIVITY_GROUPS, INTERCOURSE_POSITIONS} from './activity-details.ts';

export const GOAL_ACTIVITIES = ['intercourse', 'oral', 'either'] as const;
export type GoalActivity = (typeof GOAL_ACTIVITIES)[number];

export type Metric = 'active_minutes' | 'total_minutes' | 'sessions' | 'positions';
export type MissionRule = {
  kind?: GoalActivity;
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

const oralPositions = new Set<string>(ACTIVITY_GROUPS.oral.find(g=>g.key==='positions')!.tags);
const positions = new Set<string>(INTERCOURSE_POSITIONS);
const positionLimits: Record<GoalActivity, number> = {
  intercourse: positions.size,
  oral: oralPositions.size,
  either: new Set([...positions, ...oralPositions]).size,
};

export function goalPositionLimit(kind: GoalActivity) {
  return positionLimits[kind];
}

const metrics = new Set<string>(['active_minutes', 'total_minutes', 'sessions', 'positions']);

/** Evaluate eligible saved activity inside the agreed window; never count live or pre-acceptance activity. */
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
  const activity = rule.kind ?? 'intercourse';
  const eligible = sessions.filter(session => {
    const matchesActivity = activity === 'either'
      ? session.kind === 'intercourse' || session.kind === 'oral'
      : session.kind === activity;
    const start = Date.parse(session.startedAt);
    const end = session.endedAt === null ? NaN : Date.parse(session.endedAt);
    return session.id.length > 0 && matchesActivity && session.status === 'done' &&
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
      const allowed = session.kind === 'oral' ? oralPositions : positions;
      for (const tag of session.tags) if (allowed.has(tag)) usedPositions.add(tag);
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

export type MissionGoal={dateOnly?:boolean;dailyTargets?:Record<string,number>;perDay?:number;days?:number;timeZone?:string;kind:GoalActivity;metric:Metric;target:number};
export function progressForGoals(rule:MissionRule,goals:MissionGoal[],sessions:MissionSession[],now:Date){
 const checks=goals.map(g=>({...g,...progressForMission({...rule,...g},sessions,now)}));
 const ratio=checks.length?Math.min(...checks.map(g=>g.value/g.target)):0;
 return {value:ratio*rule.target,sessionIds:[...new Set(checks.flatMap(g=>g.sessionIds))],baseComplete:checks.length>0&&checks.every(g=>g.baseComplete),expired:now.getTime()>=Date.parse(rule.endsAt),checks};
}

type AllocationGoal = {
  id: string;
  rule: MissionRule;
  goals: MissionGoal[];
  bonusMultiplier: number | null;
};

export function allocateGoalSessions(
  goals: AllocationGoal[],
  sessions: Array<MissionSession & {createdAt:string}>,
  reservedIds: ReadonlySet<string>,
  now: Date,
) {
  const orderedGoals = [...goals].sort((a,b) =>
    Date.parse(a.rule.endsAt)-Date.parse(b.rule.endsAt) ||
    Date.parse(a.rule.acceptedAt ?? '')-Date.parse(b.rule.acceptedAt ?? '') ||
    a.id.localeCompare(b.id));
  const records = [...sessions].sort((a,b) =>
    Date.parse(a.createdAt)-Date.parse(b.createdAt) ||
    Date.parse(a.startedAt)-Date.parse(b.startedAt) || a.id.localeCompare(b.id));
  const allocated = new Map(goals.map(goal => [goal.id, {
    records: [] as MissionSession[],
    progress: progressForGoals(goal.rule,goal.goals,[],now),
  }]));
  const used = new Set(reservedIds);
  for (const record of records) {
    if (used.has(record.id)) continue;
    const candidates = orderedGoals.flatMap(goal => {
      if (Date.parse(record.createdAt)>Math.min(now.getTime(),Date.parse(goal.rule.endsAt))) return [];
      const current = allocated.get(goal.id)!;
      const multiplier = current.progress.baseComplete ? goal.bonusMultiplier : 1;
      if (!multiplier) return [];
      const remaining = new Map<string,number>();
      for (const condition of current.progress.checks) {
        const amount = condition.target*multiplier-condition.value;
        const key = condition.kind+':'+condition.metric;
        if (amount>0) remaining.set(key,Math.max(amount,remaining.get(key)??0));
      }
      if (!remaining.size || !goal.goals.some(condition =>
        remaining.has(condition.kind+':'+condition.metric) &&
        progressForMission({...goal.rule,...condition},[record],now).value>0)) return [];
      const next = progressForGoals(goal.rule,goal.goals,[...current.records,record],now);
      const advances = next.checks.some((condition,index) =>
        current.progress.checks[index].value<condition.target*multiplier &&
        condition.value>current.progress.checks[index].value);
      if (!advances) return [];
      return [{current,next,remaining,bonus:current.progress.baseComplete,
        finishes:next.checks.every(condition=>condition.value>=condition.target*multiplier)}];
    });
    // Compare requirements only in their own units. Extra unfinished AND
    // conditions make a goal longer when the common requirements are equal.
    const baseCandidates = candidates.filter(candidate=>!candidate.bonus);
    const pool = baseCandidates.length ? baseCandidates : candidates;
    const shortest = pool.filter(candidate=>!pool.some(other=>
      [...other.remaining].every(([key,value])=>value<=(candidate.remaining.get(key)??0)) &&
      (other.remaining.size<candidate.remaining.size ||
        [...other.remaining].some(([key,value])=>value<candidate.remaining.get(key)!))));
    const chosen = shortest.find(candidate=>candidate.finishes) ?? shortest[0];
    if (chosen) {
      chosen.current.records.push(record);
      chosen.current.progress = chosen.next;
      used.add(record.id);
    }
  }
  return new Map([...allocated].map(([id,{progress}])=>[id,progress]));
}
