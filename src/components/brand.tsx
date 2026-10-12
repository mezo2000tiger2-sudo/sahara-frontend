import Link from "next/link";
import { MessagesSquare } from "lucide-react";

export function Brand() {
  return (
    <Link href="/" aria-label="Saharah home" className="inline-flex items-center gap-3 font-heading text-2xl font-semibold tracking-tight">
      <span className="flex size-10 items-center justify-center rounded-xl bg-main text-main-foreground">
        <MessagesSquare className="size-5" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span>saharah<span className="text-main">.</span></span>
    </Link>
  );
}
