import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FilePlus2, Inbox, ListChecks, LogOut, Menu, Moon, Sun, Sunrise, X } from 'lucide-react';
import { supabase } from '../supabase/supabaseClient';
import { useProfile, useUnseenCount } from '../hooks/useAppData';
import { useFeedback } from '../hooks/useFeedback';
import { queryClient } from '../lib/queryClient';
import { firstName, getInitials, timeOfDay } from '../lib/format';
import { Spinner } from './ui';
import logo from '../assets/logo-wordmark.webp';
import art from '../assets/beck.webp';

const GREETING_ICONS = { morning: Sunrise, afternoon: Sun, evening: Moon };

const NAV = {
  employee: [
    { to: '/employee/new-claim', label: 'New Claim', icon: FilePlus2, match: ['/employee/new-claim', '/employee/review'] },
    { to: '/employee/my-requests', label: 'My Requests', icon: ListChecks, match: ['/employee/my-requests'], badgeKey: 'unseen' },
  ],
  manager: [
    { to: '/manager/inbox', label: 'Inbox', icon: Inbox, match: ['/manager/inbox'], badgeKey: 'pending' },
  ],
};

/**
 * Shared shell for signed-in pages: sidebar, mobile top bar and logout.
 * Loads the signed-in profile itself (cached) and sends signed-out visitors to the login page.
 * badges maps a nav badgeKey to a count.
 */
const AppLayout = ({ role = 'employee', badges = {}, children }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { confirm } = useFeedback();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const { data: profile, isPending: loadingProfile } = useProfile();
  const userName = loadingProfile ? null : profile?.staff_name || '';

  const onMyRequests = pathname === '/employee/my-requests';
  const { data: unseenCount = 0 } = useUnseenCount(profile?.id, role === 'employee' && !onMyRequests);
  const roleLabel = role === 'manager' ? profile?.job_title || 'Manager' : 'Employee';
  const period = timeOfDay();
  const GreetingIcon = GREETING_ICONS[period];
  // My Requests marks everything as seen, so there's no badge to show while on it
  const allBadges = { unseen: onMyRequests ? 0 : unseenCount, ...badges };
  const hasBadge = NAV[role].some((item) => item.badgeKey && allBadges[item.badgeKey] > 0);

  useEffect(() => {
    if (!loadingProfile && !profile && !loggingOut) navigate('/');
  }, [loadingProfile, profile, loggingOut, navigate]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: 'Log out?',
      message: "You'll need to sign in again to submit or review claims.",
      confirmLabel: 'Log out',
    });
    if (!confirmed) return;

    setMenuOpen(false);
    setLoggingOut(true);
    // Small artificial delay so the loading screen is actually visible,
    // since signOut() alone usually resolves instantly
    await Promise.all([
      supabase.auth.signOut(),
      new Promise((resolve) => setTimeout(resolve, 600)),
    ]);
    // Nothing from this account should be shown to whoever signs in next
    queryClient.clear();
    navigate('/');
  };

  return (
    <>
      {loggingOut && (
        <div className="fixed inset-0 z-[80] flex animate-fadeIn flex-col items-center justify-center gap-5 bg-brand-800">
          <span className="rounded-2xl bg-white px-3 py-2 shadow-lg">
            <img src={logo} alt="SIC Life" className="h-10 w-auto" />
          </span>
          <Spinner className="h-7 w-7 text-sun-400" />
          <p className="font-heading font-bold tracking-wide text-white">Logging out…</p>
        </div>
      )}

      <div className="flex h-[100dvh] w-full bg-canvas font-body antialiased">
        {menuOpen && (
          <div className="fixed inset-0 z-30 animate-fadeIn bg-gray-950/50 backdrop-blur-[2px] md:hidden" onClick={() => setMenuOpen(false)} />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col overflow-hidden text-white shadow-2xl transition-transform duration-300 ease-out md:static md:w-64 md:translate-x-0 md:shadow-none ${
            menuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand-700 via-brand-800 to-brand-900" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-sun-400/10 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-1/4 h-60 w-60 rounded-full bg-brand-400/15 blur-3xl" />

          <div className="relative px-5 pb-5" style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}>
            <div className="flex items-start justify-between gap-3">
              <span className="shrink-0 rounded-xl bg-white px-2.5 py-1.5 shadow-md shadow-black/10">
                <img src={logo} alt="SIC Life" className="h-9 w-auto" />
              </span>
              <button type="button" onClick={() => setMenuOpen(false)} className="icon-btn text-white/70 hover:bg-white/10 hover:text-white md:hidden" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-4 font-heading text-base font-bold text-white">Halting Claim System</p>
            <p className="text-xs text-white/60">{roleLabel} portal</p>
          </div>

          <div className="relative mx-3 mb-4 overflow-hidden rounded-2xl bg-white/[0.08] px-4 py-3.5 ring-1 ring-white/10">
            <div aria-hidden="true" className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-sun-400/15 blur-xl" />
            <p className="relative flex items-center gap-1.5 text-xs font-medium text-white/70">
              <GreetingIcon className="h-3.5 w-3.5 text-sun-400" strokeWidth={2.5} />
              Good {period}
            </p>
            {userName === null ? (
              <div className="skeleton relative mt-2 h-5 w-32 bg-white/20" />
            ) : (
              <p className="relative mt-1 font-heading text-lg font-bold leading-snug text-white">
                Welcome{userName ? ', ' : ''}
                {userName && <span className="text-sun-400">{firstName(userName)}</span>}
              </p>
            )}
          </div>

          <nav className="relative flex-1 space-y-1 px-3 pt-2" aria-label="Main">
            <p className="eyebrow px-3 pb-2 text-white/40">Menu</p>
            {NAV[role].map(({ to, label, icon: Icon, match, badgeKey }) => {
              const active = match.includes(pathname);
              const badge = badgeKey ? allBadges[badgeKey] : 0;
              return (
                <Link
                  key={to}
                  to={to}
                  aria-current={active ? 'page' : undefined}
                  onClick={(e) => {
                    // Re-clicking the current section shouldn't reset an in-progress claim
                    if (active) e.preventDefault();
                    setMenuOpen(false);
                  }}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun-400/60 ${
                    active ? 'bg-sun-400 font-semibold text-brand-800 shadow-md shadow-black/15' : 'font-medium text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                  {label}
                  {badge > 0 && (
                    <span
                      className={`tabular ml-auto min-w-[1.375rem] rounded-full px-1.5 py-0.5 text-center text-xs font-bold ${
                        active ? 'bg-brand-700 text-sun-400' : 'bg-sun-400 text-brand-800'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="relative border-t border-white/10 p-3" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
            <div className="flex items-center gap-3 px-2 py-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sun-400 font-heading text-sm font-bold text-brand-800 ring-4 ring-white/10">
                {userName ? getInitials(userName) : ''}
              </span>
              <div className="min-w-0">
                {userName === null ? (
                  <div className="skeleton mb-1 h-3.5 w-28 bg-white/20" />
                ) : (
                  <p className="truncate text-sm font-semibold text-white">{userName || roleLabel}</p>
                )}
                <p className="text-xs text-white/60">{roleLabel}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-sun-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun-400/60"
            >
              <LogOut className="h-[18px] w-[18px]" />
              Log out
            </button>
          </div>
        </aside>

        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <header
            className="flex items-center gap-3 bg-brand-700 px-4 pb-3 text-white shadow-md md:hidden"
            style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
          >
            <button type="button" onClick={() => setMenuOpen(true)} className="relative -ml-1 rounded-lg p-1.5 transition-colors hover:bg-white/10" aria-label="Open menu">
              <Menu className="h-6 w-6" />
              {hasBadge && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-sun-400 ring-2 ring-brand-700" />}
            </button>
            <span className="rounded-lg bg-white px-1.5 py-1">
              <img src={logo} alt="SIC Life" className="h-6 w-auto" />
            </span>
            <span className="font-heading text-[15px] font-bold">Halting Claims</span>
            {userName && (
              <span className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-sun-400 font-heading text-xs font-bold text-brand-800">
                {getInitials(userName)}
              </span>
            )}
          </header>

          <main className="relative flex-1 overflow-y-auto">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-cover bg-center opacity-[0.18]" style={{ backgroundImage: `url(${art})` }} />
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-canvas/0 via-canvas/70 to-canvas" />
            <div className="relative mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">{children}</div>
          </main>
        </div>
      </div>
    </>
  );
};

export default AppLayout;
