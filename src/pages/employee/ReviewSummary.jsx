import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Info, PenLine, Save, Send } from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import EntryTable from '../../components/EntryTable';
import SignaturePad from '../../components/SignaturePad';
import StaffDetailsCard from '../../components/StaffDetailsCard';
import { Alert, PageHeader, Spinner, Stepper } from '../../components/ui';
import { useFeedback } from '../../hooks/useFeedback';
import { formatCurrency, formatDate, getClaimTotals, pluralize, todayISO } from '../../lib/format';
import { CLAIM_STEPS, MAX_DRAFTS, MAX_PENDING, saveDraft, submitClaim } from '../../lib/claims';

const ReviewSummary = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { confirm, toast } = useFeedback();
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState('');
  const [signature, setSignature] = useState(null);

  const { staffDetails, claimEntries, draftClaimId } = location.state || {};
  const hasClaim = Boolean(staffDetails && claimEntries?.length);

  useEffect(() => {
    if (!hasClaim) {
      navigate('/employee/new-claim');
    }
  }, [hasClaim, navigate]);

  if (!hasClaim) {
    return null;
  }

  const { totalNights, totalAllowance } = getClaimTotals(claimEntries);
  const busy = submitting || savingDraft;

  const handleSend = async () => {
    if (!signature) return;
    setSubmitting(true);
    setError('');

    const { status } = await submitClaim({ staffDetails, claimEntries, draftClaimId, signature });

    if (status === 'signed-out') {
      navigate('/');
      return;
    }

    setSubmitting(false);

    if (status === 'limit') {
      setError(`You already have ${MAX_PENDING} pending claims. Please wait for one to be reviewed before submitting another.`);
    } else if (status === 'error') {
      setError('Could not submit claim. Please try again.');
    } else {
      toast('Claim sent to your manager for review');
      navigate('/employee/my-requests');
    }
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

  const handleEdit = () => navigate('/employee/new-claim', { state: { staffDetails, claimEntries, draftClaimId } });

  return (
    <AppLayout role="employee" userName={staffDetails.staff_name}>
      <PageHeader
        eyebrow="Almost done"
        title="Review and sign"
        description="Check everything is correct, then sign and send it to your manager."
      />
      <Stepper steps={CLAIM_STEPS} current={1} />

      <div className="grid animate-fadeIn grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <StaffDetailsCard staffDetails={staffDetails} compact />

          <section className="card p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-heading text-base font-bold text-gray-900 sm:text-lg">Claim entries</h2>
              <button type="button" onClick={handleEdit} disabled={busy} className="btn-ghost px-3 py-1.5 text-brand-700 hover:text-brand-800">
                Edit
              </button>
            </div>
            <EntryTable entries={claimEntries} />
          </section>

          <section className="card p-4 sm:p-6">
            <div className="mb-4">
              <h2 className="flex items-center gap-2 font-heading text-base font-bold text-gray-900 sm:text-lg">
                <PenLine className="h-[18px] w-[18px] text-brand-700" />
                Sign to confirm
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">
                By signing, you confirm the details in this claim are accurate.
              </p>
            </div>
            <SignaturePad onChange={setSignature} />
          </section>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <section className="card overflow-hidden">
            <div className="relative overflow-hidden bg-brand-700 px-5 py-5 text-white">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sun-400/25 blur-2xl" />
              <p className="eyebrow relative text-white/70">Total allowance</p>
              <p className="tabular relative mt-1 font-heading text-3xl font-extrabold tracking-tight">
                <span className="mr-1.5 text-lg font-bold text-sun-400">GHS</span>
                {formatCurrency(totalAllowance)}
              </p>
            </div>

            <dl className="divide-y divide-gray-100 px-5 text-sm">
              <div className="flex justify-between py-3">
                <dt className="text-gray-600">Claim date</dt>
                <dd className="font-semibold text-gray-900">{formatDate(todayISO())}</dd>
              </div>
              <div className="flex justify-between py-3">
                <dt className="text-gray-600">Entries</dt>
                <dd className="tabular font-semibold text-gray-900">{claimEntries.length}</dd>
              </div>
              <div className="flex justify-between py-3">
                <dt className="text-gray-600">Total nights</dt>
                <dd className="tabular font-semibold text-gray-900">{pluralize(totalNights, 'night')}</dd>
              </div>
            </dl>

            <div className="space-y-2.5 border-t border-gray-100 p-5">
              {error && <Alert>{error}</Alert>}
              <button type="button" onClick={handleSend} disabled={busy || !signature} className="btn-primary w-full py-3">
                {submitting ? <Spinner /> : <Send className="h-4 w-4" strokeWidth={2.5} />}
                {submitting ? 'Sending…' : 'Send request'}
              </button>
              {!signature && <p className="text-center text-xs font-medium text-gray-500">Sign the claim to send it.</p>}
              <button type="button" onClick={handleSaveDraft} disabled={busy} className="btn-secondary w-full">
                {savingDraft ? <Spinner /> : <Save className="h-4 w-4" />}
                {savingDraft ? 'Saving…' : 'Save as draft'}
              </button>
              <button type="button" onClick={handleEdit} disabled={busy} className="btn-ghost w-full">
                <ArrowLeft className="h-4 w-4" />
                Back to edit
              </button>
              <p className="flex gap-2 pt-2 text-xs leading-relaxed text-gray-500">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Once sent, your claim goes to your manager for review and can no longer be edited.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </AppLayout>
  );
};

export default ReviewSummary;
