"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";

type ChatCtx = {
  pending: string | null;
  sendToChat: (msg: string) => void;
  consumePending: () => void;
  registerChatRef: (el: HTMLElement | null) => void;
  scrollToChat: () => void;
  activeDay: string;
  setActiveDay: (day: string) => void;
  activeDayRef: { current: string };
};

const Ctx = createContext<ChatCtx | null>(null);

export function ChatProvider({
  children,
  initialDay = "overall",
}: {
  children: ReactNode;
  initialDay?: string;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [activeDay, setActiveDayState] = useState(initialDay);
  const chatRef = useRef<HTMLElement | null>(null);
  const activeDayRef = useRef(initialDay);

  const setActiveDay = (day: string) => {
    activeDayRef.current = day;
    setActiveDayState(day);
  };

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
    activeDay,
    setActiveDay,
    activeDayRef,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChatBridge() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useChatBridge must be used inside ChatProvider");
  return ctx;
}
