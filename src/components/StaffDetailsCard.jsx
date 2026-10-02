import { Award, Building2, IdCard, Lock, UserRound } from 'lucide-react';

const FIELDS = [
  { key: 'staff_name', label: 'Name', icon: UserRound },
  { key: 'department', label: 'Department', icon: Building2 },
  { key: 'grade', label: 'Grade', icon: Award },
  { key: 'staff_no', label: 'Staff no.', icon: IdCard },
];

// compact keeps a 2×2 grid for narrow columns
const StaffDetailsCard = ({ staffDetails, compact = false }) => (
  <section className="card p-4 sm:p-6">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="font-heading text-base font-bold text-gray-900 sm:text-lg">Staff details</h2>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
        <Lock className="h-3 w-3" strokeWidth={2.5} />
        From your profile
      </span>
    </div>
    <dl className={`grid grid-cols-2 gap-2.5 sm:gap-3 ${compact ? '' : 'lg:grid-cols-4'}`}>
      {FIELDS.map(({ key, label, icon: Icon }) => (
        <div key={key} className="flex min-w-0 items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
          <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-700 shadow-sm ring-1 ring-gray-200/70 sm:flex">
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0">
            <dt className="eyebrow">{label}</dt>
            <dd className="truncate text-sm font-semibold text-gray-900" title={staffDetails[key]}>
              {staffDetails[key] || '—'}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  </section>
);

export default StaffDetailsCard;
