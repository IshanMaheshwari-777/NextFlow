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

// Script injected before paint to set dark/light class from localStorage (avoids flash)
const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('theme') || 'dark';
    document.documentElement.classList.toggle('light', t === 'light');
  } catch(e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        elements: {
          card: {
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            boxShadow: "0 24px 60px rgba(0,0,0,0.2)",
          },
          formButtonPrimary: {
            background: "var(--text)",
            color: "var(--bg)",
            border: "none",
            borderRadius: "99px",
          },
          footerActionLink: { color: "var(--text-muted)", fontWeight: 600 },
        },
      }}
      afterSignOutUrl="/"
    >
      <html lang="en" suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        </head>
        <body suppressHydrationWarning className={`${inter.className} antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
