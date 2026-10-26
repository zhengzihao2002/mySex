'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, Inbox, RefreshCw } from 'lucide-react';
import { markEditNoticeRead, cancelEditRequest, markEditOutcomeRead, respondToEditRequest, cancelDeletionRequest, markDeletionRequestRead, respondToDeletionRequest } from '@/app/actions';
import { FormError } from '@/components/FormError';
import { useT } from '@/components/I18nProvider';
import { KIND_META } from '@/components/KindPicker';
import { Sheet } from '@/components/Sheet';
import { useTz } from '@/components/TzProvider';
import { useRun } from '@/components/useRun';
import { dayInTz } from '@/lib/tz';
import { PROTECTION } from '@/lib/content';
import type { SessionDeletionRequest, SessionEditNotice, SessionEditRequest } from '@/lib/types';

export function InboxView({ requests, notices, edits, meId, partnerName }: {
  requests: SessionDeletionRequest[]; notices: SessionEditNotice[]; edits: SessionEditRequest[]; meId: string; partnerName: string;
}) {
  const { t } = useT();
  const router = useRouter();
  const [refreshing, refresh] = useTransition();
  const incoming = requests.filter((r) => r.status === 'pending' && r.recipientId === meId);
  const outgoing = requests.filter((r) => r.status === 'pending' && r.requestedBy === meId);
  const history = requests.filter((r) => r.status !== 'pending');
  return (
    <div className="space-y-5 pt-2">
      <header className="flex items-center gap-2">
        <Link href="/home" className="rounded-full bg-surface-2 p-2" aria-label={t('Back')}><ChevronLeft size={20} /></Link>
        <h1 className="font-display flex-1 text-3xl font-bold">{t('Inbox')}</h1>
        <button className="btn-ghost px-3" disabled={refreshing} onClick={() => refresh(() => router.refresh())} aria-label={t('Refresh inbox')}>
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </header>
      <p className="text-sm text-ink-2">{t('Shared sessions are changed or deleted only when both of you agree. Declining keeps the record as it is and notifies the requester.')}</p>
      <p className="text-xs text-ink-3">{t('Handled requests are deleted immediately. Unread replies and edit notices stay until you mark them read, then are deleted from the database.')}</p>
      {!requests.length && !notices.length && !edits.length && (
        <div className="card py-10 text-center text-ink-3">
          <Inbox className="mx-auto mb-3" size={30} />
          <p className="font-semibold text-ink">{t('Your inbox is empty')}</p>
          <p className="mt-1 text-sm">{t('Deletion requests and your partner’s replies will appear here.')}</p>
        </div>
      )}
      {edits.length > 0 && <section className="space-y-3"><h2 className="px-1 text-sm font-semibold text-ink-2">{t('Edit requests')} · {edits.length}</h2>{edits.map(e => <EditRequestCard key={e.id} edit={e} meId={meId} partnerName={partnerName} />)}</section>}
      {notices.length > 0 && <section className="space-y-3"><h2 className="px-1 text-sm font-semibold text-ink-2">{t('Shared record updates')}</h2>{notices.map(n => <EditNotice key={n.id} notice={n} partnerName={partnerName} />)}</section>}
      {[
        { title: t('Needs your agreement'), items: incoming },
        { title: t('Waiting for your partner'), items: outgoing },
        { title: t('Unread replies'), items: history },
      ].filter((group) => group.items.length).map((group) => (
        <section key={group.title} className="space-y-3">
          <h2 className="px-1 text-sm font-semibold text-ink-2">{group.title} · {group.items.length}</h2>
          {group.items.map((r) => <RequestCard key={r.id} request={r} meId={meId} partnerName={partnerName} />)}
        </section>
      ))}
    </div>
  );
}

function RequestCard({ request: r, meId, partnerName }: {
  request: SessionDeletionRequest; meId: string; partnerName: string;
}) {
  const { t, f } = useT();
  const { tz } = useTz();
  const { run, pending, error } = useRun();
  const [confirmApproval, setConfirmApproval] = useState(false);
  const mine = r.requestedBy === meId;
  const unread = r.status !== 'pending';
  const s = r.session;
  const status = {
    pending: mine ? t('Request sent. The session is kept until your partner agrees.') : t('{name} requests deletion of this session.', { name: partnerName }),
    approved: mine ? t('{name} agreed. The session was deleted for both of you.', { name: partnerName }) : t('You both agreed. The session was deleted.'),
    declined: mine ? t('{name} declined your deletion request. The session has been kept.', { name: partnerName }) : t('You declined. The session has been kept and your partner was notified.'),
    cancelled: t('The requester withdrew this request. The session was kept.'),
    expired: t('The session changed after the request. Nothing was deleted. A new request is needed.'),
  }[r.status];
  return (
    <article className={`card space-y-3 ${unread ? 'border-rose/60' : ''}`}>
      <div className="flex items-start gap-2">
        <span className="text-xl">{KIND_META[r.sessionKind].emoji}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">
            {t(KIND_META[r.sessionKind].label)} · {f.prettyDate(dayInTz(r.sessionStartedAt, tz), { year: true })}
          </h3>
          <p className="text-xs text-ink-3">{f.timeInTz(r.sessionStartedAt, tz)} · {f.dateTimeInTz(r.createdAt, tz)}</p>
        </div>
        {unread && <span className="rounded-full bg-rose/20 px-2 py-1 text-xs font-semibold text-rose-2">{t('New')}</span>}
      </div>
      <p className="text-sm text-ink-2" role={unread ? 'status' : undefined}>{status}</p>
      {r.status === 'pending' && s && (
        <details className="rounded-2xl bg-surface-2 p-3 text-sm">
          <summary className="cursor-pointer font-medium">{t('Review session details')}</summary>
          <div className="mt-2 space-y-1 text-ink-2">
            <p>{t(KIND_META[s.kind].label)} · {f.dateTimeInTz(s.startedAt, tz)}</p>
            <p>{s.status === 'active' ? t('Live timer is still running or paused.') : f.formatDuration(s.durationSec ?? 0)}</p>
            {s.place && <p className="break-words">{t('Where')}: {s.place}</p>}
            {s.rating && <p>{'🔥'.repeat(s.rating)}</p>}
            <p>{t('Her orgasms 💦')}: {s.herOrgasms ?? '–'} · {t('His orgasms 🍆')}: {s.hisOrgasms ?? '–'}</p>
            {s.tags.length > 0 && <p>{s.tags.map((tag) => t(tag)).join(' · ')}</p>}
            {s.notes && <p className="break-words whitespace-pre-wrap">{s.notes}</p>}
          </div>
        </details>
      )}
      {r.status === 'pending' && r.changed && <p className="text-sm text-luteal">{t('This session has changed. Approval will close this request without deleting anything; send a new request for the updated record.')}</p>}
      {r.status === 'pending' && (mine ? (
        <button className="btn-ghost w-full" disabled={pending} onClick={() => run(() => cancelDeletionRequest(r.id))}>{t('Withdraw request')}</button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-ghost" disabled={pending} onClick={() => run(() => respondToDeletionRequest(r.id, 'declined'))}>{t('Decline & keep')}</button>
          <button className="btn bg-menstrual text-white" disabled={pending} onClick={async () => {
            if (r.changed) await run(() => respondToDeletionRequest(r.id, 'approved'));
            else setConfirmApproval(true);
          }}>{r.changed ? t('Close outdated request') : t('Agree to delete')}</button>
        </div>
      ))}
      {unread && <button className="btn-ghost w-full" disabled={pending} onClick={() => run(() => markDeletionRequestRead(r.id))}><Check size={16} /> {t('Mark read')}</button>}
      <FormError error={error} />
      <Sheet open={confirmApproval} onClose={() => setConfirmApproval(false)} title={t('Agree to delete for both of you?')}>
        <p className="mb-4 text-sm text-ink-2">{t('Your partner has already requested deletion. Agreeing permanently removes this session from both histories. This cannot be undone.')}</p>
        <FormError error={error} />
        <div className="grid grid-cols-2 gap-3">
          <button className="btn-ghost" onClick={() => setConfirmApproval(false)}>{t('Cancel')}</button>
          <button className="btn bg-menstrual text-white" disabled={pending} onClick={async () => {
            if (await run(() => respondToDeletionRequest(r.id, 'approved'))) setConfirmApproval(false);
          }}>{t('Agree & delete')}</button>
        </div>
      </Sheet>
    </article>
  );
}

function EditNotice({ notice: n, partnerName }: { notice: SessionEditNotice; partnerName: string }) {
  const { t, f } = useT();
  const { tz } = useTz();
  const { run, pending, error } = useRun();
  return <article className={`card space-y-3 ${!n.readAt ? 'border-rose/60' : ''}`}>
    <p className="font-semibold">{t('{name} updated a shared session.', { name: partnerName })} {!n.readAt && <span className="text-xs text-rose-2">{t('New')}</span>}</p>
    <p className="text-xs text-ink-3">{f.dateTimeInTz(n.createdAt, tz)}</p>
    <details className="rounded-2xl bg-surface-2 p-3 text-sm"><summary className="cursor-pointer">{t('Review current session')}</summary>
      <div className="mt-2 space-y-2"><p>{t(KIND_META[n.session.kind].label)} · {f.dateTimeInTz(n.session.startedAt, tz)}</p>
      <p>{f.formatDuration(n.session.durationSec ?? 0)}</p><p>{n.session.place}</p>
      {n.session.rating && <p>{'🔥'.repeat(n.session.rating)}</p>}
      <p>{t('Her orgasms 💦')}: {n.session.herOrgasms ?? '–'} · {t('His orgasms 🍆')}: {n.session.hisOrgasms ?? '–'}</p>
      <p>{n.session.tags.map(tag => t(tag)).join(' · ')}</p><p className="whitespace-pre-wrap break-words">{n.session.notes}</p></div>
    </details>
    {!n.readAt && <button className="btn-ghost w-full" disabled={pending} onClick={() => run(() => markEditNoticeRead(n.id))}>{t('Mark read')}</button>}
    <FormError error={error} />
  </article>;
}

function EditRequestCard({ edit: e, meId, partnerName }: { edit: SessionEditRequest; meId: string; partnerName: string }) {
  const { t, f } = useT();
  const { tz } = useTz();
  const { run, pending, error } = useRun();
  const mine = e.requestedBy === meId;
  const answered = e.status !== 'pending';
  const s = e.session;
  const p = e.proposed;
  const dash = '–';
  const min = (sec: number) => f.formatDuration(Math.round(sec));
  const protectionLabel = (k: string | null) => { const x = PROTECTION.find((q) => q.key === k); return x ? `${x.emoji} ${t(x.label)}` : dash; };
  const rows: [string, string, string][] = p ? [
    [t('Type'), t(KIND_META[s.kind].label), t(KIND_META[p.kind ?? s.kind].label)],
    [t('When'), f.dateTimeInTz(s.startedAt, tz), f.dateTimeInTz(p.startedAt, tz)],
    [t('Active time'), min(s.durationSec ?? 0), min(p.durationMin * 60)],
    [t('Breaks'), min(s.pausedSec ?? 0), min(p.breakMin * 60)],
    [t('Where'), s.place || dash, p.place || dash],
    [t('Heat'), s.rating ? '🔥'.repeat(s.rating) : dash, p.rating ? '🔥'.repeat(p.rating) : dash],
    [t('Protection'), protectionLabel(s.protection), protectionLabel(p.protection)],
    [t('Her orgasms 💦'), String(s.herOrgasms ?? dash), String(p.herOrgasms ?? dash)],
    [t('His orgasms 🍆'), String(s.hisOrgasms ?? dash), String(p.hisOrgasms ?? dash)],
    [t('What went down'), s.tags.map((x) => t(x)).join(', ') || dash, p.tags.map((x) => t(x)).join(', ') || dash],
    [t('Dirty details'), s.notes || dash, p.notes || dash],
  ].filter((r): r is [string, string, string] => r[1] !== r[2]) : [];
  const status = {
    pending: mine ? t('Change sent. The session stays as it is until your partner agrees.') : t('{name} wants to change this session.', { name: partnerName }),
    approved: t('{name} agreed. The change was applied.', { name: partnerName }),
    declined: t('{name} declined your change. The session was kept as it was.', { name: partnerName }),
    cancelled: t('The change was withdrawn.'),
    expired: t('The session changed after the request. Nothing was applied. Send the change again.'),
  }[e.status];
  return (
    <article className={`card space-y-3 ${answered || !mine ? 'border-rose/60' : ''}`}>
      <div className="flex items-start gap-2">
        <span className="text-xl">{KIND_META[s.kind].emoji}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{t(KIND_META[s.kind].label)} · {f.prettyDate(dayInTz(s.startedAt, tz), { year: true })}</h3>
          <p className="text-xs text-ink-3">{f.dateTimeInTz(e.createdAt, tz)}</p>
        </div>
      </div>
      <p className="text-sm text-ink-2" role={answered ? 'status' : undefined}>{status}</p>
      {p && (
        <div className="space-y-2 rounded-2xl bg-surface-2 p-3 text-sm">
          {rows.length ? rows.map(([label, from, to]) => (
            <div key={label}>
              <p className="text-xs text-ink-3">{label}</p>
              <p className="break-words whitespace-pre-wrap"><span className="text-ink-3 line-through">{from}</span> → <b>{to}</b></p>
            </div>
          )) : <p className="text-ink-3">{t('No visible differences.')}</p>}
        </div>
      )}
      {!answered && (mine ? (
        <button className="btn-ghost w-full" disabled={pending} onClick={() => run(() => cancelEditRequest(e.id))}>{t('Withdraw change')}</button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-ghost" disabled={pending} onClick={() => run(() => respondToEditRequest(e.id, 'declined'))}>{t('Decline & keep')}</button>
          <button className="btn-primary" disabled={pending} onClick={() => run(() => respondToEditRequest(e.id, 'approved'))}>{t('Agree to change')}</button>
        </div>
      ))}
      {answered && <button className="btn-ghost w-full" disabled={pending} onClick={() => run(() => markEditOutcomeRead(e.id))}><Check size={16} /> {t('Mark read')}</button>}
      <FormError error={error} />
    </article>
  );
}
