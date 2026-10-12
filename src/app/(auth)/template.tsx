import type { ReactNode } from "react";
import { Reveal } from "@/components/reveal";

export default function AuthTemplate({ children }: { children: ReactNode }) {
  return <Reveal>{children}</Reveal>;
}
