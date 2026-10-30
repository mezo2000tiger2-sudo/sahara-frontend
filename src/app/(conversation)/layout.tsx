import type { ReactNode } from "react";

export default function ConversationLayout({ children }: { children: ReactNode }) {
  return <main id="main-content" data-conversation-screen className="h-dvh overflow-hidden bg-page">{children}</main>;
}
