import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FileText, List, LogOut, Menu } from 'lucide-react';
import { supabase } from '../../supabase/supabaseClient';
import logo from '../../assets/logos.jpeg';
import beck from '../../assets/beck.jpg';

const ReviewSummary = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [unseenCount, setUnseenCount] = useState(0);

  const { staffDetails, claimEntries, draftClaimId } = location.state || {};

  useEffect(() => {
    if (!staffDetails || !claimEntries) {
      navigate('/employee/new-claim');
    }
  }, [staffDetails, claimEntries, navigate]);

  if (!staffDetails || !claimEntries) {
    return null;
  }

  const totalNights = claimEntries.reduce((sum, entry) => sum + (Number(entry.nights) || 0), 0);
  const totalAllowance = claimEntries.reduce((sum, entry) => sum + (Number(entry.allowance) || 0), 0);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GH', { style: 'decimal', minimumFractionDigits: 2 }).format(amount);
  };

  const handleSend = async () => {
    setSubmitting(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      navigate('/');
      return;
    }

    // Enforce max 3 pending claims per employee
    const { count: pendingCount, error: countError } = await supabase
      .from('claims')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', user.id)
      .eq('status', 'Pending');

    if (countError) {
      setError('Could not verify your pending claims. Please try again.');
      setSubmitting(false);
      return;
    }

    if (pendingCount >= 3) {
      setError('You already have 3 pending claims. Please wait for one to be reviewed before submitting another.');
      setSubmitting(false);
      return;
    }

    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .insert([{
        employee_id: user.id,
        staff_name: staffDetails.staff_name,
        department: staffDetails.department,
        grade: staffDetails.grade,
        staff_no: staffDetails.staff_no,
        status: 'Pending',
      }])
      .select()
      .single();

    if (claimError || !claim) {
      setError('Could not submit claim. Please try again.');
      setSubmitting(false);
      return;
    }

    const entriesToInsert = claimEntries.map(entry => ({
      claim_id: claim.id,
      date: entry.date,
      from_date: entry.from,
      to_date: entry.to,
      number_of_nights: Number(entry.nights) || 0,
      work_description: entry.description,
      allowance_entitled: Number(entry.allowance) || 0,
    }));

    const { error: entriesError } = await supabase
      .from('entries')
      .insert(entriesToInsert);

    if (entriesError) {
      setSubmitting(false);
      setError('Claim created, but entries failed to save. Contact support.');
      return;
    }

    // If this started as a draft, remove the old draft now that it's properly submitted
    if (draftClaimId) {
      await supabase.from('entries').delete().eq('claim_id', draftClaimId);
      await supabase.from('claims').delete().eq('id', draftClaimId);
    }

    setSubmitting(false);
    navigate('/employee/my-requests');
  };

  useEffect(() => {
    const fetchUnseenCount = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count } = await supabase
        .from('claims')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', user.id)
        .neq('status', 'Pending')
        .eq('seen_by_employee', false);

      setUnseenCount(count || 0);
    };

    fetchUnseenCount();
  }, []);

  const handleSaveDraft = async () => {
    const confirmed = window.confirm('Save this claim as a draft? You can continue it later from My Requests.');
    if (!confirmed) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/');
      return;
    }

    if (!draftClaimId) {
      const { count } = await supabase
        .from('claims')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', user.id)
        .eq('status', 'Draft');

      if ((count || 0) >= 5) {
        window.alert('You already have 5 drafts saved. Please delete or complete one before saving another.');
        return;
      }
    }

    setSavingDraft(true);

    if (draftClaimId) {
      await supabase.from('entries').delete().eq('claim_id', draftClaimId);
      await supabase.from('claims').delete().eq('id', draftClaimId);
    }

    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .insert([{
        employee_id: user.id,
        staff_name: staffDetails.staff_name,
        department: staffDetails.department,
        grade: staffDetails.grade,
        staff_no: staffDetails.staff_no,
        status: 'Draft',
      }])
      .select()
      .single();

    if (claimError || !claim) {
      setSavingDraft(false);
      window.alert('Could not save draft. Please try again.');
      return;
    }

    const entriesToInsert = claimEntries.map(entry => ({
      claim_id: claim.id,
      date: entry.date,
      from_date: entry.from,
      to_date: entry.to,
      number_of_nights: Number(entry.nights) || 0,
      work_description: entry.description,
      allowance_entitled: Number(entry.allowance) || 0,
    }));

    await supabase.from('entries').insert(entriesToInsert);

    setSavingDraft(false);
    navigate('/employee/my-requests');
  };

  const handleLogout = async () => {
    const confirmed = window.confirm('Are you sure you want to log out?');
    if (!confirmed) return;

    setLoggingOut(true);
    // Small artificial delay so the loading screen is actually visible,
    // since signOut() alone usually resolves instantly
    await Promise.all([
      supabase.auth.signOut(),
      new Promise((resolve) => setTimeout(resolve, 600)),
    ]);
    navigate('/');
  };

  return (
    <>
      {loggingOut && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[#185700]">
          <div className="w-14 h-14 border-4 border-white/20 border-t-[#FFF700] rounded-full animate-spin"></div>
          <p className="text-white font-heading font-bold tracking-wide">Logging out...</p>
        </div>
      )}
    <div className="flex h-screen w-full bg-[#f8fafc] font-body antialiased">
      
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#185700] text-white flex flex-col justify-between shadow-xl transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:flex ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div>
          <div className="px-6 py-8 flex items-center gap-3 border-b border-white/10">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden p-1 shadow-sm">
               <img src={logo} alt="SIC Life" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-heading font-bold tracking-wide text-white">SIC Life</h1>
          </div>

          <div className="px-6 py-6 border-b border-white/10 flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-lg font-heading font-bold">
              {staffDetails.staff_name ? staffDetails.staff_name.split(' ').map(n => n[0]).join('').slice(0, 2) : '??'}
            </div>
            <div>
              <p className="font-bold text-[#FFF700] text-sm">{staffDetails.staff_name}</p>
              <p className="text-xs text-white/70">Employee</p>
            </div>
          </div>

          <nav className="mt-6 px-4 space-y-2">
            <a href="#" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 bg-[#FFF700] text-[#185700] rounded-lg font-bold shadow-sm transition-colors">
              <FileText className="w-5 h-5" strokeWidth={2.5} />
              New Claim
            </a>
            <Link to="/employee/my-requests" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-white/80 hover:bg-white/10 hover:text-white rounded-lg font-medium transition-colors">
              <List className="w-5 h-5" />
              My Requests
            </Link>
          </nav>
        </div>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-white/80 hover:bg-white/10 hover:text-[#FFF700] rounded-lg font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Log out
          </button>
        </div>
      </div>

        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{
            backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.88), rgba(248, 250, 252, 0.88)), url(${beck})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
        <div className="md:hidden flex items-center gap-3 bg-[#185700] text-white px-4 py-3 shadow-md">
          <button onClick={() => setMobileMenuOpen(true)} className="p-1">
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-heading font-bold text-lg">SIC Life</span>
        </div>
        <main className="flex-1 overflow-y-auto p-8 lg:p-12">
          
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-heading font-bold text-gray-900 mb-8">Review Your Claim</h2>

            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:p-8 mb-8">
              <h3 className="text-lg font-heading font-bold text-[#185700] mb-6">Staff Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Name</label>
                  <p className="text-gray-900 font-medium">{staffDetails.staff_name}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Department</label>
                  <p className="text-gray-900 font-medium">{staffDetails.department}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Grade</label>
                  <p className="text-gray-900 font-medium">{staffDetails.grade}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Staff No.</label>
                  <p className="text-gray-900 font-medium">{staffDetails.staff_no}</p>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:p-8 mb-8">
              <h3 className="text-lg font-heading font-bold text-[#185700] mb-6">Claim Entries</h3>
              
              <div className="hidden lg:grid grid-cols-12 gap-4 pb-3 border-b border-gray-200 mb-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <div className="col-span-2">Date</div>
                <div className="col-span-2">From – To</div>
                <div className="col-span-1 text-center">Nights</div>
                <div className="col-span-5">Work Description</div>
                <div className="col-span-2 text-right">Allowance (GHS)</div>
              </div>

              <div className="space-y-4 lg:space-y-0">
                {claimEntries.map((entry, index) => (
                  <div 
                    key={entry.id} 
                    className={`grid grid-cols-1 lg:grid-cols-12 gap-4 items-center py-4 ${index !== claimEntries.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    <div className="col-span-2">
                      <span className="lg:hidden text-xs text-gray-500 block mb-1">Date</span>
                      <span className="text-gray-900 font-medium">{entry.date}</span>
                    </div>
                    
                    <div className="col-span-2">
                      <span className="lg:hidden text-xs text-gray-500 block mb-1">From – To</span>
                      <span className="text-gray-700">{entry.from} – {entry.to}</span>
                    </div>

                    <div className="col-span-1 lg:text-center">
                      <span className="lg:hidden text-xs text-gray-500 block mb-1">Nights</span>
                      <span className="text-gray-900 font-medium">{entry.nights}</span>
                    </div>

                    <div className="col-span-5">
                      <span className="lg:hidden text-xs text-gray-500 block mb-1">Work Description</span>
                      <span className="text-gray-700">{entry.description}</span>
                    </div>

                    <div className="col-span-2 lg:text-right">
                      <span className="lg:hidden text-xs text-gray-500 block mb-1">Allowance (GHS)</span>
                      <span className="text-gray-900 font-medium">{formatCurrency(Number(entry.allowance) || 0)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t-2 border-gray-100 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-gray-50/50 rounded-lg p-4">
                <div className="col-span-4 lg:col-span-4 flex items-center lg:justify-end">
                  <span className="text-sm font-bold text-gray-900 uppercase tracking-wider">Total Nights</span>
                </div>
                <div className="col-span-1 lg:text-center">
                  <span className="text-lg font-bold text-[#185700]">{totalNights}</span>
                </div>
                <div className="col-span-5 lg:col-span-5 flex items-center lg:justify-end">
                  <span className="text-sm font-bold text-gray-900 uppercase tracking-wider">Total Allowance</span>
                </div>
                <div className="col-span-2 lg:text-right">
                  <span className="text-xl font-bold text-[#185700]">GHS {formatCurrency(totalAllowance)}</span>
                </div>
              </div>

            </section>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">
                {error}
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => navigate('/employee/new-claim', { state: { staffDetails, claimEntries, draftClaimId } })}
                className="px-6 py-3 text-[#185700] hover:bg-[#185700]/10 font-bold rounded-xl transition-colors"
              >
                Edit
              </button>
              <div className="flex gap-3">
                <button
                  onClick={handleSaveDraft}
                  disabled={savingDraft}
                  className="px-6 py-3 border-2 border-[#185700] text-[#185700] font-bold rounded-xl hover:bg-[#185700] hover:text-white transition-colors disabled:opacity-60"
                >
                  {savingDraft ? 'Saving...' : 'Save as Draft'}
                </button>
                <button
                  onClick={handleSend}
                  disabled={submitting}
                  className="px-8 py-3 bg-[#185700] text-[#FFF700] hover:bg-[#103b00] font-bold rounded-xl shadow-lg shadow-[#185700]/20 transition-all transform hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {submitting ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
    </>
  );
};

export default ReviewSummary;