import { ThemeProvider } from "next-themes";
import { ChatProvider } from "@/features/chat/context/ChatContext";
import { LanguageProvider } from "@/features/reader/context/LanguageContext";
import ChatWidget from "@/features/chat/components/ChatWidget";
import ChatWindow from "@/features/chat/components/ChatWindow";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <LanguageProvider>
        <ChatProvider>
          <div className="reader-root min-h-screen bg-(--reader-bg) text-(--reader-text) transition-colors duration-300 relative">
            {children}
            <ChatWindow />
            <ChatWidget />
          </div>
        </ChatProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
