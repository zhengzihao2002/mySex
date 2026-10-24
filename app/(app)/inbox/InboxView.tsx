'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, Inbox, RefreshCw } from 'lucide-react';
import { cancelDeletionRequest, markDeletionRequestRead, respondToDeletionRequest } from '@/app/actions';
import { FormError } from '@/components/FormError';
import { useT } from '@/components/I18nProvider';
import { KIND_META } from '@/components/KindPicker';
import { Sheet } from '@/components/Sheet';
import { useTz } from '@/components/TzProvider';
import { useRun } from '@/components/useRun';
import { dayInTz } from '@/lib/tz';
import type { SessionDeletionRequest } from '@/lib/types';

export function InboxView({ requests, meId, partnerName }: {
  requests: SessionDeletionRequest[]; meId: string; partnerName: string;
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
      <p className="text-sm text-ink-2">{t('Shared sessions are deleted only when both of you agree. Declining keeps the record and notifies the requester.')}</p>
      <p className="text-xs text-ink-3">{t('All requests and replies expire 7 days after the request was sent. Expiring an unanswered request keeps the session.')}</p>
      {!requests.length && (
        <div className="card py-10 text-center text-ink-3">
          <Inbox className="mx-auto mb-3" size={30} />
          <p className="font-semibold text-ink">{t('Your inbox is empty')}</p>
          <p className="mt-1 text-sm">{t('Deletion requests and your partner’s replies will appear here.')}</p>
        </div>
      )}
      {[
        { title: t('Needs your agreement'), items: incoming },
        { title: t('Waiting for your partner'), items: outgoing },
        { title: t('Request history'), items: history },
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
  const unread = mine && ['approved', 'declined', 'expired'].includes(r.status) && !r.requesterReadAt;
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
          <p className="text-xs text-ink-3">{f.timeInTz(r.sessionStartedAt, tz)} · {t('Requested {date}', { date: f.dateTimeInTz(r.createdAt, tz) })}</p>
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
