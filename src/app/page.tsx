import { ArrowDown, ArrowUpRight, Heart, MessageCircle, MessagesSquare, Sprout } from "lucide-react";
import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { decryptToken } from "@/utils/decrypt-token";

const values = [
  { icon: MessageCircle, title: "A little more honesty.", description: "A thought, a thank-you, something you’ve always wanted to say." },
  { icon: Heart, title: "A little more kindness.", description: "Honest words can be gentle. Leave someone with something good." },
  { icon: Sprout, title: "A little room to grow.", description: "A different perspective can help you see yourself in a new way." },
];

export default async function Home() {
  const signedIn = Boolean(await decryptToken());

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader showSignIn signedIn={signedIn} />
      <main id="main-content" className="flex-1">
        <section className="page-shell grid items-center gap-14 pt-10 pb-16 sm:pt-16 sm:pb-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-20 lg:pb-24" aria-labelledby="hero-title">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-outline bg-surface px-3 py-2 text-xs font-medium text-ink-muted">
              <span className="size-1.5 rounded-full bg-main" aria-hidden="true" />A new space. Coming soon.
            </span>
            <h1 id="hero-title" className="mt-7 font-heading text-display font-medium text-balance">
              Small words.<br /><span className="text-main">Real meaning.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-8 text-ink-muted">
              Some things are easier to say with a little space. Saharah is a place for honest, anonymous messages — and the people behind them.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              {!signedIn ? <Button asChild size="lg"><Link href="/signup">Create your account<ArrowUpRight aria-hidden="true" /></Link></Button> : null}
              <Button asChild variant="ghost" size="lg"><a href="#the-idea">The idea<ArrowDown aria-hidden="true" /></a></Button>
            </div>
            <p className="mt-5 text-sm text-ink-subtle">Accounts are open. Messaging is on its way.</p>
          </Reveal>

          <figure className="relative isolate m-0 rounded-3xl bg-main-soft px-6 pt-10 pb-7 sm:px-10 sm:pt-12 lg:pt-14">
            <div className="mb-8 flex items-center justify-between text-main">
              <span className="eyebrow">A little space for honest words</span>
              <MessagesSquare className="ml-4 size-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <Reveal delay={0.12} className="message-shape relative z-10 mr-5 bg-surface p-6 shadow-soft sm:mr-10 sm:p-8">
              <div className="mb-4 flex items-center gap-2 text-xs font-medium text-ink-muted"><MessageCircle className="size-4 shrink-0" aria-hidden="true" />Someone wanted you to know</div>
              <p className="font-heading text-2xl leading-snug font-medium tracking-tight sm:text-3xl">“You make people feel like they belong. I hope you know that.”</p>
              <span className="mt-5 block text-xs text-ink-subtle">A little appreciation</span>
            </Reveal>
            <Reveal delay={0.24} className="relative z-20 mt-5 ml-6 rounded-3xl rounded-br-sm bg-brand-panel p-6 text-brand-panel-foreground shadow-float sm:ml-14 sm:p-8">
              <Heart className="mb-4 size-6 text-brand-highlight" strokeWidth={1.5} aria-hidden="true" />
              <p className="font-heading text-2xl leading-snug font-medium tracking-tight">Sometimes, a few words<br />stay with you.</p>
            </Reveal>
            <figcaption className="mt-8 text-center text-xs text-ink-muted">An example of the kind of connection we’re building.</figcaption>
          </figure>
        </section>

        <section id="the-idea" aria-labelledby="idea-title" className="border-t border-outline bg-surface py-14 sm:py-16">
          <div className="page-shell">
            <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <h2 id="idea-title" className="font-heading text-3xl font-medium tracking-tight">Good things start with a few words.</h2>
              <p className="shrink-0 text-sm text-ink-muted">A simple idea. A human connection.</p>
            </div>
            <div className="grid gap-8 md:grid-cols-3 md:gap-10">
              {values.map(({ icon: Icon, title, description }, index) => (
                <Reveal key={title} delay={index * 0.08}>
                <article className="border-t border-outline pt-6">
                  <Icon className="mb-5 size-6 text-main" strokeWidth={1.5} aria-hidden="true" />
                  <h3 className="font-heading text-xl font-medium tracking-tight">{title}</h3>
                  <p className="mt-3 max-w-sm text-sm leading-7 text-ink-muted">{description}</p>
                </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </main>
      
    </div>
  );
}
