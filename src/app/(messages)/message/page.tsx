import type { Metadata } from "next";
import { Suspense } from "react";
import { MessagesPage } from "@/features/messages/components/messages-page";

export const metadata: Metadata = { title: "Your messages | Saharah", robots: { index: false, follow: false } };

export default function Page() {
  return <Suspense fallback={<p role="status">Loading messages…</p>}><MessagesPage /></Suspense>;
}
