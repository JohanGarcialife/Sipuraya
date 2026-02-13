"use client";

import { MessageCircle, X } from "lucide-react";
import { useChat } from "../context/ChatContext";

export default function ChatWidget() {
  const { isOpen, toggleChat } = useChat();

  return (
    <button
      onClick={toggleChat}
      className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 md:bottom-20 md:right-4 md:h-12 md:w-12 ${
        isOpen
          ? "bg-[var(--reader-surface)] text-[var(--reader-text)] rotate-90"
          : "bg-[var(--reader-accent)] text-[var(--reader-accent-foreground)] hover:brightness-110"
      }`}
      aria-label={isOpen ? "Close chat" : "Open chat"}
    >
      {isOpen ? <X size={24} /> : <MessageCircle size={28} />}
    </button>
  );
}
