import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, CircleCheck, CircleX, Clock, Inbox, MessageSquareQuote, Pencil, Search, Trash2, Wallet, X } from 'lucide-react';
import { supabase } from '../../supabase/supabaseClient';
import AppLayout from '../../components/AppLayout';
import EntryEditor from '../../components/EntryEditor';
import EntryTable from '../../components/EntryTable';
import { ClaimCardSkeleton, EmptyState, PageHeader, SignatureStamp, Spinner, StatCard, StatusBadge, Tabs } from '../../components/ui';
import { useFeedback } from '../../hooks/useFeedback';
import { formatCurrency, formatDate, getClaimTotals, getInitials, pluralize } from '../../lib/format';
import { deleteClaim, isEntryComplete, normalizeEntry, toEntryColumns, toFormEntries } from '../../lib/claims';
import { getStatusMeta } from '../../lib/status';

const TABS = ['Pending', 'Approved', 'Disapproved'];

const ManagerInbox = () => {
  const navigate = useNavigate();
  const { confirm, toast } = useFeedback();
  const [managerName, setManagerName] = useState(null);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [activeTab, setActiveTab] = useState('Pending');
  const [search, setSearch] = useState('');
  const [comments, setComments] = useState({}); // { [claimId]: commentText }
  const [decidingId, setDecidingId] = useState(null); // claim currently being submitted
  const [decidingAction, setDecidingAction] = useState(null); // 'Approved' or 'Disapproved' — which button is loading
  const [deletingId, setDeletingId] = useState(null); // claim currently being deleted

  const [amendingClaimId, setAmendingClaimId] = useState(null); // which claim is in edit mode
  const [editedEntries, setEditedEntries] = useState([]); // form-shaped copies of that claim's entries
  const [savingAmendment, setSavingAmendment] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchClaims = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate('/');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('staff_name')
        .eq('id', user.id)
        .single();

      if (cancelled) return;
      setManagerName(profile?.staff_name || '');

      // RLS lets managers see every claim, not just their own
      const { data, error } = await supabase
        .from('claims')
        .select('*, entries(*)')
        .order('submitted_at', { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error('Could not load claims:', error);
      } else {
        setClaims(data);
      }

      setLoading(false);
    };

    fetchClaims();
    return () => {
      cancelled = true;
    };
  }, [navigate, reloadKey]);

  const refresh = () => setReloadKey((key) => key + 1);

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
    refresh();
  };

  const handleDecision = async (claimId, decision) => {
    setDecidingId(claimId);
    setDecidingAction(decision);

    const { error } = await supabase
      .from('claims')
      .update({
        status: decision,
        manager_comment: comments[claimId] || null,
        reviewed_at: new Date().toISOString(),
        seen_by_employee: false,
      })
      .eq('id', claimId);

    setDecidingId(null);
    setDecidingAction(null);

    if (error) {
      console.error('Could not update claim:', error);
      toast('Could not update claim. Please try again.', { tone: 'error' });
      return;
    }

    toast(`Claim ${decision.toLowerCase()}`, decision === 'Approved' ? { tone: 'success', icon: Check } : { tone: 'error', icon: X });
    refresh();
  };

  // Enter edit mode for a claim: seed editedEntries with its current values
  const startAmend = (claim) => {
    setEditedEntries(toFormEntries(claim.entries));
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

    toast('Claim amended', { tone: 'info', icon: Pencil });
    cancelAmend();
    refresh();
  };

  const countBy = (status) => claims.filter((c) => c.status === status).length;
  const pendingCount = countBy('Pending');
  const pendingValue = claims
    .filter((c) => c.status === 'Pending')
    .reduce((sum, c) => sum + getClaimTotals(c.entries).totalAllowance, 0);

  const query = search.trim().toLowerCase();
  const filteredClaims = claims.filter(
    (claim) =>
      claim.status === activeTab &&
      (!query || [claim.staff_name, claim.staff_no, claim.department].some((value) => value?.toLowerCase().includes(query)))
  );

  const tabs = TABS.map((value) => ({ value, label: value, count: countBy(value) }));
  // Managers can't upload receipts, so amendments don't require one
  const amendmentValid = editedEntries.length > 0 && editedEntries.every((entry) => isEntryComplete(entry, { requireReceipt: false }));

  return (
    <AppLayout role="manager" userName={managerName} badges={{ pending: pendingCount }}>
      <PageHeader
        eyebrow="Manager"
        title="Claim inbox"
        description="Review halting claims from staff: approve, amend or decline them."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Awaiting review" value={pendingCount} icon={Clock} tone="amber" loading={loading} />
        <StatCard label="Pending value" prefix="GHS" value={formatCurrency(pendingValue)} icon={Wallet} tone="sun" loading={loading} />
        <StatCard label="Approved" value={countBy('Approved')} icon={CircleCheck} tone="brand" loading={loading} />
        <StatCard label="Disapproved" value={countBy('Disapproved')} icon={CircleX} tone="red" loading={loading} />
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
          <EmptyState icon={Search} title="No matching claims" description={`Nothing in ${activeTab.toLowerCase()} matches "${search.trim()}".`} />
        ) : (
          <EmptyState
            icon={activeTab === 'Pending' ? Inbox : getStatusMeta(activeTab).icon}
            title={activeTab === 'Pending' ? "You're all caught up" : `No ${activeTab.toLowerCase()} claims`}
            description={activeTab === 'Pending' ? 'New claims from staff will appear here for review.' : `Claims you mark as ${activeTab.toLowerCase()} will show up here.`}
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
                ) : claim.status === 'Pending' ? (
                  <footer className="border-t border-gray-100 bg-gray-50/60 px-4 py-4 sm:px-6 sm:py-5">
                    <label htmlFor={`comment-${claim.id}`} className="field-label">
                      Comment for employee <span className="font-normal text-gray-400">(optional)</span>
                    </label>
                    <textarea
                      id={`comment-${claim.id}`}
                      value={comments[claim.id] || ''}
                      onChange={(e) => setComments({ ...comments, [claim.id]: e.target.value })}
                      placeholder="Add a note the employee will see with your decision…"
                      rows={2}
                      className="field-input resize-y"
                    />
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleDecision(claim.id, 'Approved')}
                        disabled={isDeciding || amendingClaimId !== null}
                        className="btn-primary flex-1 sm:flex-none"
                      >
                        {isDeciding && decidingAction === 'Approved' ? <Spinner /> : <Check className="h-4 w-4" strokeWidth={3} />}
                        {isDeciding && decidingAction === 'Approved' ? 'Approving…' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecision(claim.id, 'Disapproved')}
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
