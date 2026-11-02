import Link from "next/link";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { MobileNavigation } from "@/components/mobile-navigation";

export function SiteHeader({ showSignIn = false, signedIn = false }: { showSignIn?: boolean; signedIn?: boolean }) {
  const links = [
    ...(signedIn ? [{ href: "/message", label: "Messages" }, { href: "/conversation", label: "Conversations" }] : []),
    ...(showSignIn ? [{ href: signedIn ? "/profile" : "/signin", label: signedIn ? "Profile" : "Sign in" }] : []),
  ];
  return (
    <header className="page-shell relative z-40 flex items-center justify-between gap-4 py-4 sm:py-8">
      <Brand />
      <nav aria-label="Main navigation" className="hidden items-center justify-end gap-4 md:flex">
        {links.map(({ href, label }) => <Button key={href} asChild variant="ghost"><Link href={href}>{label}</Link></Button>)}
        <ThemeToggle />
      </nav>
      <MobileNavigation links={links} />
    </header>
  );
}
