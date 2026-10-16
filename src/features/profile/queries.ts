import { queryOptions } from "@tanstack/react-query";

import { fetchProfile } from "@/features/profile/api";

export const profileQueryOptions = queryOptions({
  queryKey: ["profile", "me"],
  queryFn: ({ signal }) => fetchProfile(signal),
  staleTime: 60_000,
  retry: false,
});
