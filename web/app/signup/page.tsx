import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "../AuthForms";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <AuthCard
      title="Create your account"
      subtitle="One sender login sends for everyone. Receivers never log in."
    >
      <SignupForm />
    </AuthCard>
  );
}
