import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Inbox, LogOut, Check, X, Pencil, Trash2, Menu } from 'lucide-react';
import { supabase } from '../../supabase/supabaseClient';
import logo from '../../assets/logos.jpeg';
import beck from '../../assets/beck.jpg';

const ManagerInbox = () => {
  const navigate = useNavigate();
  const [managerName, setManagerName] = useState('');
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Pending');
  const [comments, setComments] = useState({}); // { [claimId]: commentText }
  const [decidingId, setDecidingId] = useState(null); // claim currently being submitted
  const [decidingAction, setDecidingAction] = useState(null); // 'Approved' or 'Disapproved' — which button is loading
  const [toast, setToast] = useState(null); // { message, type: 'approved' | 'disapproved' | 'amended' | 'deleted' | 'error' }

  const toastStyles = {
    approved: { bg: 'bg-[#185700]', Icon: Check },
    disapproved: { bg: 'bg-red-600', Icon: X },
    amended: { bg: 'bg-blue-600', Icon: Pencil },
    deleted: { bg: 'bg-gray-800', Icon: Trash2 },
    error: { bg: 'bg-red-600', Icon: X },
  };

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };
  const [deletingId, setDeletingId] = useState(null); // claim currently being deleted
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [amendingClaimId, setAmendingClaimId] = useState(null); // which claim is in edit mode
  const [editedEntries, setEditedEntries] = useState({}); // { [entryId]: { date, from_time, to_time, number_of_nights, work_description, allowance_entitled } }
  const [savingAmendment, setSavingAmendment] = useState(false);

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

    if (profile) setManagerName(profile.staff_name);

    // RLS lets managers see every claim, not just their own
    const { data, error } = await supabase
      .from('claims')
      .select('*, entries(*)')
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Could not load claims:', error);
    } else {
      setClaims(data);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchClaims();
  }, []);

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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GH', { style: 'decimal', minimumFractionDigits: 2 }).format(amount);
  };

  const getClaimTotals = (claim) => {
    const entries = claim.entries || [];
    const totalNights = entries.reduce((sum, e) => sum + (Number(e.number_of_nights) || 0), 0);
    const totalAllowance = entries.reduce((sum, e) => sum + (Number(e.allowance_entitled) || 0), 0);
    return { totalNights, totalAllowance };
  };

  const handleDelete = async (claimId) => {
    const confirmed = window.confirm('Delete this claim permanently? This cannot be undone.');
    if (!confirmed) return;

    setDeletingId(claimId);

    // Entries must go first since they reference the claim via claim_id
    await supabase.from('entries').delete().eq('claim_id', claimId);
    const { error } = await supabase.from('claims').delete().eq('id', claimId);

    setDeletingId(null);

    if (error) {
      console.error('Could not delete claim:', error);
      showToast('Could not delete claim. Please try again.', 'error');
      return;
    }

    showToast('Claim deleted', 'deleted');
    fetchClaims();
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
      showToast('Could not update claim. Please try again.', 'error');
      return;
    }

    showToast(`Claim ${decision.toLowerCase()}`, decision.toLowerCase());
    fetchClaims();
  };

  // Enter edit mode for a claim: seed editedEntries with its current values
  const startAmend = (claim) => {
    const seed = {};
    (claim.entries || []).forEach((entry) => {
      seed[entry.id] = {
        date: entry.date,
        from_date: entry.from_date,
        to_date: entry.to_date,
        number_of_nights: entry.number_of_nights,
        work_description: entry.work_description,
        allowance_entitled: entry.allowance_entitled,
      };
    });
    setEditedEntries(seed);
    setAmendingClaimId(claim.id);
  };

  const cancelAmend = () => {
    setAmendingClaimId(null);
    setEditedEntries({});
  };

  const updateEditedField = (entryId, field, value) => {
    setEditedEntries((prev) => ({
      ...prev,
      [entryId]: { ...prev[entryId], [field]: value },
    }));
  };

  const saveAmendment = async (claim) => {
    setSavingAmendment(true);

    // One update call per entry, since each entry is its own row
    const updates = (claim.entries || []).map((entry) => {
      const edited = editedEntries[entry.id];
      return supabase
        .from('entries')
        .update({
          date: edited.date,
          from_date: edited.from_date,
          to_date: edited.to_date,
          number_of_nights: Number(edited.number_of_nights) || 0,
          work_description: edited.work_description,
          allowance_entitled: Number(edited.allowance_entitled) || 0,
        })
        .eq('id', entry.id);
    });

    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);

    setSavingAmendment(false);

    if (failed) {
      console.error('Could not save amendment:', failed.error);
      showToast('Could not save amendment. Please try again.', 'error');
      return;
    }

    showToast('Claim amended', 'amended');
    setAmendingClaimId(null);
    setEditedEntries({});
    fetchClaims();
  };

  const filteredClaims = claims.filter((claim) => claim.status === activeTab);

  const tabStyles = (tab) =>
    `px-5 py-2.5 rounded-lg font-bold text-sm transition-colors ${
      activeTab === tab
        ? 'bg-[#185700] text-[#FFF700]'
        : 'text-gray-500 hover:bg-gray-100'
    }`;

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f8fafc] font-body">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <>
      {loggingOut && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[#185700]">
          <div className="w-14 h-14 border-4 border-white/20 border-t-[#FFF700] rounded-full animate-spin"></div>
          <p className="text-white font-heading font-bold tracking-wide">Logging out...</p>
        </div>
      )}

      {toast && (() => {
        const { bg, Icon } = toastStyles[toast.type] || toastStyles.error;
        return (
          <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg font-bold text-sm text-white flex items-center gap-2 animate-[toast-slide-fade_2.5s_ease-in-out] ${bg}`}>
            <Icon className="w-4 h-4" strokeWidth={3} />
            {toast.message}
          </div>
        );
      })()}
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
              {managerName ? managerName.split(' ').map(n => n[0]).join('').slice(0, 2) : '??'}
            </div>
            <div>
              <p className="font-bold text-[#FFF700] text-sm">{managerName || 'Manager'}</p>
              <p className="text-xs text-white/70">Manager</p>
            </div>
          </div>

          <nav className="mt-6 px-4 space-y-2">
            <Link to="/manager/inbox" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 bg-[#FFF700] text-[#185700] rounded-lg font-bold shadow-sm transition-colors">
              <Inbox className="w-5 h-5" strokeWidth={2.5} />
              Inbox
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
            <h2 className="text-3xl font-heading font-bold text-gray-900 mb-6">Claim Inbox</h2>

            <div className="flex gap-2 mb-8">
              <button className={tabStyles('Pending')} onClick={() => setActiveTab('Pending')}>
                Pending
              </button>
              <button className={tabStyles('Approved')} onClick={() => setActiveTab('Approved')}>
                Approved
              </button>
              <button className={tabStyles('Disapproved')} onClick={() => setActiveTab('Disapproved')}>
                Disapproved
              </button>
            </div>

            {filteredClaims.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                <p className="text-gray-500">No {activeTab.toLowerCase()} claims right now.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredClaims.map((claim) => {
                  const { totalNights, totalAllowance } = getClaimTotals(claim);
                  const isAmending = amendingClaimId === claim.id;

                  return (
                    <div key={claim.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:p-8">

                      <div className="flex flex-wrap justify-between items-start gap-4 mb-6 pb-6 border-b border-gray-100">
                        <div>
                          <p className="text-lg font-heading font-bold text-gray-900">{claim.staff_name}</p>
                          <p className="text-sm text-gray-500">{claim.department} · {claim.grade} · {claim.staff_no}</p>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="text-right">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                              {claim.submitted_at ? new Date(claim.submitted_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                            </p>
                            <p className="text-lg font-bold text-[#185700]">GHS {formatCurrency(totalAllowance)}</p>
                          </div>
                          <button
                            onClick={() => handleDelete(claim.id)}
                            disabled={deletingId === claim.id}
                            title="Delete Claim"
                            className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors disabled:cursor-not-allowed"
                          >
                            {deletingId === claim.id ? (
                              <span className="flex items-center gap-1 px-1">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce"></span>
                              </span>
                            ) : (
                              <Trash2 className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {!isAmending && (
                        <div className="hidden lg:grid grid-cols-12 gap-4 pb-3 border-b border-gray-200 mb-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          <div className="col-span-2">Date</div>
                          <div className="col-span-2">From – To</div>
                          <div className="col-span-1 text-center">Nights</div>
                          <div className="col-span-5">Work Description</div>
                          <div className="col-span-2 text-right">Allowance (GHS)</div>
                        </div>
                      )}

                      <div className="space-y-3 mb-4">
                        {(claim.entries || []).map((entry) => (
                          isAmending ? (
                            <div key={entry.id} className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-3 items-center bg-gray-50 rounded-lg p-3">
                              <input
                                type="date"
                                value={editedEntries[entry.id]?.date || ''}
                                onChange={(e) => updateEditedField(entry.id, 'date', e.target.value)}
                                className="col-span-2 bg-white border border-gray-300 rounded-lg px-2 py-2 text-sm"
                              />
                              <input
                                type="date"
                                value={editedEntries[entry.id]?.from_date || ''}
                                onChange={(e) => updateEditedField(entry.id, 'from_date', e.target.value)}
                                className="col-span-1 bg-white border border-gray-300 rounded-lg px-2 py-2 text-sm"
                              />
                              <input
                                type="date"
                                value={editedEntries[entry.id]?.to_date || ''}
                                onChange={(e) => updateEditedField(entry.id, 'to_date', e.target.value)}
                                className="col-span-1 bg-white border border-gray-300 rounded-lg px-2 py-2 text-sm"
                              />
                              <input
                                type="number"
                                min="0"
                                value={editedEntries[entry.id]?.number_of_nights || ''}
                                onChange={(e) => updateEditedField(entry.id, 'number_of_nights', e.target.value)}
                                className="col-span-1 bg-white border border-gray-300 rounded-lg px-2 py-2 text-sm text-center"
                              />
                              <input
                                type="text"
                                value={editedEntries[entry.id]?.work_description || ''}
                                onChange={(e) => updateEditedField(entry.id, 'work_description', e.target.value)}
                                className="col-span-5 bg-white border border-gray-300 rounded-lg px-2 py-2 text-sm"
                              />
                              <input
                                type="text"
                                value={editedEntries[entry.id]?.allowance_entitled || ''}
                                onChange={(e) => updateEditedField(entry.id, 'allowance_entitled', e.target.value)}
                                className="col-span-2 bg-white border border-gray-300 rounded-lg px-2 py-2 text-sm text-right"
                              />
                            </div>
                          ) : (
                            <div key={entry.id} className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-4 items-center text-sm">
                              <div className="col-span-2 text-gray-900">{entry.date}</div>
                              <div className="col-span-2 text-gray-700">{entry.from_date} – {entry.to_date}</div>
                              <div className="col-span-1 lg:text-center text-gray-900">{entry.number_of_nights}</div>
                              <div className="col-span-5 text-gray-700">{entry.work_description}</div>
                              <div className="col-span-2 lg:text-right text-gray-900">{formatCurrency(entry.allowance_entitled)}</div>
                            </div>
                          )
                        ))}
                      </div>

                      {!isAmending && (
                        <div className="flex items-center gap-3 text-sm mb-2">
                          <span className="font-bold text-gray-900">Total Nights: {totalNights}</span>
                        </div>
                      )}

                      {isAmending ? (
                        <div className="mt-6 pt-6 border-t border-gray-100 flex gap-3">
                          <button
                            onClick={() => saveAmendment(claim)}
                            disabled={savingAmendment}
                            className="px-6 py-2.5 bg-[#185700] text-white font-bold rounded-xl hover:bg-[#103b00] transition-colors disabled:opacity-60"
                          >
                            {savingAmendment ? 'Saving...' : 'Save Amendments'}
                          </button>
                          <button
                            onClick={cancelAmend}
                            disabled={savingAmendment}
                            className="px-6 py-2.5 text-gray-500 hover:bg-gray-100 font-bold rounded-xl transition-colors disabled:opacity-60"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : claim.status === 'Pending' ? (
                        <div className="mt-6 pt-6 border-t border-gray-100">
                          <textarea
                            value={comments[claim.id] || ''}
                            onChange={(e) => setComments({ ...comments, [claim.id]: e.target.value })}
                            placeholder="Optional comment for the employee..."
                            rows={2}
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 font-body text-sm focus:ring-2 focus:ring-[#185700]/30 focus:border-[#185700] outline-none transition-all mb-4"
                          />
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleDecision(claim.id, 'Approved')}
                              disabled={decidingId === claim.id}
                              className="flex items-center gap-2 px-6 py-2.5 bg-[#185700] text-white font-bold rounded-xl hover:bg-[#103b00] transition-colors disabled:opacity-60"
                            >
                              <Check className="w-4 h-4" strokeWidth={3} />
                              {decidingId === claim.id && decidingAction === 'Approved' ? 'Approving...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleDecision(claim.id, 'Disapproved')}
                              disabled={decidingId === claim.id}
                              className="flex items-center gap-2 px-6 py-2.5 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors disabled:opacity-60"
                            >
                              <X className="w-4 h-4" strokeWidth={3} />
                              {decidingId === claim.id && decidingAction === 'Disapproved' ? 'Disapproving...' : 'Disapprove'}
                            </button>
                            <button
                              onClick={() => startAmend(claim)}
                              className="flex items-center gap-2 px-6 py-2.5 border-2 border-[#185700] text-[#185700] font-bold rounded-xl hover:bg-[#185700] hover:text-white transition-colors"
                            >
                              <Pencil className="w-4 h-4" strokeWidth={2.5} />
                              Amend
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                          <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${claim.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {claim.status}
                          </span>
                          {claim.manager_comment && (
                            <p className="text-sm text-gray-500 italic">"{claim.manager_comment}"</p>
                          )}
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

export default ManagerInbox;
