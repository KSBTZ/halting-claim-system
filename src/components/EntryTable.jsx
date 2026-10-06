import { CalendarDays, Moon, Wallet } from 'lucide-react';
import { getAllowanceLabel } from '../lib/claims';
import { formatCurrency, formatDateRange, pluralize } from '../lib/format';
import { ReceiptLink } from './ReceiptField';

const COLUMNS = 'grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_8.5rem] gap-4';

const routeOf = (entry) => (entry.fromPlace || entry.toPlace ? `${entry.fromPlace || '—'} → ${entry.toPlace || '—'}` : '');

const Breakdown = ({ entry }) => {
  if (entry.allowanceType !== 'accommodation') return null;
  const parts = [
    ['Accommodation', entry.accommodation],
    ['Pocket', entry.pocket],
    ['T&T', entry.tnt],
  ];
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
      {parts.map(([label, value]) => (
        <span key={label} className="tabular inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          {label}
          <span className="font-semibold text-gray-800">{formatCurrency(value)}</span>
        </span>
      ))}
      {entry.receiptPath ? (
        <ReceiptLink path={entry.receiptPath} />
      ) : (
        <span className="px-1 text-xs font-medium text-red-600">No receipt</span>
      )}
    </div>
  );
};

// Read-only list of claim entries. Expects form-shaped entries (see toFormEntries).
// Switches between a table and stacked rows based on its own width (see .entry-table in index.css).
const EntryTable = ({ entries }) => (
  <div className="entry-table">
    <div className={`entry-wide eyebrow px-4 pb-2 ${COLUMNS}`}>
      <div>Trip</div>
      <div>Work description</div>
      <div className="text-right">Allowance</div>
    </div>

    <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200/80 bg-white">
      {entries.map((entry) => {
        const route = routeOf(entry);
        const period = formatDateRange(entry.from, entry.to);
        const nights = pluralize(Number(entry.nights) || 0, 'night');
        const allowanceLabel = getAllowanceLabel(entry.allowanceType);

        return (
          <li key={entry.id} className="px-4 py-3.5 transition-colors hover:bg-gray-50/70">
            <div className="entry-narrow">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 font-semibold text-gray-900">{route || period}</p>
                <p className="tabular whitespace-nowrap font-semibold text-gray-900">GHS {formatCurrency(entry.allowance)}</p>
              </div>
              <p className="mt-1 text-sm text-gray-600">{entry.description || '—'}</p>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                {route && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {period}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Moon className="h-3.5 w-3.5" />
                  {nights}
                </span>
                {allowanceLabel && (
                  <span className="inline-flex items-center gap-1">
                    <Wallet className="h-3.5 w-3.5" />
                    {allowanceLabel}
                  </span>
                )}
              </p>
            </div>

            <div className={`entry-wide items-start text-sm ${COLUMNS}`}>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900">{route || period}</p>
                <p className="mt-0.5 text-xs text-gray-500">{route ? `${period} · ${nights}` : nights}</p>
              </div>
              <div className="min-w-0 text-gray-700">{entry.description || '—'}</div>
              <div className="text-right">
                <p className="tabular font-semibold text-gray-900">
                  <span className="mr-1 text-xs font-medium text-gray-400">GHS</span>
                  {formatCurrency(entry.allowance)}
                </p>
                {allowanceLabel && <p className="mt-0.5 text-xs text-gray-500">{allowanceLabel}</p>}
              </div>
            </div>

            <Breakdown entry={entry} />
          </li>
        );
      })}
    </ul>
  </div>
);

export default EntryTable;
