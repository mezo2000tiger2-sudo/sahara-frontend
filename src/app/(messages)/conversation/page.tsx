import type { Metadata } from "next";
import { ConversationList } from "@/features/conversations/components/conversation-list";

export const metadata: Metadata = { title: "Conversations | Saharah", robots: { index: false, follow: false } };

export default function Page() {
  return <ConversationList />;
}
