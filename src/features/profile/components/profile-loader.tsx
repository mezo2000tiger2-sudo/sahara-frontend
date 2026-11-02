"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { LoadingState } from "@/components/loading-spinner";
import { ProfileError } from "@/features/profile/components/profile-error";
import { ProfileApiError } from "@/features/profile/errors";
import { profileQueryOptions } from "@/features/profile/queries";

export function ProfileLoader({ children }: { children: ReactNode }) {
  const profile = useQuery(profileQueryOptions);
  if (profile.isPending) return <LoadingState>Loading profile...</LoadingState>;
  if (profile.error && !profile.data) return <ProfileError message={profile.error.message}
    status={profile.error instanceof ProfileApiError ? profile.error.status : undefined}
    onRetry={() => void profile.refetch()} />;
  return children;
}
