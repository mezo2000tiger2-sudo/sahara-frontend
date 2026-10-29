"use client";

import { useInView } from "react-intersection-observer";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/loading-spinner";

export function InfiniteScrollFooter({ hasNextPage, fetching, failed, onLoadMore }: {
  hasNextPage: boolean; fetching: boolean; failed: boolean; onLoadMore: () => void;
}) {
  const { ref } = useInView({
    rootMargin: "200px 0px",
    skip: fetching || failed || !hasNextPage,
    fallbackInView: false,
    onChange: (inView) => { if (inView && hasNextPage && !fetching && !failed) onLoadMore(); },
  });
  return <div className="flex flex-col items-center gap-4 py-6">
    <div ref={ref} aria-hidden="true" />
    <p role="status" className="flex items-center gap-2 text-sm text-ink-muted">
      {fetching ? <><LoadingSpinner />Loading…</> : !hasNextPage ? "You’re all caught up." : null}
    </p>
    {hasNextPage ? <Button type="button" variant="outline" disabled={fetching} onClick={onLoadMore}>{failed ? "Retry loading more" : "Load more"}</Button> : null}
  </div>;
}
