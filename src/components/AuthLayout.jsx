import { ClipboardCheck, FilePlus2, ShieldCheck } from 'lucide-react';
import logo from '../assets/logo-wordmark.webp';
import teamPhoto from '../assets/man.webp';

const FEATURES = [
  { icon: FilePlus2, title: 'Submit in minutes', text: 'Log your halting nights and allowances in one simple form.' },
  { icon: ClipboardCheck, title: 'Track every request', text: 'See at a glance whether a claim is pending, approved or returned.' },
  { icon: ShieldCheck, title: 'Reviewed in one place', text: 'Managers approve, amend or decline claims from a single inbox.' },
];

const AuthLayout = ({ title, subtitle, children }) => (
  <div className="flex min-h-[100dvh] w-full animate-fadeIn bg-white font-body antialiased">
    {/* Brand panel (desktop) */}
    <aside className="relative hidden w-[46%] flex-col justify-between overflow-hidden p-12 text-white lg:sticky lg:top-0 lg:flex lg:h-[100dvh] xl:w-1/2 xl:p-16">
      <img src={teamPhoto} alt="" className="absolute inset-0 h-full w-full scale-105 object-cover blur-[2px]" />
      <div className="absolute inset-0 bg-gradient-to-br from-brand-950/95 via-brand-900/85 to-brand-700/80" />
      <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-sun-400/15 blur-3xl" />
      <svg className="absolute inset-0 h-full w-full opacity-40" viewBox="0 0 800 800" preserveAspectRatio="none" aria-hidden="true">
        <path d="M-100,200 C150,-100 350,700 900,100" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.5" />
        <path d="M200,-100 C100,300 700,500 800,900" fill="none" stroke="#fff700" strokeWidth="2" opacity="0.7" />
        <path d="M100,800 C300,900 400,300 600,400 S700,800 1000,600" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.4" />
      </svg>

      <div className="relative">
        <span className="inline-flex rounded-2xl bg-white px-4 py-3 shadow-xl shadow-black/20">
          <img src={logo} alt="SIC Life — Absolute peace of mind" className="h-14 w-auto" />
        </span>
      </div>

      <div className="relative max-w-lg">
        <p className="eyebrow mb-4 text-sun-400">Staff portal</p>
        <h1 className="font-heading text-4xl font-extrabold leading-[1.1] tracking-tight xl:text-5xl">
          Halting Claim <span className="text-sun-400">System</span>
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-white/80">
          Submit, review and manage your nightly allowance claims, all in one place.
        </p>

        <ul className="mt-10 space-y-5">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sun-400 ring-1 ring-white/15 backdrop-blur-sm">
                <Icon className="h-5 w-5" strokeWidth={2.25} />
              </span>
              <div>
                <p className="font-semibold text-white">{title}</p>
                <p className="text-sm text-white/70">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-xs text-white/50">© {new Date().getFullYear()} SIC Life Insurance · Absolute peace of mind</p>
    </aside>

    {/* Form panel */}
    <main className="relative flex min-w-0 flex-1 flex-col bg-canvas lg:bg-white">
      {/* Brand header (mobile) */}
      <div
        className="relative overflow-hidden bg-brand-700 px-6 pb-16 text-white lg:hidden"
        style={{ paddingTop: 'calc(2rem + env(safe-area-inset-top))' }}
      >
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sun-400/20 blur-2xl" />
        <div className="absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-brand-400/30 blur-2xl" />
        <span className="relative inline-flex rounded-xl bg-white px-3 py-2 shadow-lg shadow-black/20">
          <img src={logo} alt="SIC Life" className="h-9 w-auto" />
        </span>
        <p className="relative mt-5 font-heading text-2xl font-extrabold tracking-tight">
          Halting Claim <span className="text-sun-400">System</span>
        </p>
        <p className="relative mt-1 text-sm text-white/75">Nightly allowance claims, all in one place.</p>
      </div>

      <div className="relative -mt-8 flex flex-1 justify-center rounded-t-3xl bg-white px-6 pb-10 pt-8 sm:px-12 lg:mt-0 lg:items-center lg:rounded-none lg:py-12">
        <div className="w-full max-w-md">
          <span className="mb-6 hidden h-1.5 w-12 rounded-full bg-sun-400 lg:block" />
          <h2 className="font-heading text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{title}</h2>
          {subtitle && <p className="mt-2 text-gray-600">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </main>
  </div>
);

export default AuthLayout;
