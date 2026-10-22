import { SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import AuthShell, { clerkAppearance } from "../../AuthShell";

export default function SignUpPage() {
  return (
    <AuthShell title="Create your account" subtitle="Start building AI workflows in minutes" switchText="Already have an account?" switchHref="/sign-in" switchLabel="Log in">
      <SignUp fallbackRedirectUrl="/dashboard" signInUrl="/sign-in" appearance={{ baseTheme: dark, ...clerkAppearance }} />
    </AuthShell>
  );
}
