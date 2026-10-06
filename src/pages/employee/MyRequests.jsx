import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CircleCheck, Clock, FileText, MessageSquareQuote, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { supabase } from '../../supabase/supabaseClient';
import AppLayout from '../../components/AppLayout';
import EntryTable from '../../components/EntryTable';
import { ClaimCardSkeleton, EmptyState, PageHeader, SignatureStamp, Spinner, StatCard, StatusBadge, Tabs } from '../../components/ui';
import { useFeedback } from '../../hooks/useFeedback';
import { formatCurrency, formatDate, getClaimTotals, pluralize } from '../../lib/format';
import { deleteClaim, toFormEntries } from '../../lib/claims';
import { getStatusMeta } from '../../lib/status';

const FILTERS = ['All', 'Pending', 'Approved', 'Disapproved', 'Draft'];

const MyRequests = () => {
  const navigate = useNavigate();
  const { confirm, toast } = useFeedback();
  const [staffName, setStaffName] = useState(null);
  const [claims, setClaims] = useState([]);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [filter, setFilter] = useState('All');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate('/');
        return;
      }

      // Fetch the profile name directly, instead of relying on claims data
      // (which would leave the name blank if the employee has no claims yet)
      const { data: profile } = await supabase
        .from('profiles')
        .select('staff_name')
        .eq('id', user.id)
        .single();

      setStaffName(profile?.staff_name || '');

      const { data, error } = await supabase
        .from('claims')
        .select('*, entries(*)')
        .eq('employee_id', user.id)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Could not load claims:', error);
      } else {
        setClaims(data);
      }

      // They're viewing their requests now, so clear the unseen flag
      await supabase.rpc('mark_own_claims_seen');

      setLoadingClaims(false);
    };

    fetchData();
  }, [navigate]);

  const handleContinueDraft = (claim) => {
    navigate('/employee/new-claim', {
      state: {
        staffDetails: {
          staff_name: claim.staff_name,
          department: claim.department,
          grade: claim.grade,
          staff_no: claim.staff_no,
        },
        claimEntries: toFormEntries(claim.entries),
        draftClaimId: claim.id,
      },
    });
  };

  const handleDeleteDraft = async (claimId) => {
    const confirmed = await confirm({
      title: 'Delete this draft?',
      message: 'The draft and all its entries will be permanently removed.',
      confirmLabel: 'Delete draft',
      tone: 'danger',
    });
    if (!confirmed) return;

    setDeletingId(claimId);
    const { error } = await deleteClaim(claimId);
    setDeletingId(null);

    if (error) {
      toast('Could not delete draft. Please try again.', { tone: 'error' });
      return;
    }

    setClaims((prev) => prev.filter((c) => c.id !== claimId));
    toast('Draft deleted', { tone: 'info', icon: Trash2 });
  };

  const countBy = (status) => claims.filter((c) => c.status === status).length;
  const submitted = claims.filter((c) => c.status !== 'Draft');
  const approvedTotal = claims
    .filter((c) => c.status === 'Approved')
    .reduce((sum, c) => sum + getClaimTotals(c.entries).totalAllowance, 0);

  const visibleClaims = filter === 'All' ? claims : claims.filter((c) => c.status === filter);
  const tabs = FILTERS.map((value) => ({
    value,
    label: value === 'Draft' ? 'Drafts' : value,
    count: value === 'All' ? claims.length : countBy(value),
  }));

  return (
    <AppLayout role="employee" userName={staffName}>
      <PageHeader
        eyebrow="Your claims"
        title="My requests"
        description="Track the status of your halting claims and pick up any drafts."
        actions={
          <Link to="/employee/new-claim" className="btn-primary">
            <Plus className="h-4 w-4" strokeWidth={3} />
            New claim
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Submitted" value={submitted.length} icon={FileText} tone="gray" loading={loadingClaims} />
        <StatCard label="Pending" value={countBy('Pending')} icon={Clock} tone="amber" loading={loadingClaims} />
        <StatCard label="Approved" value={countBy('Approved')} icon={CircleCheck} tone="brand" loading={loadingClaims} />
        <StatCard label="Approved total" prefix="GHS" value={formatCurrency(approvedTotal)} icon={Wallet} tone="sun" loading={loadingClaims} />
      </div>

      {!loadingClaims && claims.length > 0 && (
        <div className="mb-5">
          <Tabs tabs={tabs} value={filter} onChange={setFilter} label="Filter claims by status" />
        </div>
      )}

      {loadingClaims ? (
        <div className="space-y-4">
          <ClaimCardSkeleton />
          <ClaimCardSkeleton />
        </div>
      ) : claims.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No claims yet"
          description="When you submit a halting claim, you'll be able to track its progress here."
          action={
            <Link to="/employee/new-claim" className="btn-primary">
              <Plus className="h-4 w-4" strokeWidth={3} />
              Start a new claim
            </Link>
          }
        />
      ) : visibleClaims.length === 0 ? (
        <EmptyState
          icon={getStatusMeta(filter).icon}
          title={`No ${filter === 'Draft' ? 'drafts' : `${filter.toLowerCase()} claims`}`}
          description="Try a different filter to see your other claims."
        />
      ) : (
        <div className="space-y-4">
          {visibleClaims.map((claim, index) => {
            const { totalNights, totalAllowance } = getClaimTotals(claim.entries);
            const isDraft = claim.status === 'Draft';
            const hasUpdate = !isDraft && claim.status !== 'Pending' && claim.seen_by_employee === false;
            const { accent, soft } = getStatusMeta(claim.status);

            return (
              <article
                key={claim.id}
                className={`card relative animate-slideUp overflow-hidden p-4 before:absolute before:inset-y-0 before:left-0 before:w-1 sm:p-6 ${accent}`}
                style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="eyebrow flex flex-wrap items-center gap-2">
                      {isDraft ? 'Saved' : 'Submitted'} {formatDate(claim.submitted_at)}
                      {hasUpdate && (
                        <span className="rounded-full bg-sun-400 px-2 py-0.5 text-[10px] font-bold tracking-wider text-brand-800">New update</span>
                      )}
                    </p>
                    <p className="tabular mt-1 font-heading text-xl font-bold text-gray-900">GHS {formatCurrency(totalAllowance)}</p>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {pluralize(totalNights, 'night')} · {pluralize((claim.entries || []).length, 'entry', 'entries')}
                    </p>
                  </div>
                  <StatusBadge status={claim.status} />
                </div>

                {(claim.entries || []).length > 0 && (
                  <div className="mt-5">
                    <EntryTable entries={toFormEntries(claim.entries)} />
                  </div>
                )}

                {claim.signature && (
                  <div className="mt-4">
                    <SignatureStamp src={claim.signature} name={claim.staff_name} date={claim.submitted_at} />
                  </div>
                )}

                {claim.manager_comment && (
                  <div className={`mt-4 flex gap-3 rounded-xl border p-3.5 ${soft}`}>
                    <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                    <div>
                      <p className="eyebrow mb-0.5">Manager's comment</p>
                      <p className="text-sm text-gray-800">{claim.manager_comment}</p>
                    </div>
                  </div>
                )}

                {isDraft && (
                  <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                    <button type="button" onClick={() => handleContinueDraft(claim)} className="btn-primary">
                      <Pencil className="h-4 w-4" />
                      Continue editing
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDraft(claim.id)}
                      disabled={deletingId === claim.id}
                      className="btn-ghost text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      {deletingId === claim.id ? <Spinner /> : <Trash2 className="h-4 w-4" />}
                      Delete draft
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
};

export default MyRequests;
