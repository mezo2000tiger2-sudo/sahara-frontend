import { Alert } from "@/components/ui/alert";
import { ProfileApiError } from "@/features/profile/errors";

export function MessageError({ error }: { error: Error }) {
  const messages = [...new Set([error.message, ...(error instanceof ProfileApiError ? error.details?.map((detail) => detail.message) ?? [] : [])])];
  return <Alert variant="destructive" className="border-danger/40 bg-danger-soft! p-4! text-danger! wrap-anywhere">
    <ul className="list-disc space-y-1 pl-5">{messages.map((message) => <li key={message}>{message}</li>)}</ul>
  </Alert>;
}
