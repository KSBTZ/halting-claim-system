import { CircleCheck, CircleX, Clock, PencilLine, Pencil } from 'lucide-react';

export const STATUS_META = {
  Draft: {
    label: 'Draft',
    icon: PencilLine,
    badge: 'bg-gray-100 text-gray-700 ring-gray-500/20',
    accent: 'before:bg-gray-300',
    soft: 'bg-gray-50 border-gray-200',
  },
  Pending: {
    label: 'Pending',
    icon: Clock,
    badge: 'bg-amber-50 text-amber-800 ring-amber-600/25',
    accent: 'before:bg-amber-400',
    soft: 'bg-amber-50/60 border-amber-200',
  },
  Approved: {
    label: 'Approved',
    icon: CircleCheck,
    badge: 'bg-brand-50 text-brand-700 ring-brand-600/25',
    accent: 'before:bg-brand-600',
    soft: 'bg-brand-50/70 border-brand-200',
  },
  Disapproved: {
    label: 'Disapproved',
    icon: CircleX,
    badge: 'bg-red-50 text-red-700 ring-red-600/20',
    accent: 'before:bg-red-500',
    soft: 'bg-red-50/70 border-red-200',
  },
  Amended: {
    label: 'Amended',
    icon: Pencil,
    badge: 'bg-sky-50 text-sky-700 ring-sky-600/20',
    accent: 'before:bg-sky-500',
    soft: 'bg-sky-50/70 border-sky-200',
  },
};

// Unknown statuses keep their own label but borrow the neutral Draft styling
export const getStatusMeta = (status) => STATUS_META[status] || { ...STATUS_META.Draft, label: status || 'Unknown' };
