"use client";

import { useEffect, useRef } from "react";
import { Scheduler } from "@bryntum/scheduler";
import type {
  TimelineEvent,
  TimelineResource,
} from "@/app/dashboard/timeline-model";

/** Bryntum Scheduler — escrow radar. Each transfer is a bar from creation to
 *  its refund deadline, stacked in purpose lanes and colored by live status.
 *  Read-only display surface; money actions stay on the ledger cards. */
export function EscrowTimeline({
  resources,
  events,
  startDate,
  endDate,
}: {
  resources: TimelineResource[];
  events: TimelineEvent[];
  startDate: Date;
  endDate: Date;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scheduler = new Scheduler({
      appendTo: host,
      resources,
      events,
      columns: [{ text: "Purpose lane", field: "name", width: 150 }],
      startDate,
      endDate,
      viewPreset: "hourAndDay",
      rowHeight: 44,
      barMargin: 6,
      readOnly: true,
      features: { eventTooltip: true },
    });
    return () => {
      scheduler.destroy();
    };
  }, [resources, events, startDate, endDate]);

  return (
    <div
      ref={hostRef}
      role="img"
      aria-label="Escrow timeline: one bar per transfer from creation to its refund deadline, colored by status"
      className="h-[440px] w-full overflow-hidden rounded-2xl border border-border bg-white"
      style={{ colorScheme: "light" }}
    />
  );
}
