/**
 * Inline script that only executes on the server-rendered HTML.
 *
 * React warns in development when rendering produces <script> tags
 * ("Scripts inside React components are never executed when rendering on
 * the client"). Setting type="text/plain" on the client makes the tag
 * inert during client renders, while the server-rendered version stays a
 * real executing script; suppressHydrationWarning accepts the type
 * difference. Pattern from the bundled Next.js guide
 * (preventing-flash-before-hydration.md).
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
