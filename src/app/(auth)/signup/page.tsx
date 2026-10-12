import type { Metadata } from "next";
import { SignupForm } from "@/features/auth/components/signup-form";

export const metadata: Metadata = { title: "Sign up | Saharah" };

export default function SignupPage() {
  return <>
    <h1 className="mb-8 text-center font-heading text-3xl font-semibold">Sign up</h1>
    <SignupForm />
  </>;
}
