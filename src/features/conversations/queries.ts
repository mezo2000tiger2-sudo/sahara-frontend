import { infiniteQueryOptions, type QueryClient } from "@tanstack/react-query";
import { fetchConversationMessages, fetchConversations } from "@/features/conversations/api";

const size = 5;

export function conversationsQueryOptions(userId: string, queryClient: QueryClient) {
  return infiniteQueryOptions({
    queryKey: ["conversations", userId, "list"],
    queryFn: ({ pageParam, signal }) => fetchConversations(pageParam, size, queryClient, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined,
    staleTime: 60_000,
    retry: false,
  });
}

export function conversationMessagesQueryOptions(userId: string, conversationId: string, queryClient: QueryClient) {
  return infiniteQueryOptions({
    queryKey: ["conversations", userId, "messages", conversationId],
    queryFn: ({ pageParam, signal }) => fetchConversationMessages(conversationId, pageParam, size, queryClient, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined,
    staleTime: 0,
    refetchInterval: 10_000,
    retry: false,
  });
}
