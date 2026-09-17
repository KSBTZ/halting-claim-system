import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileText, List, LogOut, Menu } from 'lucide-react';
import { supabase } from '../../supabase/supabaseClient';
import logo from '../../assets/logos.jpeg';
import beck from '../../assets/beck.jpg';

const MyRequests = () => {
  const navigate = useNavigate();
  const [staffName, setStaffName] = useState('');
  const [claims, setClaims] = useState([]);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

      if (profile) setStaffName(profile.staff_name);

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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GH', { style: 'decimal', minimumFractionDigits: 2 }).format(amount);
  };

  const getClaimTotals = (claim) => {
    const entries = claim.entries || [];
    const totalNights = entries.reduce((sum, e) => sum + (Number(e.number_of_nights) || 0), 0);
    const totalAllowance = entries.reduce((sum, e) => sum + (Number(e.allowance_entitled) || 0), 0);
    return { totalNights, totalAllowance };
  };

  const handleContinueDraft = (claim) => {
    navigate('/employee/new-claim', {
      state: {
        staffDetails: {
          staff_name: claim.staff_name,
          department: claim.department,
          grade: claim.grade,
          staff_no: claim.staff_no,
        },
        claimEntries: (claim.entries || []).map((entry) => ({
          id: entry.id,
          date: entry.date,
          from: entry.from_date,
          to: entry.to_date,
          nights: entry.number_of_nights,
          description: entry.work_description,
          allowance: entry.allowance_entitled,
        })),
        draftClaimId: claim.id,
      },
    });
  };

  const handleDeleteDraft = async (claimId) => {
    const confirmed = window.confirm('Delete this draft permanently?');
    if (!confirmed) return;

    await supabase.from('entries').delete().eq('claim_id', claimId);
    await supabase.from('claims').delete().eq('id', claimId);

    setClaims((prev) => prev.filter((c) => c.id !== claimId));
  };

  const statusStyles = {
    Draft: 'bg-gray-100 text-gray-600 border-gray-300',
    Pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    Approved: 'bg-green-100 text-green-700 border-green-300',
    Disapproved: 'bg-red-100 text-red-700 border-red-300',
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
                {staffName ? staffName.split(' ').map(n => n[0]).join('').slice(0, 2) : '??'}
              </div>
              <div>
                <p className="font-bold text-[#FFF700] text-sm">{staffName || 'Employee'}</p>
                <p className="text-xs text-white/70">Employee</p>
              </div>
            </div>

            <nav className="mt-6 px-4 space-y-2">
              <Link to="/employee/new-claim" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-white/80 hover:bg-white/10 hover:text-white rounded-lg font-medium transition-colors">
                <FileText className="w-5 h-5" />
                New Claim
              </Link>
              <Link to="/employee/my-requests" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 bg-[#FFF700] text-[#185700] rounded-lg font-bold shadow-sm transition-colors">
                <List className="w-5 h-5" strokeWidth={2.5} />
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
              <h2 className="text-3xl font-heading font-bold text-gray-900 mb-8">My Requests</h2>

              {loadingClaims ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                  <p className="text-gray-500">Loading your requests...</p>
                </div>
              ) : claims.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                  <p className="text-gray-500 mb-4">You haven't submitted any claims yet.</p>
                  <Link
                    to="/employee/new-claim"
                    className="inline-block px-6 py-3 bg-[#185700] text-[#FFF700] font-bold rounded-xl shadow-lg shadow-[#185700]/20 hover:bg-[#103b00] transition-colors"
                  >
                    Start a New Claim
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {claims.map((claim) => {
                    const { totalNights, totalAllowance } = getClaimTotals(claim);
                    return (
                      <div key={claim.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:p-8">
                        <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                              Submitted {claim.submitted_at ? new Date(claim.submitted_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                            </p>
                            <p className="text-lg font-heading font-bold text-gray-900">
                              {totalNights} night{totalNights !== 1 ? 's' : ''} · GHS {formatCurrency(totalAllowance)}
                            </p>
                          </div>
                          <span className={`px-4 py-1.5 rounded-full text-sm font-bold border ${statusStyles[claim.status] || statusStyles.Pending}`}>
                            {claim.status}
                          </span>
                        </div>

                        {claim.status === 'Draft' && (
                          <div className="flex gap-3 mb-4">
                            <button
                              onClick={() => handleContinueDraft(claim)}
                              className="px-5 py-2 bg-[#185700] text-[#FFF700] text-sm font-bold rounded-lg hover:bg-[#103b00] transition-colors"
                            >
                              Continue
                            </button>
                            <button
                              onClick={() => handleDeleteDraft(claim.id)}
                              className="px-5 py-2 text-red-600 text-sm font-bold hover:bg-red-50 rounded-lg transition-colors"
                            >
                              Delete Draft
                            </button>
                          </div>
                        )}

                        <div className="space-y-2 mb-2 border-t border-gray-100 pt-4">
                          {(claim.entries || []).map((entry) => (
                            <div key={entry.id} className="flex flex-wrap justify-between items-center text-sm text-gray-700 gap-2">
                              <span>{entry.from_date} – {entry.to_date}</span>
                              <span className="text-gray-500">{entry.work_description}</span>
                              <span className="font-medium text-gray-900">GHS {formatCurrency(entry.allowance_entitled)}</span>
                            </div>
                          ))}
                        </div>

                        {claim.manager_comment && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Manager's Comment</p>
                            <p className="text-sm text-gray-700">{claim.manager_comment}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default MyRequests;
