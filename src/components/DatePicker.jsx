import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { addDaysISO, formatShortDate, parseISODate, toISODate, todayISO } from '../lib/format';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const weekdayName = new Intl.DateTimeFormat('en-GB', { weekday: 'long' });
const monthName = new Intl.DateTimeFormat('en-GB', { month: 'long' });

const KEY_STEPS = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

const CalendarDialog = ({ value, min, max, title, onCancel, onConfirm }) => {
  const isAllowed = (iso) => (!min || iso >= min) && (!max || iso <= max);
  const clamp = (iso) => (min && iso < min ? min : max && iso > max ? max : iso);

  const [pending, setPending] = useState(() => clamp(value || todayISO()));
  const [view, setView] = useState(() => {
    const date = parseISODate(clamp(value || todayISO()));
    return { year: date.getFullYear(), month: date.getMonth() };
  });
  const dialogRef = useRef(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const select = (iso) => {
    if (!isAllowed(iso)) return;
    setPending(iso);
    const date = parseISODate(iso);
    setView({ year: date.getFullYear(), month: date.getMonth() });
  };

  const changeMonth = (step) => {
    setView(({ year, month }) => {
      const date = new Date(year, month + step, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  };

  const handleKeyDown = (e) => {
    if (KEY_STEPS[e.key]) {
      e.preventDefault();
      select(addDaysISO(pending, KEY_STEPS[e.key]));
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault();
      changeMonth(e.key === 'PageUp' ? -1 : 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onConfirm(pending);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const selected = parseISODate(pending);
  const today = todayISO();
  const firstWeekday = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => toISODate(new Date(view.year, view.month, i + 1)));

  return (
    <div className="fixed inset-0 z-[65] flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 animate-fadeIn bg-gray-950/45 backdrop-blur-[2px]" onClick={onCancel} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="relative w-full max-w-[21rem] animate-scaleIn overflow-hidden rounded-2xl bg-white shadow-2xl outline-none"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="bg-brand-500 py-2 text-center text-sm font-semibold tracking-wide text-white">
          {weekdayName.format(selected)}
        </div>
        <div className="bg-brand-800 px-4 pb-4 pt-3 text-center text-white" aria-live="polite">
          <p className="text-lg font-semibold">{monthName.format(selected)}</p>
          <p className="font-heading text-6xl font-extrabold leading-none tabular">{selected.getDate()}</p>
          <p className="mt-1 text-lg font-semibold text-white/85">{selected.getFullYear()}</p>
        </div>

        <div className="px-4 pb-2 pt-3">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => changeMonth(-1)} className="icon-btn text-brand-700 hover:bg-brand-50" aria-label="Previous month">
              <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
            </button>
            <p className="font-semibold text-gray-900">
              {monthName.format(new Date(view.year, view.month, 1))} {view.year}
            </p>
            <button type="button" onClick={() => changeMonth(1)} className="icon-btn text-brand-700 hover:bg-brand-50" aria-label="Next month">
              <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 text-center text-xs font-semibold text-gray-500">
            {WEEKDAYS.map((day) => (
              <span key={day} className="py-1">{day}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstWeekday }, (_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {days.map((iso) => {
              const allowed = isAllowed(iso);
              const isSelected = iso === pending;
              const isToday = iso === today;
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={!allowed}
                  onClick={() => select(iso)}
                  onDoubleClick={() => allowed && onConfirm(iso)}
                  aria-pressed={isSelected}
                  aria-label={new Intl.DateTimeFormat('en-GB', { dateStyle: 'full' }).format(parseISODate(iso))}
                  className={`tabular h-10 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 ${
                    isSelected
                      ? 'bg-brand-700 font-bold text-white shadow-sm'
                      : allowed
                        ? `text-gray-800 hover:bg-brand-50 ${isToday ? 'font-bold text-brand-700 ring-1 ring-inset ring-brand-600/40' : ''}`
                        : 'cursor-not-allowed text-gray-300'
                  }`}
                >
                  {parseISODate(iso).getDate()}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-4 py-3">
          <button type="button" onClick={onCancel} className="btn-ghost px-4">
            Cancel
          </button>
          <button type="button" onClick={() => onConfirm(pending)} className="btn-primary px-6">
            Ok
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Date field that opens a calendar dialog. value / min / max are YYYY-MM-DD strings.
 * The dialog is portalled to <body> so animated (transformed) parents can't trap it.
 */
const DatePicker = ({ id, value, onChange, min, max, invalid = false, title = 'Choose a date', placeholder = 'dd/mm/yyyy' }) => {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-invalid={invalid}
        className={`group flex min-h-[2.75rem] w-full items-stretch overflow-hidden rounded-xl border bg-white text-left shadow-sm outline-none transition focus-visible:ring-4 ${
          invalid ? 'border-red-400 focus-visible:ring-red-500/15' : 'border-gray-300 focus-visible:border-brand-600 focus-visible:ring-brand-600/15'
        }`}
      >
        <span className={`tabular flex flex-1 items-center truncate px-3.5 text-[15px] ${value ? 'text-gray-900' : 'text-gray-400'}`}>
          {value ? formatShortDate(value) : placeholder}
        </span>
        <span className="flex w-11 shrink-0 items-center justify-center bg-brand-700 text-white transition-colors group-hover:bg-brand-800">
          <CalendarDays className="h-[18px] w-[18px]" />
        </span>
      </button>
      {open &&
        createPortal(
          <CalendarDialog
            value={value}
            min={min}
            max={max}
            title={title}
            onCancel={close}
            onConfirm={(next) => {
              onChange(next);
              close();
            }}
          />,
          document.body
        )}
    </>
  );
};

export default DatePicker;
