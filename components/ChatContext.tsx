"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";

type ChatCtx = {
  pending: string | null;
  sendToChat: (msg: string) => void;
  consumePending: () => void;
  registerChatRef: (el: HTMLElement | null) => void;
  scrollToChat: () => void;
};

const Ctx = createContext<ChatCtx | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<string | null>(null);
  const chatRef = useRef<HTMLElement | null>(null);

  const value: ChatCtx = {
    pending,
    sendToChat: (msg: string) => {
      setPending(msg);
      chatRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    consumePending: () => setPending(null),
    registerChatRef: (el) => {
      chatRef.current = el;
    },
    scrollToChat: () => {
      chatRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChatBridge() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useChatBridge must be used inside ChatProvider");
  return ctx;
}
