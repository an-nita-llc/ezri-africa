import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";

export const metadata = { title: "Two-factor authentication" };

export default function TwoFactorPage() {
  return (
    <AuthCard
      title="Check your authenticator app"
      subtitle="Enter the code to finish signing in."
    >
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <p className="text-sm font-semibold">Two-factor protection enabled</p>
        <p className="text-sm text-muted-foreground">
          Enterprise security active on your sender account.
        </p>
        <Link href="/login" className="btn btn-primary mt-1">
          Back to sign in
        </Link>
      </div>
    </AuthCard>
  );
}
