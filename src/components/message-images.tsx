"use client";

import { useState } from "react";

function MessageImage({ url, index, compact }: { url: string | null; index: number; compact: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) return <p className="rounded-lg border border-outline bg-surface-muted p-4 text-sm text-ink-muted" aria-label={`Attached image ${index + 1} unavailable`}>Image unavailable.</p>;
  // Use the public delivery URL directly, as profile images do.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={`Image ${index + 1} attached to this message`} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className={compact ? "h-24 w-24 rounded-lg object-cover" : "h-auto w-full min-w-0 rounded-lg object-contain"} />;
}

export function MessageImages({ attachments, compact = false }: { attachments: (string | null)[]; compact?: boolean }) {
  if (!attachments.length) return null;
  return <div className={compact ? "mt-4 flex flex-wrap gap-2" : "mt-3 grid w-full min-w-0 max-w-xl gap-3"}>
    {attachments.map((url, index) => <MessageImage key={`${index}-${url}`} url={url} index={index} compact={compact} />)}
  </div>;
}
