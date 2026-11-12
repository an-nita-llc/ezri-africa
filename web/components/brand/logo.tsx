type LogoSize = "sm" | "md" | "lg";

const sizes: Record<LogoSize, { box: string; image: number }> = {
  sm: { box: "size-8", image: 32 },
  md: { box: "size-10", image: 40 },
  lg: { box: "size-14", image: 56 },
};

export function LogoMark({
  size = "md",
  full = false,
}: {
  size?: LogoSize;
  full?: boolean;
}) {
  const { box, image } = sizes[size];
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5 ${box}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={full ? "/brand/annita-logo.png" : "/brand/annita-mark.png"}
        alt=""
        width={image}
        height={image}
        className="h-full w-full object-contain p-1"
        onError={(e) => {
          // Fallback if image asset fails
          e.currentTarget.style.display = "none";
        }}
      />
    </span>
  );
}

export function Logo({
  size = "md",
  textClassName = "text-brand-700",
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
          <span className={`block text-xs ${subtextClassName}`}>
            {subtext}
          </span>
        ) : null}
      </span>
    </span>
  );
}
