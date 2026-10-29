import Link from "next/link";
import { ArrowUpRight, Paperclip } from "lucide-react";
import type { Message } from "@/schema/messageSchema";

export function MessageCard({ message }: { message: Message }) {
  return <article className="rounded-2xl border border-outline bg-surface p-5 sm:p-6">
    <div className="flex items-start justify-between gap-4">
      <time dateTime={message.createdAt} className="text-xs text-ink-muted">{new Date(message.createdAt).toLocaleString()}</time>
      {message.attachmentCount ? <span className="flex shrink-0 items-center gap-1 text-xs text-ink-muted"><Paperclip className="size-3" aria-hidden="true" />{message.attachmentCount} {message.attachmentCount === 1 ? "attachment" : "attachments"}</span> : null}
    </div>
    <p className="mt-4 line-clamp-3 whitespace-pre-wrap text-sm leading-7 wrap-anywhere">{message.content || "A message with attachments."}</p>
    <Link href={`/message/${message._id}`} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-main underline-offset-4 hover:underline">Open message<ArrowUpRight className="size-4" aria-hidden="true" /></Link>
  </article>;
}
