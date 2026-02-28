import { Geist, Geist_Mono, Assistant } from "next/font/google";
import { Frank_Ruhl_Libre, Lora } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";
import QueryProvider from "@/components/providers/QueryProvider";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/features/reader/context/AuthContext";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/features/reader/context/LanguageContext";
import { ChatProvider } from "@/features/chat/context/ChatContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const frankRuhlLibre = Frank_Ruhl_Libre({
  variable: "--font-hebrew",
  subsets: ["latin", "hebrew"],
  weight: ["300", "400", "500", "700", "900"],
  display: "swap",
});

const assistant = Assistant({
  variable: "--font-hebrew-body",
  subsets: ["latin", "hebrew"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-serif-en",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sipuraya — Daily Stories from the Sages",
  description:
    "Discover timeless stories and teachings from the great rabbis and sages of Israel, one day at a time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${frankRuhlLibre.variable} ${assistant.variable} ${lora.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <LanguageProvider>
            <AuthProvider>
              <QueryProvider>
                <ChatProvider>
                  {children}
                  <Toaster />
                </ChatProvider>
              </QueryProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
