import { CircleAlert, Trash2 } from 'lucide-react';
import { MAX_ALLOWANCE, MAX_NIGHTS, getEntryErrors } from '../lib/claims';

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

// Editable claim entry (form-shaped, see toFormEntries). Leave out onRemove to hide the remove button.
const EntryEditor = ({ entry, index, canRemove, onChange, onRemove }) => {
  const errors = getEntryErrors(entry);
  const id = (name) => `entry-${entry.id}-${name}`;
  const inputClass = (name) => `field-input ${errors[name] ? 'field-input-invalid' : ''}`;
  const bind = (name) => ({
    id: id(name),
    value: entry[name],
    onChange: (e) => onChange(entry.id, name, e.target.value),
    'aria-invalid': Boolean(errors[name]),
    className: inputClass(name),
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

      {/* Below lg the three date fields don't fit side by side, so they wrap; xl fits everything in two rows */}
      <div className="grid grid-cols-12 gap-x-3 gap-y-4 sm:gap-x-4">
        <Field id={id('date')} label="Today's date" className="col-span-12 lg:col-span-4 xl:col-span-3">
          <input type="date" {...bind('date')} />
        </Field>
        <Field id={id('from')} label="From" className="col-span-6 lg:col-span-4 xl:col-span-3">
          <input type="date" max={entry.to || undefined} {...bind('from')} />
        </Field>
        <Field id={id('to')} label="To" error={errors.to} className="col-span-6 lg:col-span-4 xl:col-span-3">
          <input type="date" min={entry.from || undefined} {...bind('to')} />
        </Field>
        <Field id={id('nights')} label="No. of nights" error={errors.nights} className="col-span-5 lg:col-span-4 xl:col-span-3">
          <input type="number" inputMode="numeric" min="1" max={MAX_NIGHTS} placeholder={`1–${MAX_NIGHTS}`} {...bind('nights')} />
        </Field>
        <Field id={id('description')} label="Work description" className="order-last col-span-12 xl:order-none xl:col-span-8">
          <input type="text" maxLength={255} placeholder="e.g. Client site visit, Kumasi branch" {...bind('description')} />
        </Field>
        <Field id={id('allowance')} label="Allowance entitled" error={errors.allowance} className="col-span-7 lg:col-span-8 xl:col-span-4">
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">GHS</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              max={MAX_ALLOWANCE}
              step="0.01"
              placeholder="0.00"
              {...bind('allowance')}
              className={`${inputClass('allowance')} tabular pl-14`}
            />
          </div>
        </Field>
      </div>
    </div>
  );
};

export default EntryEditor;
