"use client";

import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";

export function SessionRenewal() {
  const [renewing, setRenewing] = useState(false);
  useEffect(() => {
    const start = () => setRenewing(true);
    const end = () => setRenewing(false);
    window.addEventListener("session-renewal-start", start);
    window.addEventListener("session-renewal-end", end);
    return () => {
      window.removeEventListener("session-renewal-start", start);
      window.removeEventListener("session-renewal-end", end);
    };
  }, []);
  if (!renewing) return null;
  return <div role="status" aria-live="polite" className="fixed inset-0 z-50 flex items-center justify-center gap-3 bg-surface">
    <LoadingSpinner />Renewing your session…
  </div>;
}
