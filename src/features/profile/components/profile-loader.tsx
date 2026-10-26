import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";

import { ProfileError } from "@/features/profile/components/profile-error";
import { ProfileApiError } from "@/features/profile/errors";
import { profileQueryOptions } from "@/features/profile/queries";
import { getProfile } from "@/lib/profile-api.server";
import { decryptToken } from "@/utils/decrypt-token";

export async function ProfileLoader({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient();
  let token: string | null;
  try {
    token = await decryptToken();
  } catch {
    return <ProfileError message="Unable to renew your session. Please try again." status={503} />;
  }
  if (!token) redirect("/signin?error=SessionExpired");
  try {
    await queryClient.fetchQuery({
      ...profileQueryOptions,
      queryFn: async () => (await getProfile(token)).user,
    });
  } catch (error) {
    return <ProfileError message={error instanceof Error ? error.message : String(error)}
      status={error instanceof ProfileApiError ? error.status : undefined} />;
  }
  return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>;
}
