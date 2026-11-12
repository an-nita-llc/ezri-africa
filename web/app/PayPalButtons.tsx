"use client";
import { useEffect, useRef, useState } from "react";

/** Embedded PayPal Checkout button (JS SDK). Server creates the order first;
 *  the button approves that same order, then we capture server-side -> HELD.
 *  Renders nothing when no client ID or a MOCK order (judges run keyless). */
export default function PayPalButtons({
  orderId,
  clientId,
  onApproved,
}: {
  orderId: string;
  clientId: string;
  onApproved: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const approved = useRef(onApproved);
  approved.current = onApproved;
  const [failed, setFailed] = useState(false);
  const real = clientId !== "" && !orderId.startsWith("MOCK-");

  useEffect(() => {
    if (!real) return;
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture`;
    script.async = true;
    script.onload = () => {
      try {
        const paypal = (window as unknown as { paypal?: {
          Buttons: (o: object) => { render: (el: HTMLElement) => void };
        } }).paypal;
        if (!paypal || !ref.current) return setFailed(true);
        paypal.Buttons({
          createOrder: () => orderId,
          onApprove: () => approved.current(),
          onError: () => setFailed(true),
        }).render(ref.current);
      } catch {
        setFailed(true);
      }
    };
    script.onerror = () => setFailed(true);
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, [real, orderId, clientId]);

  if (!real) return null;
  if (failed) return <p>PayPal button failed to load — use the approval link below.</p>;
  return <div ref={ref} aria-label="PayPal checkout" />;
}
