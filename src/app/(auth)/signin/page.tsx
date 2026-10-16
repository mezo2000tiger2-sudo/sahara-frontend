import type { Metadata } from "next";
import { SigninForm } from "@/features/auth/components/signin-form";
import { authenticationErrorMessage } from "@/features/auth/errors";
import { Alert } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Sign in | Saharah" };

export default async function SigninPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;
  const code = typeof params.code === "string" ? params.code : undefined;
  return <>
    <h1 className="mb-8 text-center font-heading text-3xl font-semibold">Sign in</h1>
    {error === "ProfileLogoutError" ? <Alert role="status" className="mb-6">Your password was saved. We could not confirm logout from this device.</Alert> : null}
    <SigninForm key={`${error ?? ""}:${code ?? ""}`} initialError={authenticationErrorMessage(error, code)} />
  </>;
}
