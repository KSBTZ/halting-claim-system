import { Check, CircleAlert, LoaderCircle } from 'lucide-react';
import { getStatusMeta } from '../lib/status';

export const Spinner = ({ className = 'h-4 w-4' }) => <LoaderCircle className={`animate-spin ${className}`} aria-hidden="true" />;

export const StatusBadge = ({ status, className = '' }) => {
  const { label, icon: Icon, badge } = getStatusMeta(status);
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${badge} ${className}`}>
      <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
      {label}
    </span>
  );
};

export const PageHeader = ({ eyebrow, title, description, actions }) => (
  <div className="mb-6 flex animate-slideUp flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-8">
    <div>
      {eyebrow && <p className="eyebrow mb-2 text-brand-600">{eyebrow}</p>}
      <h1 className="font-heading text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{title}</h1>
      {description && <p className="mt-1.5 max-w-2xl text-sm text-gray-600 sm:text-[15px]">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
  </div>
);

export const Stepper = ({ steps, current }) => (
  <ol className="mb-6 flex items-center gap-2 sm:gap-3 lg:mb-8" aria-label="Progress">
    {steps.map((label, i) => {
      const done = i < current;
      const active = i === current;
      return (
        <li key={label} className="flex flex-1 items-center gap-2 last:flex-none sm:gap-3" aria-current={active ? 'step' : undefined}>
          <span className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                done
                  ? 'bg-brand-700 text-sun-400'
                  : active
                    ? 'bg-sun-400 text-brand-800 ring-4 ring-sun-400/30'
                    : 'border border-gray-300 bg-white text-gray-400'
              }`}
            >
              {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <span className={`text-sm font-semibold ${active ? 'text-gray-900' : done ? 'text-brand-700' : 'text-gray-400'}`}>{label}</span>
          </span>
          {i < steps.length - 1 && <span className={`h-0.5 flex-1 rounded-full ${done ? 'bg-brand-600' : 'bg-gray-200'}`} />}
        </li>
      );
    })}
  </ol>
);

const statTones = {
  brand: 'bg-brand-50 text-brand-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-600',
  sun: 'bg-sun-100 text-brand-800',
  gray: 'bg-gray-100 text-gray-600',
};

export const StatCard = ({ label, value, prefix, icon: Icon, tone = 'brand', loading }) => (
  <div className="card p-4 sm:p-5">
    <div className="flex items-center gap-2.5">
      {Icon && (
        <span className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:inline-flex ${statTones[tone]}`}>
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </span>
      )}
      <p className="eyebrow truncate">{label}</p>
    </div>
    {loading ? (
      <div className="skeleton mt-3 h-7 w-20" />
    ) : (
      <p className="tabular mt-2 break-words font-heading text-xl font-bold leading-tight text-gray-900 sm:mt-3 xl:text-2xl">
        {prefix && <span className="block text-xs font-semibold text-gray-500 sm:mr-1 sm:inline sm:text-sm">{prefix}</span>}
        {value}
      </p>
    )}
  </div>
);

export const Tabs = ({ tabs, value, onChange, label }) => (
  <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
    <div role="tablist" aria-label={label} className="inline-flex gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-card">
      {tabs.map((tab) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onChange(tab.value)}
            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30 ${
              selected ? 'bg-brand-700 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`tabular min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold leading-none ${
                  selected ? 'bg-sun-400 text-brand-800' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  </div>
);

export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="card flex animate-fadeIn flex-col items-center px-6 py-14 text-center">
    <span className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
      <span className="absolute -right-1.5 -top-1.5 h-4 w-4 rounded-full border-[3px] border-white bg-sun-400" />
      <Icon className="h-7 w-7" strokeWidth={2} />
    </span>
    <h3 className="font-heading text-lg font-bold text-gray-900">{title}</h3>
    {description && <p className="mt-1.5 max-w-sm text-sm text-gray-600">{description}</p>}
    {action && <div className="mt-6">{action}</div>}
  </div>
);

export const Alert = ({ children }) => (
  <div role="alert" className="flex animate-fadeIn items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />
    <p className="font-medium">{children}</p>
  </div>
);

export const ClaimCardSkeleton = () => (
  <div className="card p-5 sm:p-6">
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="skeleton h-11 w-11 rounded-full" />
        <div className="space-y-2">
          <div className="skeleton h-4 w-40" />
          <div className="skeleton h-3 w-28" />
        </div>
      </div>
      <div className="skeleton h-6 w-20 rounded-full" />
    </div>
    <div className="mt-6 space-y-3">
      <div className="skeleton h-10 w-full rounded-xl" />
      <div className="skeleton h-10 w-full rounded-xl" />
    </div>
  </div>
);
