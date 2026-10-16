export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
      <div
        aria-hidden="true"
        className="h-1 bg-gradient-to-r from-annita-navy via-annita-purple via-annita-green to-annita-orange"
      />
      <div className="border-b border-border bg-muted/50 px-6 py-5 sm:px-8">
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {subtitle}
        </p>
      </div>
      <div className="px-6 py-6 sm:px-8">{children}</div>
    </div>
  );
}
