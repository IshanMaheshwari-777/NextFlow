import { SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import Link from "next/link";
import { Lock, Zap } from "lucide-react";

export default function SignUpPage() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.9)), url('/bg-mountains.png')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      position: "relative",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>

      {/* Navbar */}
      <nav style={{
        height: 64, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px", position: "relative", zIndex: 10
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Zap size={20} fill="currentColor" />
          </div>
          <span style={{ color: "#fff", fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em" }}>NextFlow</span>
        </Link>

        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>
          Already have an account? <Link href="/sign-in" style={{ color: "#fff", textDecoration: "none", fontWeight: 600 }}>Log in</Link>
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingBottom: 64, position: "relative", zIndex: 10 }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ fontSize: 32, fontWeight: 600, color: "#fff", margin: "0 0 12px", letterSpacing: "-0.02em" }}>Create an account</h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", margin: 0, fontWeight: 400 }}>Start building with NextFlow today</p>
        </div>

        {/* Absolute brute-force CSS override using explicit custom classes to guarantee application */}
        <style dangerouslySetInnerHTML={{
          __html: `
          /* Remove background from wrapper */
          .auth-force-dark .custom-auth-card-box {
            background-color: transparent !important;
            box-shadow: none !important;
            border: none !important;
          }
          /* Apply dark tint to inner card */
          .auth-force-dark .custom-auth-card {
            background-color: rgba(0, 0, 0, 0.4) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
          }
          /* Aggressively force all text to white */
          .auth-force-dark .custom-auth-card span,
          .auth-force-dark .custom-auth-card label,
          .auth-force-dark .custom-auth-card p,
          .auth-force-dark .custom-auth-card h1,
          .auth-force-dark .custom-auth-card div {
            color: #ffffff !important;
          }
          /* Restore primary button colors (white bg, black text) - Hyper Specific */
          html body .auth-force-dark .custom-auth-card .cl-formButtonPrimary,
          html body .auth-force-dark .custom-auth-card button.cl-formButtonPrimary {
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            border: none !important;
            box-shadow: none !important;
          }
          /* Ensure text inside primary button is black and has NO background */
          html body .auth-force-dark .custom-auth-card .cl-formButtonPrimary span,
          html body .auth-force-dark .custom-auth-card .cl-formButtonPrimary div {
            color: #000000 !important;
            background: transparent !important;
            background-color: transparent !important;
          }
          /* Fix input fields */
          .auth-force-dark .cl-formFieldInput,
          .auth-force-dark input {
            background-color: rgba(255,255,255,0.05) !important;
            color: #ffffff !important;
            border: 1px solid rgba(255,255,255,0.1) !important;
          }
          .auth-force-dark input::placeholder {
            color: rgba(255,255,255,0.4) !important;
          }
          /* Fix social buttons */
          .auth-force-dark .cl-socialButtonsBlockButton {
            background-color: transparent !important;
            border: 1px solid rgba(255,255,255,0.1) !important;
          }
          .auth-force-dark .cl-socialButtonsBlockButton:hover {
            background-color: rgba(255,255,255,0.05) !important;
          }
          /* Fix badge */
          .auth-force-dark .cl-badge, .auth-force-dark [class*="cl-badge"] {
            background-color: rgba(255,255,255,0.2) !important;
          }
        `}} />

        <div className="auth-force-dark" style={{ width: "100%", display: "flex", justifyContent: "center", position: "relative" }}>
          <SignUp
            forceRedirectUrl="/dashboard"
            appearance={{
              baseTheme: dark,
              variables: {
                colorBackground: "rgba(0, 0, 0, 0.4)",
                colorInputBackground: "rgba(255, 255, 255, 0.05)",
                colorInputText: "#ffffff",
                colorPrimary: "#ffffff",
                colorTextOnPrimaryBackground: "#000000",
                colorText: "#ffffff",
                colorTextSecondary: "#ffffff",
              },
              elements: {
                header: "hidden",
                footer: "hidden",
                cardBox: "shadow-2xl custom-auth-card-box",
                card: "custom-auth-card backdrop-blur-xl border border-white/10 rounded-2xl",
                formButtonPrimary: {
                  backgroundColor: "#ffffff",
                  color: "#000000",
                  border: "none",
                },
                socialButtonsBlockButton: "border border-white/10 hover:bg-white/10 transition-colors text-white",
                formFieldLabel: { color: "#ffffff" },
                formFieldInput: "border-white/10 focus:border-white/30 text-white placeholder:text-white/40",
                dividerLine: "bg-white/10",
                dividerText: "text-white/50",
                badge: { color: "#ffffff", backgroundColor: "rgba(255,255,255,0.2)" },
                identityPreviewEditButtonIcon: "text-white/70"
              }
            }}
          />
        </div>

        {/* Footer */}
        <div style={{ marginTop: 32, textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: "0 0 12px", fontWeight: 400 }}>
            By continuing you agree to our <span style={{ color: "rgba(255,255,255,0.8)", cursor: "pointer" }}>Terms</span> & <span style={{ color: "rgba(255,255,255,0.8)", cursor: "pointer" }}>Privacy Policy</span>
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>
            <Lock size={12} /> Secured end-to-end
          </div>
        </div>

      </div>
    </div>
  );
}
