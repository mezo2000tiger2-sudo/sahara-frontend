"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type AuthMessage = {
  text: string;
  type: "error" | "success";
};

type AuthMessageContextValue = {
  message: AuthMessage | undefined;
  setMessage: (message: AuthMessage) => void;
  clearMessage: () => void;
};

const AuthMessageContext = createContext<AuthMessageContextValue | undefined>(undefined);

export function AuthMessageProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<AuthMessage>();
  const clearMessage = () => setMessage(undefined);

  return <AuthMessageContext.Provider value={{ message, setMessage, clearMessage }}>{children}</AuthMessageContext.Provider>;
}

export function useAuthMessage() {
  const context = useContext(AuthMessageContext);
  if (!context) throw new Error("useAuthMessage must be used within AuthMessageProvider.");
  return context;
}
