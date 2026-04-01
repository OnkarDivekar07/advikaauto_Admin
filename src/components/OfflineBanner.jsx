import { useState, useEffect } from "react";

/**
 * Renders a fixed red banner at the top of the screen when the browser
 * goes offline. Disappears automatically when connection is restored.
 */
export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline  = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online",  goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online",  goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="offline-banner" role="alert">
      📡 You are offline — changes may not be saved until connection is restored.
    </div>
  );
}
