import type { Metadata } from "next";
import Link from "next/link";
import { MessageDetail } from "@/features/messages/components/message-detail";
import { objectIdSchema } from "@/schema/messageSchema";

export const metadata: Metadata = { title: "Message | Saharah", robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ messageId: string }> }) {
  const { messageId } = await params;
  if (!objectIdSchema.safeParse(messageId).success) return <div className="space-y-4"><h1 className="font-heading text-page-title font-semibold">Invalid message ID</h1><p className="text-sm text-ink-muted">This message link is invalid.</p><Link href="/message" className="text-main underline">Back to messages</Link></div>;
  return <MessageDetail messageId={messageId} />;
}
