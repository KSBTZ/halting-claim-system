import { useEffect, useState } from 'react';

// Set at build time from the deployed commit (see vite.config.js)
const CURRENT_VERSION = import.meta.env.VITE_APP_VERSION;
const CHECK_EVERY_MS = 5 * 60_000;

/** True once a newer deploy is live than the one this tab is running. */
export const useNewVersion = () => {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV || !CURRENT_VERSION) return;
    let stopped = false;

    const check = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        const { version } = await res.json();
        if (!stopped && version && version !== CURRENT_VERSION) setAvailable(true);
      } catch {
        // Offline or a deploy in progress: try again next time
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    const timer = setInterval(check, CHECK_EVERY_MS);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return available;
};
