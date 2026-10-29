import Link from "next/link";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function SiteHeader({ showSignIn = false, signedIn = false }: { showSignIn?: boolean; signedIn?: boolean }) {
  return (
    <header className="page-shell flex flex-wrap items-center justify-between gap-4 py-6 sm:py-8">
      <Brand />
      <nav aria-label="Main navigation" className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:gap-4">
        {signedIn ? <Button asChild variant="ghost"><Link href="/message">Messages</Link></Button> : null}
        {showSignIn ? <Button asChild variant="ghost" className={signedIn ? undefined : "hidden sm:inline-flex"}>
          <Link href={signedIn ? "/profile" : "/signin"}>{signedIn ? "Profile" : "Sign in"}</Link>
        </Button> : null}
        <ThemeToggle />
      </nav>
    </header>
  );
}
