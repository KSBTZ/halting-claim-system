const amountFormatter = new Intl.NumberFormat('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateFormatter = new Intl.DateTimeFormat('en-GH', { day: 'numeric', month: 'short', year: 'numeric' });
const dayMonthFormatter = new Intl.DateTimeFormat('en-GH', { day: 'numeric', month: 'short' });
const dayFormatter = new Intl.DateTimeFormat('en-GH', { day: 'numeric' });

export const formatCurrency = (amount) => amountFormatter.format(Number(amount) || 0);

// Date-only strings (YYYY-MM-DD) are parsed as local dates so they don't shift a day across timezones
const parseDate = (value) => {
  if (!value) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDate = (value) => {
  const date = parseDate(value);
  if (!date) return value || '—';
  return dateFormatter.format(date);
};

export const formatDateRange = (from, to) => {
  const start = parseDate(from);
  const end = parseDate(to);
  if (!start || !end) return [from, to].filter(Boolean).map(formatDate).join(' – ') || '—';
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  if (sameMonth && start.getDate() === end.getDate()) return dateFormatter.format(end);
  // e.g. "2 – 4 Sept 2026", "28 Sept – 2 Oct 2026", "30 Dec 2025 – 2 Jan 2026"
  const startLabel = (sameMonth ? dayFormatter : sameYear ? dayMonthFormatter : dateFormatter).format(start);
  return `${startLabel} – ${dateFormatter.format(end)}`;
};

const pad = (n) => String(n).padStart(2, '0');

// Local YYYY-MM-DD, the format date fields store
export const toISODate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const todayISO = () => toISODate(new Date());

export const parseISODate = (value) => (/^\d{4}-\d{2}-\d{2}$/.test(value || '') ? parseDate(value) : null);

export const addDaysISO = (value, days) => {
  const date = parseISODate(value);
  if (!date) return value;
  date.setDate(date.getDate() + days);
  return toISODate(date);
};

// dd/mm/yyyy, as used across SIC Life's systems
export const formatShortDate = (value) => {
  const date = parseISODate(value);
  return date ? `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}` : '';
};

export const getInitials = (name) =>
  (name || '')
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

export const pluralize = (count, singular, plural = `${singular}s`) => `${count} ${count === 1 ? singular : plural}`;

// Works with both form entries ({ nights, allowance }) and entries table rows
export const getClaimTotals = (entries) => {
  const list = entries || [];
  return {
    totalNights: list.reduce((sum, e) => sum + (Number(e.number_of_nights ?? e.nights) || 0), 0),
    totalAllowance: list.reduce((sum, e) => sum + (Number(e.allowance_entitled ?? e.allowance) || 0), 0),
  };
};
