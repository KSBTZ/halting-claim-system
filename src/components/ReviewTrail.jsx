import { CircleCheck, CircleX, Clock, Forward, Pencil, Send } from 'lucide-react';

const timeFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const person = (name, title) => [name || 'Someone', title].filter(Boolean).join(', ');

const STEPS = {
  submitted: { icon: Send, tone: 'bg-gray-100 text-gray-600', text: (s) => <>Submitted to <b>{person(s.to_name, s.to_title)}</b></> },
  forwarded: { icon: Forward, tone: 'bg-sky-50 text-sky-700', text: (s) => <><b>{person(s.by_name, s.by_title)}</b> recommended it and forwarded to <b>{person(s.to_name, s.to_title)}</b></> },
  amended: { icon: Pencil, tone: 'bg-gray-100 text-gray-600', text: (s) => <><b>{person(s.by_name, s.by_title)}</b> amended the entries</> },
  approved: { icon: CircleCheck, tone: 'bg-brand-50 text-brand-700', text: (s) => <><b>{person(s.by_name, s.by_title)}</b> gave final approval</> },
  disapproved: { icon: CircleX, tone: 'bg-red-50 text-red-600', text: (s) => <><b>{person(s.by_name, s.by_title)}</b> disapproved it</> },
};

/** Where a claim has been, and who it's waiting on if it's still pending. */
const ReviewTrail = ({ claim }) => {
  const steps = (claim.review_trail || []).filter((step) => STEPS[step.action]);
  const waiting = claim.status === 'Pending' && claim.current_approver_name;
  if (!steps.length && !waiting) return null;

  return (
    <ol className="space-y-2.5">
      {steps.map((step, i) => {
        const { icon: Icon, tone, text } = STEPS[step.action];
        return (
          <li key={`${step.at}-${i}`} className="flex gap-3 text-sm">
            <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${tone}`}>
              <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
              <p className="text-gray-700 [&_b]:font-semibold [&_b]:text-gray-900">{text(step)}</p>
              {step.comment && <p className="mt-0.5 text-gray-600">“{step.comment}”</p>}
              {step.at && <p className="text-xs text-gray-400">{timeFormat.format(new Date(step.at))}</p>}
            </div>
          </li>
        );
      })}
      {waiting && (
        <li className="flex gap-3 text-sm">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 animate-pulse items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <Clock className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
          <p className="pt-0.5 text-gray-700">
            Waiting on <b className="font-semibold text-gray-900">{person(claim.current_approver_name, claim.current_approver_title)}</b>
          </p>
        </li>
      )}
    </ol>
  );
};

export default ReviewTrail;
