import { supabase } from '../supabase/supabaseClient';

export const CLAIM_STEPS = ['Details', 'Review', 'Submit'];

export const MAX_ENTRIES = 3;
export const MAX_PENDING = 3;
export const MAX_DRAFTS = 5;
export const MAX_NIGHTS = 7;
export const MAX_ALLOWANCE = 50000;

export const emptyEntry = (id, date = '') => ({ id, date, from: '', to: '', nights: '', description: '', allowance: '' });

// Form entries use short keys; the entries table uses its own column names.
// Empty dates are sent as null since '' isn't a valid date value.
export const toEntryColumns = (entry) => ({
  date: entry.date || null,
  from_date: entry.from || null,
  to_date: entry.to || null,
  number_of_nights: Number(entry.nights) || 0,
  work_description: entry.description,
  allowance_entitled: Number(entry.allowance) || 0,
});

export const toEntryRows = (claimId, claimEntries) =>
  claimEntries.map((entry) => ({ claim_id: claimId, ...toEntryColumns(entry) }));

// Zero nights/allowance are what an unfilled draft field gets saved as, so show them as blank again
export const toFormEntries = (rows = []) =>
  rows.map((row) => ({
    id: row.id,
    date: row.date || '',
    from: row.from_date || '',
    to: row.to_date || '',
    nights: row.number_of_nights || '',
    description: row.work_description || '',
    allowance: row.allowance_entitled || '',
  }));

export const getEntryErrors = (entry) => {
  const errors = {};
  if (entry.from && entry.to && entry.to < entry.from) {
    errors.to = "Can't be before the From date";
  }
  if (entry.nights !== '' && (Number(entry.nights) < 1 || Number(entry.nights) > MAX_NIGHTS)) {
    errors.nights = `Between 1 and ${MAX_NIGHTS}`;
  }
  if (entry.allowance !== '' && (Number(entry.allowance) < 0 || Number(entry.allowance) > MAX_ALLOWANCE)) {
    errors.allowance = 'Up to GHS 50,000';
  }
  return errors;
};

export const isEntryComplete = (entry) =>
  Boolean(entry.date && entry.from && entry.to && entry.nights && entry.description && entry.allowance) &&
  Object.keys(getEntryErrors(entry)).length === 0;

const staffFields = (staffDetails) => ({
  staff_name: staffDetails.staff_name,
  department: staffDetails.department,
  grade: staffDetails.grade,
  staff_no: staffDetails.staff_no,
});

export const deleteClaim = async (claimId) => {
  // Entries must go first since they reference the claim via claim_id
  await supabase.from('entries').delete().eq('claim_id', claimId);
  return supabase.from('claims').delete().eq('id', claimId);
};

// Inserts a claim with its entries, removing the claim again if the entries fail to save
const insertClaim = async (userId, staffDetails, claimEntries, status) => {
  const { data: claim, error: claimError } = await supabase
    .from('claims')
    .insert([{ employee_id: userId, ...staffFields(staffDetails), status }])
    .select()
    .single();

  if (claimError || !claim) return false;

  const { error: entriesError } = await supabase.from('entries').insert(toEntryRows(claim.id, claimEntries));

  if (entriesError) {
    console.error('Could not save claim entries:', entriesError);
    await deleteClaim(claim.id);
    return false;
  }

  return true;
};

/**
 * Each returns { status } where status is one of:
 * 'ok' | 'signed-out' | 'limit' | 'error'
 */
export const submitClaim = async ({ staffDetails, claimEntries, draftClaimId }) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: 'signed-out' };

  const { count: pendingCount, error: countError } = await supabase
    .from('claims')
    .select('*', { count: 'exact', head: true })
    .eq('employee_id', user.id)
    .eq('status', 'Pending');

  if (countError) return { status: 'error' };
  if (pendingCount >= MAX_PENDING) return { status: 'limit' };

  const saved = await insertClaim(user.id, staffDetails, claimEntries, 'Pending');
  if (!saved) return { status: 'error' };

  // If this started as a draft, remove the old draft now that it's properly submitted
  if (draftClaimId) await deleteClaim(draftClaimId);

  return { status: 'ok' };
};

export const saveDraft = async ({ staffDetails, claimEntries, draftClaimId }) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: 'signed-out' };

  // Only enforce the draft limit for a brand new draft, not when re-saving one already in progress
  if (!draftClaimId) {
    const { count } = await supabase
      .from('claims')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', user.id)
      .eq('status', 'Draft');

    if ((count || 0) >= MAX_DRAFTS) return { status: 'limit' };
  }

  const saved = await insertClaim(user.id, staffDetails, claimEntries, 'Draft');
  if (!saved) return { status: 'error' };

  // Replace the old version of a continued draft only once the new one is safely stored
  if (draftClaimId) await deleteClaim(draftClaimId);

  return { status: 'ok' };
};
