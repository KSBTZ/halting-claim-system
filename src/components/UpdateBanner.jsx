import { RefreshCw } from 'lucide-react';
import { useNewVersion } from '../hooks/useNewVersion';

const UpdateBanner = () => {
  const available = useNewVersion();
  if (!available) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[75] flex justify-center px-4"
      style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
    >
      <div className="flex animate-toastIn items-center gap-3 rounded-full bg-brand-800 py-1.5 pl-4 pr-1.5 text-sm text-white shadow-lift">
        <span>A new version of the app is ready.</span>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-1.5 rounded-full bg-sun-400 px-3 py-1.5 text-xs font-bold text-brand-800 transition-colors hover:bg-sun-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun-400/60"
        >
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.5} />
          Refresh
        </button>
      </div>
    </div>
  );
};

export default UpdateBanner;
