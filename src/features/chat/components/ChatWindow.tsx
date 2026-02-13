"use client";

import { useState, useRef, useEffect } from "react";

import { useChat } from "../context/ChatContext";
import PasscodeScreen from "./PasscodeScreen";
import { Send, X } from "lucide-react";
import { useLanguage } from "../../reader/context/LanguageContext";

function ChatScreen() {
  const { closeChat, sendMessage, messages, loading } = useChat();
  const { t, isHe } = useLanguage();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    
    const text = input;
    setInput(""); // Clear immediately
    await sendMessage(text);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Chat Header */}
      <div className="flex items-center justify-between border-b border-border bg-[var(--reader-bg)]/80 p-4 backdrop-blur-md">
        <h3
          className="font-bold text-[var(--reader-text)]"
          style={{ fontFamily: isHe ? "var(--font-hebrew), serif" : "var(--font-serif-en), serif" }}
        >
          {t("chat.title")}
        </h3>
        <button 
          onClick={closeChat}
          className="rounded-full p-1 hover:bg-[var(--reader-surface)] text-[var(--reader-text-muted)] transition-colors sm:hidden"
        >
          <X size={20} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--reader-surface)]/50">
        {/* Welcome Message (Static) */}
        <div className={`flex ${isHe ? "justify-start" : "justify-end"}`}>
          <div className={`max-w-[85%] rounded-2xl ${isHe ? "rounded-tr-sm" : "rounded-tl-sm"} bg-[var(--reader-bg)] border border-border px-4 py-3 text-sm text-[var(--reader-text)] shadow-sm`}>
            <p className={isHe ? "text-right" : "text-left"} dir={isHe ? "rtl" : "ltr"}>{t("chat.welcome")}</p>
          </div>
        </div>

        {/* Dynamic Messages */}
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div key={msg.id} className={`flex ${isUser ? (isHe ? "justify-end" : "justify-start") : (isHe ? "justify-start" : "justify-end")}`}>
              <div 
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm border ${
                  isUser 
                    ? "bg-[var(--reader-accent)] text-[var(--reader-accent-foreground)] border-transparent " + (isHe ? "rounded-tl-sm" : "rounded-tr-sm")
                    : "bg-[var(--reader-bg)] text-[var(--reader-text)] border-border " + (isHe ? "rounded-tr-sm" : "rounded-tl-sm")
                }`}
              >
                <p className={isHe ? "text-right" : "text-left"} dir={isHe ? "rtl" : "ltr"}>{msg.content}</p>
                <span className={`mt-1 block text-[10px] opacity-70 ${isUser ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {msg.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className={`flex ${isHe ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[85%] rounded-2xl ${isHe ? "rounded-tr-sm" : "rounded-tl-sm"} bg-[var(--reader-bg)] border border-border px-4 py-3 text-sm text-[var(--reader-text)] shadow-sm`}>
              <div className="flex gap-1">
                <span className="animate-bounce">.</span>
                <span className="animate-bounce delay-100">.</span>
                <span className="animate-bounce delay-200">.</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-[var(--reader-bg)] p-3">
        <form
          className="flex items-center gap-2"
          onSubmit={handleSubmit}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder={t("chat.inputPlaceholder")}
            className="flex-1 rounded-full border border-border bg-[var(--reader-surface)] px-4 py-2.5 text-sm outline-none focus:border-[var(--reader-accent)] focus:ring-1 focus:ring-[var(--reader-accent)] disabled:opacity-50"
            dir={isHe ? "rtl" : "ltr"}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--reader-accent)] text-[var(--reader-accent-foreground)] transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
          >
            <Send size={18} className={isHe ? "rotate-180" : ""} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ChatWindow() {
  const { isOpen, isAuthenticated } = useChat();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--reader-bg)] transition-all duration-300 animate-in fade-in slide-in-from-bottom-10 sm:bottom-24 sm:right-6 sm:left-auto sm:top-auto sm:h-[500px] sm:w-[380px] sm:rounded-2xl sm:border sm:border-border sm:shadow-2xl">
      {isAuthenticated ? <ChatScreen /> : <PasscodeScreen />}
    </div>
  );
}
