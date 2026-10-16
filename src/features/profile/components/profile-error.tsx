"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function ProfileError({ message, status, onRetry }: {
  message: string;
  status?: number;
  onRetry?: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, startTransition] = useTransition();
  const signOutMutation = useMutation({
    mutationFn: async () => {
      await queryClient.cancelQueries();
      queryClient.clear();
      await signOut({ redirectTo: "/signin" });
    },
    retry: false,
  });

  return (
    <div className="space-y-4">
      <Alert variant="destructive" className="wrap-anywhere">{message}</Alert>
      {signOutMutation.error ? <Alert variant="destructive">{signOutMutation.error.message}</Alert> : null}
      {status === 401 ? (
        <Button type="button" disabled={signOutMutation.isPending} onClick={() => signOutMutation.mutate()}>Sign in again</Button>
      ) : (
        <Button type="button" variant="outline" disabled={refreshing}
          onClick={() => startTransition(() => { if (onRetry) onRetry(); else router.refresh(); })}>
          Try again
        </Button>
      )}
    </div>
  );
}
