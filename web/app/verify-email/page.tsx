import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";

export const metadata = { title: "Verify email" };

export default function VerifyEmailPage() {
  return (
    <AuthCard
      title="Verify your email"
      subtitle="Confirming your email address."
    >
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <p className="text-sm font-semibold">Email verified</p>
        <p className="text-sm text-muted-foreground">
          Your email address has been confirmed.
        </p>
        <Link href="/" className="btn btn-primary mt-1">
          Go to chat
        </Link>
      </div>
    </AuthCard>
  );
}
