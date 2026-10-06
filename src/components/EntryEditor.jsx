import { CircleAlert, Trash2 } from 'lucide-react';
import { ALLOWANCE_TYPES, getEntryErrors } from '../lib/claims';
import { formatCurrency, pluralize } from '../lib/format';
import { ReceiptUpload } from './ReceiptField';

const Field = ({ id, label, error, className = '', children }) => (
  <div className={`min-w-0 ${className}`}>
    <label htmlFor={id} className="field-label">{label}</label>
    {children}
    {error && (
      <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
        <CircleAlert className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
        {error}
      </p>
    )}
  </div>
);

const MoneyInput = ({ invalid, className = '', ...props }) => (
  <div className="relative">
    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">GHS</span>
    <input
      type="number"
      inputMode="decimal"
      min="0"
      step="0.01"
      placeholder="0.00"
      aria-invalid={invalid}
      className={`field-input tabular pl-14 ${invalid ? 'field-input-invalid' : ''} ${className}`}
      {...props}
    />
  </div>
);

/**
 * Editable claim entry (form-shaped, see toFormEntries).
 * Leave out onRemove to hide the remove button. receiptReadOnly is for managers amending a claim.
 */
const EntryEditor = ({ entry, index, canRemove, onChange, onRemove, receiptReadOnly = false }) => {
  const errors = getEntryErrors(entry);
  const id = (name) => `entry-${entry.id}-${name}`;
  const bind = (name) => ({
    id: id(name),
    value: entry[name] ?? '',
    onChange: (e) => onChange(entry.id, name, e.target.value),
    'aria-invalid': Boolean(errors[name]),
    className: `field-input ${errors[name] ? 'field-input-invalid' : ''}`,
  });
  const money = (name) => ({
    id: id(name),
    value: entry[name] ?? '',
    onChange: (e) => onChange(entry.id, name, e.target.value),
    invalid: Boolean(errors[name]),
  });

  return (
    <div className="animate-slideUp rounded-2xl border border-gray-200 bg-gray-50/60 p-3.5 sm:p-5">
      <div className="mb-4 flex min-h-[2.25rem] items-center justify-between">
        <span className="inline-flex items-center gap-2.5 text-sm font-semibold text-gray-900">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-sun-400">{index + 1}</span>
          Entry {index + 1}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={() => onRemove(entry.id)}
            disabled={!canRemove}
            className="icon-btn hover:bg-red-50 hover:text-red-600"
            title={canRemove ? 'Remove entry' : 'A claim needs at least one entry'}
            aria-label={`Remove entry ${index + 1}`}
          >
            <Trash2 className="h-[18px] w-[18px]" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-12 gap-x-3 gap-y-4 sm:gap-x-4">
        <Field id={id('fromPlace')} label="Travelling from" className="col-span-12 sm:col-span-6">
          <input type="text" maxLength={120} placeholder="e.g. Accra, Head Office" {...bind('fromPlace')} />
        </Field>
        <Field id={id('toPlace')} label="Travelling to" className="col-span-12 sm:col-span-6">
          <input type="text" maxLength={120} placeholder="e.g. Kumasi branch" {...bind('toPlace')} />
        </Field>

        {/* Below lg the date fields don't fit three across, so No. of nights wraps */}
        <Field id={id('from')} label="From date" className="col-span-6 lg:col-span-4">
          <input type="date" max={entry.to || undefined} {...bind('from')} />
        </Field>
        <Field id={id('to')} label="To date" error={errors.to} className="col-span-6 lg:col-span-4">
          <input type="date" min={entry.from || undefined} {...bind('to')} />
        </Field>
        <div className="col-span-12 min-w-0 lg:col-span-4">
          <p className="field-label">No. of nights</p>
          <div className="flex min-h-[2.75rem] items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-100/70 px-3.5 py-2.5" aria-live="polite">
            <span className="tabular text-[15px] font-semibold text-gray-900">{entry.nights ? pluralize(entry.nights, 'night') : '—'}</span>
            <span className="text-xs text-gray-500">From the dates</span>
          </div>
        </div>

        <Field id={id('description')} label="Work description" className="col-span-12">
          <input type="text" maxLength={255} placeholder="e.g. Branch audit and client visits" {...bind('description')} />
        </Field>
      </div>

      <div className="mt-5 border-t border-gray-200 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p id={id('allowance-label')} className="field-label mb-0">Allowance</p>
          <div role="radiogroup" aria-labelledby={id('allowance-label')} className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
            {ALLOWANCE_TYPES.map(({ value, label }) => {
              const selected = entry.allowanceType === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange(entry.id, 'allowanceType', value)}
                  className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30 ${
                    selected ? 'bg-brand-700 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {!entry.allowanceType && (
          <p className="mt-3 text-sm text-gray-500">
            Choose <span className="font-semibold text-gray-700">All-inclusive</span> for a single amount, or{' '}
            <span className="font-semibold text-gray-700">Accommodation</span> to claim accommodation, pocket and T&amp;T allowances.
          </p>
        )}

        {entry.allowanceType === 'all_inclusive' && (
          <div className="mt-4 grid grid-cols-12 gap-4">
            <Field id={id('allInclusive')} label="All-inclusive allowance" error={errors.allInclusive} className="col-span-12 sm:col-span-6">
              <MoneyInput {...money('allInclusive')} />
            </Field>
          </div>
        )}

        {entry.allowanceType === 'accommodation' && (
          <div className="mt-4 grid grid-cols-12 gap-x-3 gap-y-4 sm:gap-x-4">
            <Field id={id('accommodation')} label="Accommodation" error={errors.accommodation} className="col-span-12 sm:col-span-4">
              <MoneyInput {...money('accommodation')} />
            </Field>
            <Field id={id('pocket')} label="Pocket allowance" error={errors.pocket} className="col-span-6 sm:col-span-4">
              <MoneyInput {...money('pocket')} />
            </Field>
            <Field id={id('tnt')} label="T&T allowance" error={errors.tnt} className="col-span-6 sm:col-span-4">
              <MoneyInput {...money('tnt')} />
            </Field>
            <div className="col-span-12">
              <p className="field-label">
                Accommodation receipt (PDF){!receiptReadOnly && <span className="text-red-600"> *</span>}
              </p>
              <ReceiptUpload
                id={id('receipt')}
                path={entry.receiptPath}
                onChange={(path) => onChange(entry.id, 'receiptPath', path)}
                readOnly={receiptReadOnly}
              />
            </div>
          </div>
        )}

        {errors.total && (
          <p className="mt-3 flex items-center gap-1 text-xs font-medium text-red-600">
            <CircleAlert className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
            {errors.total}
          </p>
        )}

        {(entry.allowanceType || entry.allowance > 0) && (
          <div className="mt-4 flex items-center justify-between rounded-xl bg-white px-4 py-2.5 ring-1 ring-gray-200">
            <span className="text-sm text-gray-600">Entry total</span>
            <span className="tabular font-heading font-bold text-brand-700">GHS {formatCurrency(entry.allowance)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default EntryEditor;
