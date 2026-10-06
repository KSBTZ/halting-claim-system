/**
 * Approval chain.
 * Approvers are manager accounts with an approval_level (1 = first level, e.g. Manager).
 * Employees send claims to a first-level approver; approvers below the top level recommend
 * and forward to someone higher, and only the highest level gives final approval.
 * Each claim keeps a review_trail of steps so everyone can see where it has been.
 */

const levels = (approvers) => approvers.map((a) => a.approval_level).filter((level) => level != null);

export const lowestLevel = (approvers) => (levels(approvers).length ? Math.min(...levels(approvers)) : null);
export const topLevel = (approvers) => (levels(approvers).length ? Math.max(...levels(approvers)) : null);

export const firstLevelApprovers = (approvers) => approvers.filter((a) => a.approval_level === lowestLevel(approvers));

export const higherApprovers = (approvers, level) => approvers.filter((a) => level != null && a.approval_level > level);

export const isFinalApprover = (approvers, level) => level != null && topLevel(approvers) != null && level >= topLevel(approvers);

export const approverLabel = (approver) =>
  approver ? [approver.staff_name, approver.job_title].filter(Boolean).join(' · ') : '';

export const trailStep = ({ action, by, to, comment }) => ({
  action,
  at: new Date().toISOString(),
  by_id: by?.id ?? null,
  by_name: by?.staff_name ?? null,
  by_title: by?.job_title ?? null,
  to_id: to?.id ?? null,
  to_name: to?.staff_name ?? null,
  to_title: to?.job_title ?? null,
  comment: comment?.trim() || null,
});

// Claims sent before routing existed have no approver or trail; every approver still sees those
export const isUnrouted = (claim) => !claim.current_approver_id && !(claim.review_trail || []).length;

// Finished claims leave approvers' inboxes this long after the final decision.
// They aren't deleted: the employee keeps them and they stay in the database.
export const INBOX_KEEP_DAYS = 7;

export const isRecentlyDecided = (claim, now = Date.now()) => {
  const decidedAt = Date.parse(claim.reviewed_at || claim.submitted_at || '');
  return Number.isFinite(decidedAt) && now - decidedAt < INBOX_KEEP_DAYS * 86_400_000;
};

export const handledBy = (claim, userId) =>
  (claim.review_trail || []).some((step) => step.by_id === userId && step.action !== 'submitted');

export const forwardedBy = (claim, userId) =>
  (claim.review_trail || []).some((step) => step.by_id === userId && step.action === 'forwarded');
