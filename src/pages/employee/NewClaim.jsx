import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, CalendarDays, Lock, Plus, Save } from 'lucide-react';
import { supabase } from '../../supabase/supabaseClient';
import AppLayout from '../../components/AppLayout';
import EntryEditor from '../../components/EntryEditor';
import StaffDetailsCard from '../../components/StaffDetailsCard';
import { PageHeader, Spinner, Stepper } from '../../components/ui';
import { useFeedback } from '../../hooks/useFeedback';
import { formatCurrency, formatDate, getClaimTotals, todayISO } from '../../lib/format';
import { CLAIM_STEPS, MAX_DRAFTS, MAX_ENTRIES, emptyEntry, isEntryComplete, normalizeEntry, saveDraft } from '../../lib/claims';

const NewClaim = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { confirm, toast } = useFeedback();

  const [staffDetails, setStaffDetails] = useState(
    location.state?.staffDetails || {
      staff_name: '',
      department: '',
      grade: '',
      staff_no: '',
    }
  );
  const [loadingProfile, setLoadingProfile] = useState(!location.state?.staffDetails);

  // The claim is always dated today, including drafts picked up again later
  const today = todayISO();
  const [claimEntries, setClaimEntries] = useState(() =>
    location.state?.claimEntries?.length
      ? location.state.claimEntries.map((entry) => normalizeEntry({ ...emptyEntry(entry.id), ...entry, date: today }))
      : [emptyEntry(1, today)]
  );

  const [advancingToReview, setAdvancingToReview] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const draftClaimId = location.state?.draftClaimId || null;

  const isFormComplete = claimEntries.length > 0 && claimEntries.every((entry) => isEntryComplete(entry));
  const { totalNights, totalAllowance } = getClaimTotals(claimEntries);

  useEffect(() => {
    // Already have staff details passed in from the Edit flow — no need to refetch
    if (location.state?.staffDetails) return;

    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate('/');
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('staff_name, department, grade, staff_no')
        .eq('id', user.id)
        .single();

      if (error || !profile) {
        console.error('Could not load profile:', error);
      } else {
        setStaffDetails(profile);
      }

      setLoadingProfile(false);
    };

    fetchProfile();
  }, [navigate, location.state]);

  const addRow = () => {
    if (claimEntries.length >= MAX_ENTRIES) return;
    const newId = claimEntries.length ? Math.max(...claimEntries.map((e) => Number(e.id) || 0)) + 1 : 1;
    setClaimEntries([...claimEntries, emptyEntry(newId, today)]);
  };

  const removeRow = (id) => {
    if (claimEntries.length <= 1) return;
    setClaimEntries(claimEntries.filter((entry) => entry.id !== id));
  };

  const updateEntry = (id, field, value) => {
    setClaimEntries((current) => current.map((entry) => (entry.id === id ? normalizeEntry({ ...entry, [field]: value }) : entry)));
  };

  const handleNext = async () => {
    setAdvancingToReview(true);
    // Small artificial delay so the loading state is actually visible
    await new Promise((resolve) => setTimeout(resolve, 500));
    navigate('/employee/review', {
      state: { staffDetails, claimEntries, draftClaimId }
    });
  };

  const handleSaveDraft = async () => {
    const confirmed = await confirm({
      title: 'Save as draft?',
      message: 'You can pick this claim up again later from My Requests.',
      confirmLabel: 'Save draft',
    });
    if (!confirmed) return;

    setSavingDraft(true);
    const { status } = await saveDraft({ staffDetails, claimEntries, draftClaimId });
    setSavingDraft(false);

    if (status === 'signed-out') {
      navigate('/');
    } else if (status === 'limit') {
      toast(`You already have ${MAX_DRAFTS} drafts saved. Delete or complete one before saving another.`, { tone: 'error' });
    } else if (status === 'error') {
      toast('Could not save draft. Please try again.', { tone: 'error' });
    } else {
      toast('Draft saved');
      navigate('/employee/my-requests');
    }
  };

  return (
    <AppLayout role="employee" userName={loadingProfile ? null : staffDetails.staff_name}>
      <PageHeader
        eyebrow={draftClaimId ? 'Continuing a draft' : 'Halting claim'}
        title="New claim"
        description={`Record the trips you made away from your station. You can add up to ${MAX_ENTRIES} entries per claim.`}
      />
      <Stepper steps={CLAIM_STEPS} current={0} />

      {loadingProfile ? (
        <div className="space-y-6">
          <div className="card space-y-4 p-6">
            <div className="skeleton h-5 w-32" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
            </div>
          </div>
          <div className="card space-y-4 p-6">
            <div className="skeleton h-5 w-40" />
            <div className="skeleton h-48 rounded-2xl" />
          </div>
        </div>
      ) : (
        <div className="animate-fadeIn space-y-6">
          <StaffDetailsCard staffDetails={staffDetails} />

          <section className="card p-4 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-heading text-base font-bold text-gray-900 sm:text-lg">Claim entries</h2>
                <p className="mt-0.5 text-sm text-gray-500">Add one entry for each halting trip.</p>
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800 ring-1 ring-brand-100">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Claim date: {formatDate(today)}
                  <Lock className="h-3 w-3 text-brand-600" aria-label="Set automatically" />
                </p>
              </div>
              <span className="tabular whitespace-nowrap rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                {claimEntries.length} of {MAX_ENTRIES}
              </span>
            </div>

            <div className="space-y-4">
              {claimEntries.map((entry, index) => (
                <EntryEditor
                  key={entry.id}
                  entry={entry}
                  index={index}
                  canRemove={claimEntries.length > 1}
                  onChange={updateEntry}
                  onRemove={removeRow}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={addRow}
              disabled={claimEntries.length >= MAX_ENTRIES}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 px-4 py-3.5 text-sm font-semibold text-gray-600 transition-colors hover:border-brand-600 hover:bg-brand-50/60 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/15 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 disabled:hover:bg-transparent"
            >
              <Plus className="h-4 w-4" strokeWidth={3} />
              {claimEntries.length >= MAX_ENTRIES ? `Maximum of ${MAX_ENTRIES} entries reached` : 'Add another entry'}
            </button>
          </section>

          <div
            className="sticky bottom-0 z-10 -mx-4 border-t border-gray-200 bg-white/95 px-4 pt-3 backdrop-blur-md sm:bottom-4 sm:mx-0 sm:rounded-2xl sm:border sm:px-5 sm:shadow-lift"
            style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center justify-between gap-5 sm:justify-start">
                <div>
                  <p className="eyebrow">Total nights</p>
                  <p className="tabular font-heading text-base font-bold text-gray-900 sm:text-lg">{totalNights}</p>
                </div>
                <span className="hidden h-8 w-px bg-gray-200 sm:block" />
                <div className="text-right sm:text-left">
                  <p className="eyebrow">Total allowance</p>
                  <p className="tabular font-heading text-base font-bold text-brand-700 sm:text-lg">GHS {formatCurrency(totalAllowance)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={handleSaveDraft} disabled={savingDraft} className="btn-secondary flex-1 sm:flex-none">
                  {savingDraft ? <Spinner /> : <Save className="h-4 w-4" />}
                  {savingDraft ? 'Saving…' : 'Save draft'}
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!isFormComplete || advancingToReview}
                  className="btn-primary flex-1 sm:flex-none"
                  title={isFormComplete ? undefined : 'Complete every field in each entry to continue'}
                >
                  {advancingToReview ? <Spinner /> : null}
                  {advancingToReview ? 'Loading…' : 'Review claim'}
                  {!advancingToReview && <ArrowRight className="h-4 w-4" strokeWidth={2.5} />}
                </button>
              </div>
            </div>
            {!isFormComplete && (
              <p className="mt-2 hidden text-xs text-gray-500 sm:block sm:text-right">Complete every field in each entry to continue.</p>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default NewClaim;
