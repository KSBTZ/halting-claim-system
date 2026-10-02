import { CalendarDays, Moon } from 'lucide-react';
import { formatCurrency, formatDate, formatDateRange, pluralize } from '../lib/format';

const COLUMNS = 'grid-cols-[minmax(0,1.15fr)_4rem_minmax(0,1.6fr)_7.5rem] gap-4';

// Read-only list of claim entries. Expects form-shaped entries (see toFormEntries).
// Switches between a table and stacked rows based on its own width (see .entry-table in index.css).
const EntryTable = ({ entries }) => (
  <div className="entry-table">
    <div className={`entry-wide eyebrow px-4 pb-2 ${COLUMNS}`}>
      <div>Period</div>
      <div className="text-center">Nights</div>
      <div>Work description</div>
      <div className="text-right">Allowance</div>
    </div>

    <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200/80 bg-white">
      {entries.map((entry) => (
        <li key={entry.id} className="px-4 py-3.5 transition-colors hover:bg-gray-50/70">
          <div className="entry-narrow">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-gray-900">{formatDateRange(entry.from, entry.to)}</p>
              <p className="tabular whitespace-nowrap font-semibold text-gray-900">GHS {formatCurrency(entry.allowance)}</p>
            </div>
            <p className="mt-1 text-sm text-gray-600">{entry.description || '—'}</p>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1">
                <Moon className="h-3.5 w-3.5" />
                {pluralize(Number(entry.nights) || 0, 'night')}
              </span>
              {entry.date && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Dated {formatDate(entry.date)}
                </span>
              )}
            </p>
          </div>

          <div className={`entry-wide items-center text-sm ${COLUMNS}`}>
            <div className="min-w-0">
              <p className="font-medium text-gray-900">{formatDateRange(entry.from, entry.to)}</p>
              {entry.date && <p className="mt-0.5 text-xs text-gray-500">Dated {formatDate(entry.date)}</p>}
            </div>
            <div className="text-center">
              <span className="tabular inline-flex min-w-[2rem] justify-center rounded-md bg-gray-100 px-2 py-0.5 font-semibold text-gray-700">
                {Number(entry.nights) || 0}
              </span>
            </div>
            <div className="min-w-0 text-gray-700">{entry.description || '—'}</div>
            <div className="tabular text-right font-semibold text-gray-900">
              <span className="mr-1 text-xs font-medium text-gray-400">GHS</span>
              {formatCurrency(entry.allowance)}
            </div>
          </div>
        </li>
      ))}
    </ul>
  </div>
);

export default EntryTable;
