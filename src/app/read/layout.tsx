import { ChatProvider } from "@/features/chat/context/ChatContext";
import { LanguageProvider } from "@/features/reader/context/LanguageContext";
import ChatWidget from "@/features/chat/components/ChatWidget";
import ChatWindow from "@/features/chat/components/ChatWindow";

export default function ReaderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <ChatProvider>
        <div className="min-h-screen bg-[var(--reader-bg)] text-[var(--reader-text)] transition-colors duration-300 relative">
          {children}
          <ChatWindow />
          <ChatWidget />
        </div>
      </ChatProvider>
    </LanguageProvider>
  );
}
