"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

export type ModalSize = "sm" | "md" | "lg";

export function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  actions,
  size = "md",
  dismissable = true,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  size?: ModalSize;
  dismissable?: boolean;
  labelledBy?: string;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const headingId = labelledBy ?? titleId;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    panelRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && dismissable) onClose();
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open, onClose, dismissable]);

  if (!open) return null;

  const widths: Record<ModalSize, string> = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-lg",
    lg: "sm:max-w-2xl",
  };

  return (
    <div
      className="animate-overlay-in fixed inset-0 z-[70] flex items-end justify-center bg-annita-navy-950/60 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(event) => {
        if (dismissable && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        {...(description ? { "aria-describedby": `${headingId}-desc` } : {})}
        tabIndex={-1}
        className={`animate-modal-in w-full ${widths[size]} max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-white/10 bg-surface shadow-[0_24px_80px_rgb(2,24,44,0.45)] outline-none`}
      >
        <div
          aria-hidden="true"
          className="h-1.5 bg-gradient-to-r from-annita-navy via-annita-purple via-annita-green to-annita-orange"
        />
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            {icon ? (
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-annita-navy-800 to-annita-navy-950 text-white shadow-sm">
                {icon}
              </span>
            ) : null}
            <div className="min-w-0 flex-1">
              <h2
                id={headingId}
                className="text-lg font-bold tracking-tight text-annita-navy-900"
              >
                {title}
              </h2>
              {description ? (
                <p
                  id={`${headingId}-desc`}
                  className="mt-1 text-sm leading-6 text-muted-foreground"
                >
                  {description}
                </p>
              ) : null}
            </div>
            {dismissable ? (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <span aria-hidden="true" className="text-xl leading-none">
                  ×
                </span>
              </button>
            ) : null}
          </div>
          {children}
          {actions ? (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
