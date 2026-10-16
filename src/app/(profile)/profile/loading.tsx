import { LoadingSpinner } from "@/components/loading-spinner";

export default function ProfileLoading() {
  return <div role="status" className="flex items-center gap-3 py-8 text-sm text-ink-muted">
    <LoadingSpinner />Loading profile…
  </div>;
}
