import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FileText, List, LogOut, Plus, Trash2, Menu } from 'lucide-react';
import { supabase } from '../../supabase/supabaseClient';
import logo from '../../assets/logos.jpeg';
import beck from '../../assets/beck.jpg';

const NewClaim = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unseenCount, setUnseenCount] = useState(0);

  const [staffDetails, setStaffDetails] = useState(
    location.state?.staffDetails || {
      staff_name: '',
      department: '',
      grade: '',
      staff_no: '',
    }
  );
  const [loadingProfile, setLoadingProfile] = useState(!location.state?.staffDetails);

  const [claimEntries, setClaimEntries] = useState(
    location.state?.claimEntries || [
      { id: 1, date: '', from: '', to: '', nights: '', description: '', allowance: '' },
    ]
  );

  const [advancingToReview, setAdvancingToReview] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftClaimId, setDraftClaimId] = useState(location.state?.draftClaimId || null);

  const isFormComplete = claimEntries.every(
    (entry) => entry.date && entry.from && entry.to && entry.nights && entry.description && entry.allowance
  );

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

  const handleLogout = async () => {
    const confirmed = window.confirm('Are you sure you want to log out?');
    if (!confirmed) return;

    setLoggingOut(true);
    await Promise.all([
      supabase.auth.signOut(),
      new Promise((resolve) => setTimeout(resolve, 600)),
    ]);
    navigate('/');
  };

  const addRow = () => {
    if (claimEntries.length >= 3) return;
    const newId = claimEntries.length ? Math.max(...claimEntries.map(e => e.id)) + 1 : 1;
    setClaimEntries([...claimEntries, { id: newId, date: '', from: '', to: '', nights: '', description: '', allowance: '' }]);
  };

  const removeRow = (id) => {
    setClaimEntries(claimEntries.filter(entry => entry.id !== id));
  };

  const updateEntry = (id, field, value) => {
    setClaimEntries(claimEntries.map(entry =>
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
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
    const confirmed = window.confirm('Save this claim as a draft? You can continue it later from My Requests.');
    if (!confirmed) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/');
      return;
    }

    // Only enforce the 5-draft limit for a brand new draft, not when re-saving one already in progress
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

    // If continuing an existing draft, replace its old version instead of stacking a duplicate
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

  return (
    <>
      {loggingOut && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[#185700]">
          <div className="w-14 h-14 border-4 border-white/20 border-t-[#FFF700] rounded-full animate-spin"></div>
          <p className="text-white font-heading font-bold tracking-wide">Logging out...</p>
        </div>
      )}

      <div className="flex h-[100dvh] w-full bg-[#f8fafc] font-body antialiased">

        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
        <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#185700] text-white flex flex-col justify-between shadow-xl transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div>
            <div className="px-6 py-8 flex items-center gap-3 border-b border-white/10">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden p-1 shadow-sm">
                 <img src={logo} alt="SIC Life" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-2xl font-heading font-bold tracking-wide text-white">SIC Life</h1>
            </div>

            <div className="px-6 py-6 border-b border-white/10 flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-lg font-bold">
                {staffDetails.staff_name ? staffDetails.staff_name.split(' ').map(n => n[0]).join('').slice(0, 2) : '??'}
              </div>
              <div>
                <p className="font-bold text-[#FFF700] text-sm">{staffDetails.staff_name || 'Employee'}</p>
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
                {unseenCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center">
                    {unseenCount}
                  </span>
                )}
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
          <div className="md:hidden flex items-center gap-3 bg-[#185700] text-white px-4 pb-3 shadow-md" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}>
            <button onClick={() => setMobileMenuOpen(true)} className="p-1">
              <Menu className="w-6 h-6" />
            </button>
            <span className="font-heading font-bold text-lg">SIC Life</span>
          </div>
          <main className="flex-1 overflow-y-auto p-8 lg:p-12">

            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-heading font-bold text-gray-900 mb-8">New Halting Claim</h2>

              {loadingProfile ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                  <p className="text-gray-500">Loading your details...</p>
                </div>
              ) : (
                <>
                  <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:p-8 mb-8">
                    <h3 className="text-lg font-bold text-[#185700] mb-6">Staff Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Name</label>
                        <input type="text" readOnly value={staffDetails.staff_name} className="w-full bg-gray-50 border border-gray-200 text-gray-700 rounded-lg px-4 py-2.5 font-body focus:outline-none cursor-not-allowed" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Department</label>
                        <input type="text" readOnly value={staffDetails.department} className="w-full bg-gray-50 border border-gray-200 text-gray-700 rounded-lg px-4 py-2.5 font-body focus:outline-none cursor-not-allowed" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Grade</label>
                        <input type="text" readOnly value={staffDetails.grade} className="w-full bg-gray-50 border border-gray-200 text-gray-700 rounded-lg px-4 py-2.5 font-body focus:outline-none cursor-not-allowed" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Staff No.</label>
                        <input type="text" readOnly value={staffDetails.staff_no} className="w-full bg-gray-50 border border-gray-200 text-gray-700 rounded-lg px-4 py-2.5 font-body focus:outline-none cursor-not-allowed" />
                      </div>
                    </div>
                  </section>

                  <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:p-8 mb-8">
                    <h3 className="text-lg font-bold text-[#185700] mb-6">Claim Entries</h3>

                    <div className="hidden lg:grid grid-cols-12 gap-4 pb-3 border-b border-gray-200 mb-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <div className="col-span-2">Today's Date</div>
                      <div className="col-span-1">From</div>
                      <div className="col-span-1">To</div>
                      <div className="col-span-1 text-center">Nights</div>
                      <div className="col-span-4">Work Description</div>
                      <div className="col-span-2">Allowance (GHS)</div>
                      <div className="col-span-1 text-center">Act</div>
                    </div>

                    <div className="space-y-4">
                      {claimEntries.map((entry) => (
                        <div key={entry.id} className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-gray-50 lg:bg-transparent p-4 lg:p-0 rounded-xl lg:rounded-none border border-gray-100 lg:border-none">

                          <div className="col-span-2 flex flex-col">
                            <label className="lg:hidden text-xs text-gray-500 mb-1">Today's Date</label>
                            <input type="date" value={entry.date} onChange={(e) => updateEntry(entry.id, 'date', e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 font-body focus:ring-2 focus:ring-[#185700]/30 focus:border-[#185700] outline-none transition-all" />
                          </div>

                          <div className="col-span-1 flex flex-col">
                            <label className="lg:hidden text-xs text-gray-500 mb-1">From</label>
                            <input type="date" value={entry.from} onChange={(e) => updateEntry(entry.id, 'from', e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 font-body focus:ring-2 focus:ring-[#185700]/30 focus:border-[#185700] outline-none transition-all" />
                          </div>

                          <div className="col-span-1 flex flex-col">
                            <label className="lg:hidden text-xs text-gray-500 mb-1">To</label>
                            <input type="date" value={entry.to} onChange={(e) => updateEntry(entry.id, 'to', e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 font-body focus:ring-2 focus:ring-[#185700]/30 focus:border-[#185700] outline-none transition-all" />
                          </div>

                          <div className="col-span-1 flex flex-col">
                            <label className="lg:hidden text-xs text-gray-500 mb-1">No. Nights</label>
                            <input type="number" min="1" max="7" value={entry.nights} onChange={(e) => updateEntry(entry.id, 'nights', e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 font-body text-center focus:ring-2 focus:ring-[#185700]/30 focus:border-[#185700] outline-none transition-all" />
                          </div>

                          <div className="col-span-4 flex flex-col">
                            <label className="lg:hidden text-xs text-gray-500 mb-1">Work Description</label>
                            <input type="text" maxLength={255} value={entry.description} onChange={(e) => updateEntry(entry.id, 'description', e.target.value)} placeholder="e.g. Client site visit" className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 font-body focus:ring-2 focus:ring-[#185700]/30 focus:border-[#185700] outline-none transition-all" />
                          </div>

                          <div className="col-span-2 flex flex-col">
                            <label className="lg:hidden text-xs text-gray-500 mb-1">Allowance Entitled</label>
                            <input type="number" min="0" max="50000" step="0.01" value={entry.allowance} onChange={(e) => updateEntry(entry.id, 'allowance', e.target.value)} placeholder="Max 50,000" className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2.5 font-body focus:ring-2 focus:ring-[#185700]/30 focus:border-[#185700] outline-none transition-all" />
                          </div>

                          <div className="col-span-1 flex justify-end lg:justify-center mt-2 lg:mt-0">
                            <button
                              onClick={() => removeRow(entry.id)}
                              className="p-2 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                              title="Remove Row"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6">
                      <button
                        onClick={addRow}
                        disabled={claimEntries.length >= 3}
                        className="flex items-center gap-2 px-5 py-2.5 border-2 border-[#185700] text-[#185700] font-bold rounded-lg hover:bg-[#185700] hover:text-[#FFF700] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#185700]"
                      >
                        <Plus className="w-4 h-4" strokeWidth={3} />
                        {claimEntries.length >= 3 ? 'Max 3 rows reached' : 'Add Another Row'}
                      </button>
                    </div>
                  </section>

                  <div className="flex justify-end items-center gap-4 pt-4">
                    {!isFormComplete && (
                      <p className="text-sm text-gray-500 italic mr-auto">
                        Fill in every field on all rows to continue
                      </p>
                    )}
                    <button
                      onClick={handleSaveDraft}
                      disabled={savingDraft}
                      className="px-6 py-3 border-2 border-[#185700] text-[#185700] font-bold rounded-xl hover:bg-[#185700] hover:text-white transition-colors disabled:opacity-60"
                    >
                      {savingDraft ? 'Saving...' : 'Save as Draft'}
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={!isFormComplete || advancingToReview}
                      className="px-8 py-3 bg-[#185700] text-[#FFF700] hover:bg-[#103b00] font-bold rounded-xl shadow-lg shadow-[#185700]/20 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    >
                      {advancingToReview ? 'Loading...' : 'Next: Review'}
                    </button>
                  </div>
                </>
              )}

            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default NewClaim;
