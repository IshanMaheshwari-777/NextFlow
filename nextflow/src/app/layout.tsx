import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NextFlow — AI Workflow Builder",
  description: "Visual LLM workflow builder powered by Groq",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#8b5cf6",
          colorBackground: "#12121a",
          colorInputBackground: "#0c0c12",
          colorInputText: "#e4e4ed",
          colorText: "#e4e4ed",
          colorTextSecondary: "#8b8b9e",
          borderRadius: "10px",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        },
        elements: {
          card: {
            background: "#12121a",
            border: "1px solid #1c1c28",
            borderRadius: "16px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          },
          headerTitle: { color: "#e4e4ed" },
          headerSubtitle: { color: "#8b8b9e" },
          socialButtonsBlockButton: {
            background: "#16161f",
            border: "1px solid #1c1c28",
            color: "#e4e4ed",
            borderRadius: "10px",
          },
          socialButtonsBlockButtonText: { color: "#e4e4ed" },
          formFieldInput: {
            background: "#0c0c12",
            border: "1px solid #1c1c28",
            color: "#e4e4ed",
            borderRadius: "8px",
          },
          formButtonPrimary: {
            background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
            border: "none",
            borderRadius: "10px",
            boxShadow: "0 4px 16px rgba(139,92,246,0.25)",
          },
          footerActionLink: { color: "#a78bfa" },
          dividerLine: { background: "#1c1c28" },
          dividerText: { color: "#4a4a5e" },
          formFieldLabel: { color: "#8b8b9e" },
          identityPreviewEditButton: { color: "#a78bfa" },
          badge: {
            background: "rgba(139,92,246,0.1)",
            color: "#a78bfa",
            border: "1px solid rgba(139,92,246,0.2)",
          },
        },
      }}
    >
      <html lang="en" className="dark">
        <body suppressHydrationWarning className={`${inter.className} antialiased`} style={{ background: "#0a0a0f", color: "#e4e4ed" }}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
