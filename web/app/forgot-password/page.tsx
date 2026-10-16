import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "../AuthForms";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter your email and we'll send you a secure reset link."
    >
      <ForgotPasswordForm />
      <div className="mt-5 text-center">
        <Link
          href="/login"
          className="text-sm font-medium text-brand-700 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </AuthCard>
  );
}
