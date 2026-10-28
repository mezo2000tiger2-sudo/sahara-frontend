let renewal: Promise<Response> | undefined;

export function renewSession() {
  if (!renewal) {
    window.dispatchEvent(new Event("session-renewal-start"));
    renewal = fetch("/api/auth/refresh", { method: "POST", signal: AbortSignal.timeout(15_000) }).finally(() => {
      renewal = undefined;
      window.dispatchEvent(new Event("session-renewal-end"));
    });
  }
  return renewal;
}
