import type { Metadata } from "next";
import Link from "next/link";
import { ConversationChat } from "@/features/conversations/components/conversation-chat";
import { objectIdSchema } from "@/schema/messageSchema";

export const metadata: Metadata = { title: "Conversation | Saharah", robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  if (!objectIdSchema.safeParse(conversationId).success) return <div className="space-y-4 p-6 sm:p-8"><h1 className="font-heading text-page-title font-semibold">Invalid conversation ID</h1><p className="text-sm text-ink-muted">This conversation link is invalid.</p><Link href="/conversation" className="text-main underline">Back to conversations</Link></div>;
  return <ConversationChat key={conversationId} conversationId={conversationId} />;
}
