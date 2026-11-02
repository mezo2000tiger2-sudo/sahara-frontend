import { LoadingState } from "@/components/loading-spinner";
import type { Metadata } from "next";
import { Suspense } from "react";
import { MessagesPage } from "@/features/messages/components/messages-page";

export const metadata: Metadata = { title: "Your messages | Saharah", robots: { index: false, follow: false } };

export default function Page() {
  return <Suspense fallback={<LoadingState>Loading messages…</LoadingState>}><MessagesPage /></Suspense>;
}
