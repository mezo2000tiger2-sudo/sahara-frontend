import Link from "next/link";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function SiteHeader({ showSignIn = false }: { showSignIn?: boolean }) {
  return (
    <header className="page-shell flex items-center justify-between gap-4 py-6 sm:py-8">
      <Brand />
      <nav aria-label="Main navigation" className="flex items-center gap-2 sm:gap-4">
        {showSignIn ? <Button asChild variant="ghost" className="hidden sm:inline-flex"><Link href="/signin">Sign in</Link></Button> : null}
        <ThemeToggle />
      </nav>
    </header>
  );
}
