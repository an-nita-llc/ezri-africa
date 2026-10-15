type LogoSize = "sm" | "md" | "lg";

const sizes: Record<LogoSize, { box: string; text: string }> = {
  sm: { box: "size-8", text: "text-lg" },
  md: { box: "size-10", text: "text-xl" },
  lg: { box: "size-14", text: "text-3xl" },
};

export function LogoMark({ size = "md" }: { size?: LogoSize }) {
  const { box, text } = sizes[size];
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-annita-navy-700 to-annita-navy-950 font-bold text-white shadow-sm ring-1 ring-black/5 ${box} ${text}`}
    >
      E
    </span>
  );
}

export function Logo({
  size = "md",
  textClassName = "text-annita-navy-900",
  subtext,
  subtextClassName = "text-muted-foreground",
}: {
  size?: LogoSize;
  textClassName?: string;
  subtext?: string;
  subtextClassName?: string;
}) {
  return (
    <span className="flex items-center gap-3">
      <LogoMark size={size} />
      <span>
        <span
          className={`block font-bold tracking-tight ${textClassName} ${
            size === "lg" ? "text-xl" : size === "sm" ? "text-sm" : "text-lg"
          }`}
        >
          Ezri Africa
        </span>
        {subtext ? (
          <span className={`block text-xs ${subtextClassName}`}>{subtext}</span>
        ) : null}
      </span>
    </span>
  );
}
