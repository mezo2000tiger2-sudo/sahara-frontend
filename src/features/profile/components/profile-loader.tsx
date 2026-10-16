import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";

import { ProfileError } from "@/features/profile/components/profile-error";
import { ProfileApiError } from "@/features/profile/errors";
import { profileQueryOptions } from "@/features/profile/queries";
import { getProfile } from "@/lib/profile-api.server";
import { decryptToken } from "@/utils/decrypt-token";

export async function ProfileLoader({ children }: { children: ReactNode }) {
  const token = await decryptToken();
  if (!token) redirect("/signin");
  const queryClient = new QueryClient();
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
