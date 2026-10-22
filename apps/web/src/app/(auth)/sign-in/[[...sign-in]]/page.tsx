import { SignIn } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import AuthShell, { clerkAppearance } from "../../AuthShell";

export default function SignInPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Log in to your NextFlow workspace" switchText="New here?" switchHref="/sign-up" switchLabel="Create an account">
      {/* fallback (not force) so Clerk's redirect_url wins and users land back where they were headed */}
      <SignIn fallbackRedirectUrl="/dashboard" signUpUrl="/sign-up" appearance={{ baseTheme: dark, ...clerkAppearance }} />
    </AuthShell>
  );
}
