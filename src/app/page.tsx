import { ArrowDown, ArrowUpRight, Heart, MessageCircle, Sprout } from "lucide-react";
import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { Reveal } from "@/components/reveal";
import { HomeLetter } from "@/components/home-letter";
import { Button } from "@/components/ui/button";
import { readAuthToken } from "@/utils/decrypt-token";
import { hasRefreshToken } from "@/lib/auth-api.server";
import styles from "./home.module.css";

const values = [
  { icon: MessageCircle, title: "A little more honesty.", description: "A thought, a thank-you, something you’ve always wanted to say." },
  { icon: Heart, title: "A little more kindness.", description: "Honest words can be gentle. Leave someone with something good." },
  { icon: Sprout, title: "A little room to grow.", description: "A different perspective can help you see yourself in a new way." },
];

export default async function Home() {
  const signedIn = hasRefreshToken(await readAuthToken());

  return (
    <div className={styles.home}>
      <SiteHeader showSignIn signedIn={signedIn} />
      <main id="main-content">
        <section className={`page-shell ${styles.hero}`} aria-labelledby="hero-title">
          <Reveal>
            <p className={styles.eyebrow}><span aria-hidden="true" />A little space for honest words</p>
            <h1 id="hero-title" className={styles.title}>Some words<br />deserve to<br />be <em>said.</em></h1>
            <p className={styles.description}>A thank-you. A fresh perspective. Something you’ve always wanted to say. Give your words a home on Saharah.</p>
            <div className={styles.actions}>
              {!signedIn ? <Button asChild size="lg" className={styles.primary}><Link href="/signup">Create your account<ArrowUpRight aria-hidden="true" /></Link></Button> : null}
              <Button asChild variant="ghost" size="lg" className={styles.secondary}><a href="#the-idea">The idea<ArrowDown aria-hidden="true" /></a></Button>
            </div>
            <p className={styles.status}>Accounts are open. Messaging is on its way.</p>
          </Reveal>

          <div className={styles.illustration}>
            <figure className={styles.letterScene}>
              <div className={styles.postmark} aria-hidden="true">A small note.<br />A lasting feeling.<span>↙</span></div>
              <div className={styles.envelope}>
                <div className={styles.envelopeBack} aria-hidden="true" />
                <div className={styles.letterPocket}>
                  <HomeLetter className={styles.letter}>
                    <div className={styles.letterHeading}><MessageCircle size={16} aria-hidden="true" /><span>Someone wanted you to know</span></div>
                    <blockquote>“You make people feel like they belong. I hope you know that.”</blockquote>
                  </HomeLetter>
                </div>
                <div className={styles.envelopeFront} aria-hidden="true" />
                <div className={styles.envelopeLabel} aria-hidden="true"><span>For you.</span><Heart size={22} strokeWidth={1.4} /></div>
              </div>
              <figcaption className={styles.caption}>Anonymous words. A very human connection.<span>An example of the kind of connection we’re building.</span></figcaption>
            </figure>
          </div>
        </section>

        <section id="the-idea" aria-labelledby="idea-title" className={`page-shell ${styles.idea}`}>
          <Reveal className={styles.ideaHeading}>
            <p className={styles.eyebrow}>The idea behind Saharah</p>
            <h2 id="idea-title">Small words.<br /><span>Real meaning.</span></h2>
            <p>Some things are easier to say with a little space. A place for honest, anonymous messages — and the people behind them.</p>
          </Reveal>
          <div className={styles.values}>
            {values.map(({ icon: Icon, title, description }, index) => (
              <Reveal key={title} delay={index * 0.08}>
                <article className={styles.value}>
                  <span className={styles.valueIcon}><Icon size={22} strokeWidth={1.5} aria-hidden="true" /></span>
                  <div><h3>{title}</h3><p>{description}</p></div>
                </article>
              </Reveal>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
