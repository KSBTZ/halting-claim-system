import { supabase } from '../supabase/supabaseClient';
import { todayISO } from './format';
import { trailStep } from './approvals';

export const CLAIM_STEPS = ['Details', 'Review & sign', 'Submit'];

export const MAX_ENTRIES = 3;
export const MAX_PENDING = 3;
export const MAX_DRAFTS = 5;
export const MAX_ALLOWANCE = 50000;

// All-inclusive is a fixed amount per night that staff can't change.
// Placeholder rate: replace with SIC Life's official figure.
export const ALL_INCLUSIVE_RATE_PER_NIGHT = 400;

export const ALLOWANCE_TYPES = [
  { value: 'all_inclusive', label: 'All-inclusive' },
  { value: 'accommodation', label: 'Accommodation' },
];

export const getAllowanceLabel = (type) => ALLOWANCE_TYPES.find((t) => t.value === type)?.label || '';

// Whole nights between two YYYY-MM-DD dates, e.g. 2 Sept → 4 Sept is 2 nights
export const nightsBetween = (from, to) => {
  if (!from || !to) return 0;
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000;
  return Number.isFinite(days) && days > 0 ? Math.round(days) : 0;
};

const amount = (value) => Number(value) || 0;
const money = (value) => Math.round(value * 100) / 100;

// T&T is paid for the trip there and the trip back
export const TNT_TRIPS = 2;

/**
 * What each accommodation component comes to. Accommodation and pocket allowance are
 * entered per day and multiplied by the nights; T&T is entered one way and doubled.
 */
export const accommodationParts = (entry, nights = entry.nights) => ({
  accommodation: money(amount(entry.accommodation) * amount(nights)),
  pocket: money(amount(entry.pocket) * amount(nights)),
  tnt: money(amount(entry.tnt) * TNT_TRIPS),
});

/**
 * Recomputes the derived fields of a form entry:
 * - nights comes from the From/To dates
 * - allowance is the entry total: nights × the fixed all-inclusive rate, or
 *   (accommodation + pocket allowance) per day × nights + T&T × 2.
 *   Entries saved before allowance types existed keep their stored total.
 */
export const normalizeEntry = (entry) => {
  const nights = entry.from && entry.to ? nightsBetween(entry.from, entry.to) : amount(entry.nights);
  let allowance = amount(entry.allowance);
  if (entry.allowanceType === 'all_inclusive') allowance = nights * ALL_INCLUSIVE_RATE_PER_NIGHT;
  if (entry.allowanceType === 'accommodation') {
    const parts = accommodationParts(entry, nights);
    allowance = money(parts.accommodation + parts.pocket + parts.tnt);
  }
  return { ...entry, nights, allowance };
};

export const emptyEntry = (id, date = '') => ({
  id,
  date,
  from: '',
  to: '',
  fromPlace: '',
  toPlace: '',
  description: '',
  allowanceType: '',
  accommodation: '',
  pocket: '',
  tnt: '',
  receiptPath: '',
  nights: 0,
  allowance: 0,
});

// Form entries use short keys; the entries table uses its own column names.
// Empty dates are sent as null since '' isn't a valid date value.
export const toEntryColumns = (entry) => {
  const { nights, allowance } = normalizeEntry(entry);
  const isAccommodation = entry.allowanceType === 'accommodation';
  const parts = accommodationParts(entry, nights);
  // The *_amount/_allowance columns hold what each part comes to; the per-day and one-way
  // columns keep what was typed, so a draft saved before its dates are picked loses nothing
  return {
    date: entry.date || null,
    from_date: entry.from || null,
    to_date: entry.to || null,
    from_location: entry.fromPlace?.trim() || null,
    to_location: entry.toPlace?.trim() || null,
    number_of_nights: nights,
    work_description: entry.description,
    allowance_type: entry.allowanceType || null,
    accommodation_amount: isAccommodation ? parts.accommodation : null,
    pocket_allowance: isAccommodation ? parts.pocket : null,
    tnt_allowance: isAccommodation ? parts.tnt : null,
    accommodation_per_day: isAccommodation ? amount(entry.accommodation) : null,
    pocket_per_day: isAccommodation ? amount(entry.pocket) : null,
    tnt_one_way: isAccommodation ? amount(entry.tnt) : null,
    receipt_path: isAccommodation ? entry.receiptPath || null : null,
    allowance_entitled: allowance,
  };
};

export const toEntryRows = (claimId, claimEntries) =>
  claimEntries.map((entry) => ({ claim_id: claimId, ...toEntryColumns(entry) }));

// Zero amounts are what an unfilled draft field gets saved as, so show them as blank again.
// Nights and totals are kept exactly as saved; editors recalculate them with normalizeEntry.
// Entries saved before per-day amounts existed only have totals, so work the rates back out
const perUnit = (saved, total, units) => saved ?? (total && units ? money(total / units) : total);

export const toFormEntries = (rows = []) =>
  (rows || []).map((row) => ({
    id: row.id,
    date: row.date || '',
    from: row.from_date || '',
    to: row.to_date || '',
    fromPlace: row.from_location || '',
    toPlace: row.to_location || '',
    description: row.work_description || '',
    allowanceType: row.allowance_type || '',
    accommodation: perUnit(row.accommodation_per_day, row.accommodation_amount, row.number_of_nights) || '',
    pocket: perUnit(row.pocket_per_day, row.pocket_allowance, row.number_of_nights) || '',
    tnt: perUnit(row.tnt_one_way, row.tnt_allowance, TNT_TRIPS) || '',
    receiptPath: row.receipt_path || '',
    nights: row.number_of_nights || 0,
    allowance: row.allowance_entitled || 0,
  }));

const AMOUNT_FIELDS = ['accommodation', 'pocket', 'tnt'];

export const getEntryErrors = (entry) => {
  const errors = {};
  if (entry.from && entry.to && entry.to <= entry.from) {
    errors.to = 'Must be after the From date';
  }
  AMOUNT_FIELDS.forEach((field) => {
    if (entry[field] !== '' && entry[field] !== undefined && Number(entry[field]) < 0) {
      errors[field] = "Can't be negative";
    }
  });
  if (normalizeEntry(entry).allowance > MAX_ALLOWANCE) {
    errors.total = 'The entry total can\'t be more than GHS 50,000';
  }
  return errors;
};

// requireReceipt is off when a manager amends a claim, since only the employee can upload
export const isEntryComplete = (entry, { requireReceipt = true } = {}) => {
  const filled = [entry.from, entry.to, entry.fromPlace, entry.toPlace, entry.description].every((value) => String(value || '').trim());
  if (!filled || !entry.allowanceType || Object.keys(getEntryErrors(entry)).length > 0) return false;
  if (entry.allowanceType === 'all_inclusive') return nightsBetween(entry.from, entry.to) > 0;
  return amount(entry.accommodation) > 0 && (!requireReceipt || Boolean(entry.receiptPath));
};

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

// Inserts a claim with its entries, removing the claim again if the entries fail to save.
// Every entry is dated the day it's saved, so a draft finished later gets the day it's sent.
const insertClaim = async (userId, staffDetails, claimEntries, status, extraFields = {}) => {
  const { data: claim, error: claimError } = await supabase
    .from('claims')
    .insert([{ employee_id: userId, ...staffFields(staffDetails), status, ...extraFields }])
    .select()
    .single();

  if (claimError || !claim) return false;

  const today = todayISO();
  const rows = toEntryRows(claim.id, claimEntries.map((entry) => ({ ...entry, date: today })));
  const { error: entriesError } = await supabase.from('entries').insert(rows);

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
export const submitClaim = async ({ staffDetails, claimEntries, draftClaimId, signature, approver }) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: 'signed-out' };

  const { count: pendingCount, error: countError } = await supabase
    .from('claims')
    .select('*', { count: 'exact', head: true })
    .eq('employee_id', user.id)
    .eq('status', 'Pending');

  if (countError) return { status: 'error' };
  if (pendingCount >= MAX_PENDING) return { status: 'limit' };

  const saved = await insertClaim(user.id, staffDetails, claimEntries, 'Pending', {
    signature,
    current_approver_id: approver.id,
    current_approver_name: approver.staff_name,
    current_approver_title: approver.job_title || null,
    review_trail: [trailStep({ action: 'submitted', by: { id: user.id, staff_name: staffDetails.staff_name }, to: approver })],
  });
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

// Read the latest history right before adding to it, so a cached copy never overwrites a newer step
const latestTrail = async (claimId) => {
  const { data, error } = await supabase.from('claims').select('review_trail').eq('id', claimId).single();
  if (error) throw error;
  return data?.review_trail || [];
};

const updateClaim = async (claimId, changes, step) => {
  try {
    const trail = await latestTrail(claimId);
    const { error } = await supabase.from('claims').update({ ...changes, review_trail: [...trail, step] }).eq('id', claimId);
    if (error) throw error;
    return { status: 'ok' };
  } catch (error) {
    console.error('Could not update claim:', error);
    return { status: 'error' };
  }
};

/** A lower-level approver recommends the claim and passes it up the chain. */
export const forwardClaim = ({ claimId, by, to, comment }) =>
  updateClaim(
    claimId,
    { current_approver_id: to.id, current_approver_name: to.staff_name, current_approver_title: to.job_title || null },
    trailStep({ action: 'forwarded', by, to, comment })
  );

/** Final approval (top level only) or disapproval (any level). Either way the claim leaves every inbox. */
export const decideClaim = ({ claimId, by, decision, comment }) =>
  updateClaim(
    claimId,
    {
      status: decision,
      manager_comment: comment?.trim() || null,
      reviewed_at: new Date().toISOString(),
      seen_by_employee: false,
      current_approver_id: null,
      current_approver_name: null,
      current_approver_title: null,
    },
    trailStep({ action: decision === 'Approved' ? 'approved' : 'disapproved', by, comment })
  );

export const recordAmendment = ({ claimId, by }) => updateClaim(claimId, {}, trailStep({ action: 'amended', by }));
