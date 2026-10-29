import { infiniteQueryOptions, queryOptions, type QueryClient } from "@tanstack/react-query";
import { fetchIdentityRequests, fetchMessage, fetchMessages } from "@/features/messages/api";
import type { Direction } from "@/schema/messageSchema";

const size = 5;

export function messagesQueryOptions(userId: string, direction: Direction, queryClient: QueryClient) {
  return infiniteQueryOptions({
    queryKey: ["messages", userId, "list", direction, size],
    queryFn: ({ pageParam, signal }) => fetchMessages(direction, pageParam, size, queryClient, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined,
    staleTime: 60_000,
    retry: false,
  });
}

export function identityRequestsQueryOptions(userId: string, direction: Direction, queryClient: QueryClient) {
  return infiniteQueryOptions({
    queryKey: ["identity-requests", userId, direction, size],
    queryFn: ({ pageParam, signal }) => fetchIdentityRequests(direction, pageParam, size, queryClient, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined,
    staleTime: 60_000,
    retry: false,
  });
}

export function messageQueryOptions(userId: string, messageId: string, queryClient: QueryClient) {
  return queryOptions({
    queryKey: ["messages", userId, "detail", messageId],
    queryFn: ({ signal }) => fetchMessage(messageId, queryClient, signal),
    staleTime: 60_000,
    retry: false,
  });
}
