import ChatWidget from "@/features/chat/components/ChatWidget";
import ChatWindow from "@/features/chat/components/ChatWindow";

export default function ReaderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="reader-root min-h-screen bg-(--reader-bg) text-(--reader-text) transition-colors duration-300 relative">
      {children}
      <ChatWindow />
      <ChatWidget />
    </div>
  );
}
