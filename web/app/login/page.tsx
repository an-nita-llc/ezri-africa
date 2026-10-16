import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { SignInTabs } from "../AuthForms";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to your Ezri sender account."
    >
      <Suspense
        fallback={
          <p role="status" className="py-4 text-center text-sm text-muted-foreground">
            Loading sign-in…
          </p>
        }
      >
        <SignInTabs />
      </Suspense>
    </AuthCard>
  );
}
