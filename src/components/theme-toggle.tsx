"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);

  return (
    <div role="group" aria-label="Color theme" className="flex items-center rounded-full border border-outline bg-surface p-1">
      <Button type="button" variant="ghost" size="icon" disabled={!mounted}
        className="rounded-full aria-pressed:bg-main-soft aria-pressed:text-main"
        aria-label="Use light theme" aria-pressed={mounted && resolvedTheme === "light"}
        onClick={() => setTheme("light")}>
        <Sun className="size-4" aria-hidden="true" />
      </Button>
      <Button type="button" variant="ghost" size="icon" disabled={!mounted}
        className="rounded-full aria-pressed:bg-main-soft aria-pressed:text-main"
        aria-label="Use dark theme" aria-pressed={mounted && resolvedTheme === "dark"}
        onClick={() => setTheme("dark")}>
        <Moon className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
