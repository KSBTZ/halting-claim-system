import { useState } from 'react';
import { Check, ChevronDown, CircleCheck, CircleX, Clock, Forward, Inbox, MessageSquareQuote, Pencil, Search, Trash2, Wallet, X } from 'lucide-react';
import { supabase } from '../../supabase/supabaseClient';
import AppLayout from '../../components/AppLayout';
import EntryEditor from '../../components/EntryEditor';
import EntryTable from '../../components/EntryTable';
import ReviewTrail from '../../components/ReviewTrail';
import { Alert, ClaimCardSkeleton, EmptyState, PageHeader, SignatureStamp, Spinner, StatCard, StatusBadge, Tabs } from '../../components/ui';
import { useAllClaims, useApprovers, useProfile } from '../../hooks/useAppData';
import { useFeedback } from '../../hooks/useFeedback';
import { refreshClaims } from '../../lib/queryClient';
import { formatCurrency, formatDate, getClaimTotals, getInitials, pluralize } from '../../lib/format';
import { decideClaim, deleteClaim, forwardClaim, isEntryComplete, normalizeEntry, recordAmendment, toEntryColumns, toFormEntries } from '../../lib/claims';
import { approverLabel, forwardedBy, handledBy, higherApprovers, isFinalApprover, isUnrouted } from '../../lib/approvals';
import { getStatusMeta } from '../../lib/status';

// Each approver only sees claims waiting on them and ones they've dealt with.
// Claims sent before routing existed have no approver, so every approver sees those.
const TABS = [
  { value: 'waiting', label: 'Waiting on me', match: (c, me) => c.status === 'Pending' && (c.current_approver_id === me || isUnrouted(c)) },
  { value: 'forwarded', label: 'Forwarded', match: (c, me) => c.status === 'Pending' && c.current_approver_id !== me && !isUnrouted(c) && forwardedBy(c, me) },
  { value: 'Approved', label: 'Approved', match: (c, me) => c.status === 'Approved' && (handledBy(c, me) || isUnrouted(c)) },
  { value: 'Disapproved', label: 'Disapproved', match: (c, me) => c.status === 'Disapproved' && (handledBy(c, me) || isUnrouted(c)) },
];

const EMPTY = {
  waiting: ["You're all caught up", 'Claims sent to you will appear here for review.'],
  forwarded: ['Nothing forwarded', 'Claims you recommend and pass up the chain will show here until they are decided.'],
  Approved: ['No approved claims', 'Claims you dealt with that end up approved will show here.'],
  Disapproved: ['No disapproved claims', 'Claims you dealt with that end up disapproved will show here.'],
};

const ManagerInbox = () => {
  const { confirm, toast } = useFeedback();
  // Cached and refreshed every 20 seconds while the inbox is open
  const { data: profile } = useProfile();
  const { data: claims = [], isPending: loadingClaims } = useAllClaims(Boolean(profile?.id));
  const { data: approvers = [], isPending: loadingApprovers } = useApprovers(Boolean(profile?.id));
  const loading = loadingClaims || loadingApprovers;
  const [activeTab, setActiveTab] = useState('waiting');
  const [forwardTo, setForwardTo] = useState({}); // { [claimId]: approverId }
  const [search, setSearch] = useState('');
  const [comments, setComments] = useState({}); // { [claimId]: commentText }
  const [decidingId, setDecidingId] = useState(null); // claim currently being submitted
  const [decidingAction, setDecidingAction] = useState(null); // 'Approved' | 'Disapproved' | 'Forward' — which button is loading
  const [deletingId, setDeletingId] = useState(null); // claim currently being deleted

  const [amendingClaimId, setAmendingClaimId] = useState(null); // which claim is in edit mode
  const [editedEntries, setEditedEntries] = useState([]); // form-shaped copies of that claim's entries
  const [savingAmendment, setSavingAmendment] = useState(false);

  const handleDelete = async (claim) => {
    const confirmed = await confirm({
      title: 'Delete this claim?',
      message: `${claim.staff_name}'s claim and all of its entries will be permanently removed. This cannot be undone.`,
      confirmLabel: 'Delete claim',
      tone: 'danger',
    });
    if (!confirmed) return;

    setDeletingId(claim.id);
    const { error } = await deleteClaim(claim.id);
    setDeletingId(null);

    if (error) {
      console.error('Could not delete claim:', error);
      toast('Could not delete claim. Please try again.', { tone: 'error' });
      return;
    }

    toast('Claim deleted', { tone: 'info', icon: Trash2 });
    refreshClaims();
  };

  const me = profile ? { id: profile.id, staff_name: profile.staff_name, job_title: profile.job_title } : null;
  const myLevel = profile?.approval_level ?? null;
  const canGiveFinalApproval = isFinalApprover(approvers, myLevel);
  const forwardOptions = higherApprovers(approvers, myLevel);

  const runAction = async (claim, action, work, success) => {
    setDecidingId(claim.id);
    setDecidingAction(action);
    const { status } = await work();
    setDecidingId(null);
    setDecidingAction(null);

    if (status !== 'ok') {
      toast('Could not update claim. Please try again.', { tone: 'error' });
      return;
    }
    toast(...success);
    refreshClaims();
  };

  const handleDecision = (claim, decision) =>
    runAction(
      claim,
      decision,
      () => decideClaim({ claimId: claim.id, by: me, decision, comment: comments[claim.id] }),
      decision === 'Approved' ? ['Claim approved', { tone: 'success', icon: Check }] : ['Claim disapproved', { tone: 'error', icon: X }]
    );

  const handleForward = (claim) => {
    const to = forwardOptions.find((a) => a.id === forwardTo[claim.id]);
    if (!to) return;
    return runAction(
      claim,
      'Forward',
      () => forwardClaim({ claimId: claim.id, by: me, to, comment: comments[claim.id] }),
      [`Recommended and forwarded to ${to.staff_name}`, { tone: 'success', icon: Forward }]
    );
  };

  // Enter edit mode for a claim: seed editedEntries with its current values
  const startAmend = (claim) => {
    // Recalculate with today's rules, e.g. the fixed all-inclusive rate
    setEditedEntries(toFormEntries(claim.entries).map(normalizeEntry));
    setAmendingClaimId(claim.id);
  };

  const cancelAmend = () => {
    setAmendingClaimId(null);
    setEditedEntries([]);
  };

  const updateEditedField = (entryId, field, value) => {
    setEditedEntries((prev) => prev.map((entry) => (entry.id === entryId ? normalizeEntry({ ...entry, [field]: value }) : entry)));
  };

  const saveAmendment = async () => {
    setSavingAmendment(true);

    // One update call per entry, since each entry is its own row
    const results = await Promise.all(
      editedEntries.map((entry) => supabase.from('entries').update(toEntryColumns(entry)).eq('id', entry.id))
    );
    const failed = results.find((r) => r.error);

    setSavingAmendment(false);

    if (failed) {
      console.error('Could not save amendment:', failed.error);
      toast('Could not save amendment. Please try again.', { tone: 'error' });
      return;
    }

    await recordAmendment({ claimId: amendingClaimId, by: me });
    toast('Claim amended', { tone: 'info', icon: Pencil });
    cancelAmend();
    refreshClaims();
  };

  const myId = profile?.id;
  const inTab = (tab) => claims.filter((claim) => tab.match(claim, myId));
  const tabs = TABS.map((tab) => ({ value: tab.value, label: tab.label, count: inTab(tab).length }));
  const countOf = (value) => tabs.find((t) => t.value === value).count;
  const waiting = inTab(TABS[0]);
  const waitingValue = waiting.reduce((sum, c) => sum + getClaimTotals(c.entries).totalAllowance, 0);

  const query = search.trim().toLowerCase();
  const filteredClaims = inTab(TABS.find((t) => t.value === activeTab)).filter(
    (claim) => !query || [claim.staff_name, claim.staff_no, claim.department].some((value) => value?.toLowerCase().includes(query))
  );

  // Managers can't upload receipts, so amendments don't require one
  const amendmentValid = editedEntries.length > 0 && editedEntries.every((entry) => isEntryComplete(entry, { requireReceipt: false }));

  return (
    <AppLayout role="manager" badges={{ pending: countOf('waiting') }}>
      <PageHeader
        eyebrow={profile?.job_title || 'Manager'}
        title="Claim inbox"
        description={
          canGiveFinalApproval
            ? 'Claims waiting for your final approval.'
            : 'Review claims sent to you: recommend and forward them up the chain, or disapprove.'
        }
      />

      {!loading && myLevel == null && (
        <div className="mb-6">
          <Alert>Your account isn't set up as an approver yet, so claims can't be sent to you. Ask your admin to give it an approval level.</Alert>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Waiting on me" value={countOf('waiting')} icon={Clock} tone="amber" loading={loading} />
        <StatCard label="Value waiting" prefix="GHS" value={formatCurrency(waitingValue)} icon={Wallet} tone="sun" loading={loading} />
        <StatCard label="Approved" value={countOf('Approved')} icon={CircleCheck} tone="brand" loading={loading} />
        <StatCard label="Disapproved" value={countOf('Disapproved')} icon={CircleX} tone="red" loading={loading} />
      </div>

      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} label="Filter claims by status" />
        <div className="relative md:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, staff no. or dept."
            aria-label="Search claims"
            className="field-input pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <ClaimCardSkeleton />
          <ClaimCardSkeleton />
        </div>
      ) : filteredClaims.length === 0 ? (
        query ? (
          <EmptyState icon={Search} title="No matching claims" description={`Nothing here matches "${search.trim()}".`} />
        ) : (
          <EmptyState
            icon={activeTab === 'waiting' ? Inbox : activeTab === 'forwarded' ? Forward : getStatusMeta(activeTab).icon}
            title={EMPTY[activeTab][0]}
            description={EMPTY[activeTab][1]}
          />
        )
      ) : (
        <div className="space-y-5">
          {filteredClaims.map((claim, index) => {
            const { totalNights, totalAllowance } = getClaimTotals(claim.entries);
            const entryCount = (claim.entries || []).length;
            const isAmending = amendingClaimId === claim.id;
            const isDeciding = decidingId === claim.id;
            const { accent } = getStatusMeta(claim.status);

            return (
              <article
                key={claim.id}
                className={`card relative animate-slideUp overflow-hidden before:absolute before:inset-y-0 before:left-0 before:w-1 ${accent}`}
                style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
              >
                <header className="flex items-start gap-3 p-4 sm:gap-4 sm:p-6">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 font-heading text-sm font-bold text-brand-700 ring-1 ring-brand-100">
                    {getInitials(claim.staff_name)}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-4 gap-y-3">
                    <div className="min-w-0">
                      <p className="truncate font-heading text-base font-bold text-gray-900 sm:text-lg">{claim.staff_name}</p>
                      <p className="text-sm text-gray-500">
                        {[claim.department, claim.grade, claim.staff_no].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="sm:text-right">
                      <p className="eyebrow">Submitted {formatDate(claim.submitted_at)}</p>
                      <p className="tabular font-heading text-lg font-bold text-brand-700 sm:text-xl">GHS {formatCurrency(totalAllowance)}</p>
                      <p className="text-xs text-gray-500">
                        {pluralize(totalNights, 'night')} · {pluralize(entryCount, 'entry', 'entries')}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(claim)}
                    disabled={deletingId === claim.id}
                    title="Delete claim"
                    aria-label={`Delete ${claim.staff_name}'s claim`}
                    className="icon-btn -mr-1 -mt-1 hover:bg-red-50 hover:text-red-600"
                  >
                    {deletingId === claim.id ? <Spinner className="h-5 w-5 text-red-500" /> : <Trash2 className="h-5 w-5" />}
                  </button>
                </header>

                <div className="px-4 pb-5 sm:px-6 sm:pb-6">
                  {isAmending ? (
                    <div className="space-y-4">
                      <p className="flex items-center gap-2 text-sm font-medium text-sky-700">
                        <Pencil className="h-4 w-4" />
                        Editing entries: changes are saved to the employee's claim.
                      </p>
                      {editedEntries.map((entry, i) => (
                        <EntryEditor key={entry.id} entry={entry} index={i} onChange={updateEditedField} receiptReadOnly />
                      ))}
                    </div>
                  ) : (
                    <>
                      <EntryTable entries={toFormEntries(claim.entries)} />
                      {claim.signature && (
                        <div className="mt-4">
                          <SignatureStamp src={claim.signature} name={claim.staff_name} date={claim.submitted_at} />
                        </div>
                      )}
                      {!isUnrouted(claim) && (
                        <div className="mt-5">
                          <p className="eyebrow mb-3">History</p>
                          <ReviewTrail claim={claim} />
                        </div>
                      )}
                    </>
                  )}
                </div>

                {isAmending ? (
                  <footer className="flex flex-wrap items-center gap-2 border-t border-gray-100 bg-gray-50/60 px-4 py-4 sm:px-6">
                    <button type="button" onClick={saveAmendment} disabled={savingAmendment || !amendmentValid} className="btn-primary">
                      {savingAmendment ? <Spinner /> : <Check className="h-4 w-4" strokeWidth={3} />}
                      {savingAmendment ? 'Saving…' : 'Save amendments'}
                    </button>
                    <button type="button" onClick={cancelAmend} disabled={savingAmendment} className="btn-ghost">
                      Cancel
                    </button>
                    {!amendmentValid && <p className="w-full text-xs text-gray-500 sm:ml-auto sm:w-auto">Complete every field to save.</p>}
                  </footer>
                ) : activeTab === 'waiting' ? (
                  <footer className="border-t border-gray-100 bg-gray-50/60 px-4 py-4 sm:px-6 sm:py-5">
                    <label htmlFor={`comment-${claim.id}`} className="field-label">
                      Comment <span className="font-normal text-gray-400">(optional, the employee{canGiveFinalApproval ? '' : ' and the next approver'} will see it)</span>
                    </label>
                    <textarea
                      id={`comment-${claim.id}`}
                      value={comments[claim.id] || ''}
                      onChange={(e) => setComments({ ...comments, [claim.id]: e.target.value })}
                      placeholder={canGiveFinalApproval ? 'Add a note to go with your decision…' : 'Add a note for the next approver…'}
                      rows={2}
                      className="field-input resize-y"
                    />
                    {!canGiveFinalApproval && (
                      <div className="mt-4">
                        <label htmlFor={`forward-${claim.id}`} className="field-label">Recommend and forward to</label>
                        {forwardOptions.length ? (
                          <div className="relative sm:max-w-sm">
                            <select
                              id={`forward-${claim.id}`}
                              value={forwardTo[claim.id] || ''}
                              onChange={(e) => setForwardTo({ ...forwardTo, [claim.id]: e.target.value })}
                              className={`field-input cursor-pointer appearance-none pr-10 ${forwardTo[claim.id] ? '' : 'text-gray-400'}`}
                            >
                              <option value="" disabled>Choose who reviews it next</option>
                              {forwardOptions.map((option) => (
                                <option key={option.id} value={option.id} className="text-gray-900">
                                  {approverLabel(option)}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No one above you is set up to approve claims yet.</p>
                        )}
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {canGiveFinalApproval ? (
                        <button
                          type="button"
                          onClick={() => handleDecision(claim, 'Approved')}
                          disabled={isDeciding || amendingClaimId !== null}
                          className="btn-primary flex-1 sm:flex-none"
                        >
                          {isDeciding && decidingAction === 'Approved' ? <Spinner /> : <Check className="h-4 w-4" strokeWidth={3} />}
                          {isDeciding && decidingAction === 'Approved' ? 'Approving…' : 'Give final approval'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleForward(claim)}
                          disabled={isDeciding || amendingClaimId !== null || !forwardTo[claim.id]}
                          className="btn-primary flex-1 sm:flex-none"
                        >
                          {isDeciding && decidingAction === 'Forward' ? <Spinner /> : <Forward className="h-4 w-4" strokeWidth={2.5} />}
                          {isDeciding && decidingAction === 'Forward' ? 'Forwarding…' : 'Recommend & forward'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDecision(claim, 'Disapproved')}
                        disabled={isDeciding || amendingClaimId !== null}
                        className="btn-danger-soft flex-1 sm:flex-none"
                      >
                        {isDeciding && decidingAction === 'Disapproved' ? <Spinner /> : <X className="h-4 w-4" strokeWidth={3} />}
                        {isDeciding && decidingAction === 'Disapproved' ? 'Disapproving…' : 'Disapprove'}
                      </button>
                      <button
                        type="button"
                        onClick={() => startAmend(claim)}
                        disabled={isDeciding || amendingClaimId !== null}
                        className="btn-secondary w-full sm:ml-auto sm:w-auto"
                      >
                        <Pencil className="h-4 w-4" strokeWidth={2.5} />
                        Amend
                      </button>
                    </div>
                  </footer>
                ) : claim.status === 'Pending' ? (
                  <footer className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-gray-100 bg-gray-50/60 px-4 py-3.5 text-sm text-gray-600 sm:px-6">
                    <StatusBadge status="Pending" />
                    Waiting on <span className="font-semibold text-gray-900">{approverLabel({ staff_name: claim.current_approver_name, job_title: claim.current_approver_title })}</span>
                  </footer>
                ) : (
                  <footer className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-gray-100 bg-gray-50/60 px-4 py-3.5 sm:px-6">
                    <StatusBadge status={claim.status} />
                    {claim.reviewed_at && <span className="text-xs text-gray-500">Reviewed {formatDate(claim.reviewed_at)}</span>}
                    {claim.manager_comment && (
                      <p className="flex w-full gap-2 text-sm text-gray-600">
                        <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                        <span className="italic">“{claim.manager_comment}”</span>
                      </p>
                    )}
                  </footer>
                )}
              </article>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
};

export default ManagerInbox;
