"use client";

// Dependency-free escrow timeline. Replaces the 34 MB Bryntum trial package
// (4.4 MB pre-bundled JS + six stylesheets) with plain React + Tailwind, using
// the same data model and visual story: each transfer is a bar from creation
// to its refund deadline, stacked in purpose lanes and colored by live status.
// Read-only display surface; money actions stay on the ledger cards.

import { useMemo } from "react";
import {
  STATUS_LEGEND,
  buildTimelineModel,
  type TimelineEvent,
  type TimelineEventColor,
  type TimelineRow,
} from "@/app/dashboard/timeline-model";

const BAR_CLASS: Record<TimelineEventColor, string> = {
  gray: "bg-slate-400",
  orange: "bg-amber-500",
  red: "bg-rose-500",
  green: "bg-emerald-500",
  teal: "bg-teal-500",
  blue: "bg-blue-500",
};

const DOT_CLASS: Record<TimelineEventColor, string> = {
  gray: "bg-slate-400",
  orange: "bg-amber-500",
  red: "bg-rose-500",
  green: "bg-emerald-500",
  teal: "bg-teal-500",
  blue: "bg-blue-500",
};

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function tickLabel(date: Date, spanMs: number): string {
  return spanMs <= 2 * DAY
    ? date.toLocaleString(undefined, { weekday: "short", hour: "numeric" })
    : date.toLocaleString(undefined, { month: "short", day: "numeric" });
}

function fullLabel(date: Date): string {
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface PlacedEvent {
  event: TimelineEvent;
  row: number;
}

export function EscrowTimeline({
  rows,
  onOpen,
}: {
  rows: TimelineRow[];
  onOpen?: (id: string) => void;
}) {
  const model = useMemo(() => buildTimelineModel(rows), [rows]);
  const spanMs = Math.max(
    1,
    model.endDate.getTime() - model.startDate.getTime()
  );

  const ticks = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        at: i / 4,
        date: new Date(model.startDate.getTime() + (spanMs * i) / 4),
      })),
    [model.startDate, spanMs]
  );

  const lanes = useMemo(
    () =>
      model.resources.map((resource) => {
        const events = model.events
          .filter((event) => event.resourceId === resource.id)
          .sort(
            (a, b) => a.startDate.getTime() - b.startDate.getTime()
          );

        // Greedy lane packing: reuse the first row whose last bar has ended.
        const rowEnds: number[] = [];
        const placed: PlacedEvent[] = events.map((event) => {
          const start = event.startDate.getTime();
          const end = event.endDate.getTime();
          let row = rowEnds.findIndex((rowEnd) => rowEnd <= start);
          if (row === -1) {
            row = rowEnds.length;
            rowEnds.push(end);
          } else {
            rowEnds[row] = end;
          }
          return { event, row };
        });

        return {
          resource,
          placed,
          rowCount: Math.max(1, rowEnds.length),
        };
      }),
    [model]
  );

  const visibleLegend = STATUS_LEGEND.filter((entry) =>
    rows.some((row) => row.status === entry.status)
  );

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
        <div>
          <h2 className="text-sm font-extrabold text-foreground">
            Escrow timeline — money against the refund clock
          </h2>
          <p className="text-xs text-muted-foreground">
            Each bar runs from creation to its refund deadline, stacked by
            purpose lane. Click a bar to open the transfer card.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {visibleLegend.map((entry) => (
            <span
              key={entry.status}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground"
            >
              <span
                aria-hidden="true"
                className={`size-2 rounded-full ${DOT_CLASS[entry.color]}`}
              />
              {entry.label}
            </span>
          ))}
        </div>
      </div>

      {model.events.length === 0 ? (
        <p className="py-12 text-center text-sm font-semibold text-muted-foreground">
          No transfers in this window yet.
        </p>
      ) : (
        <div className="overflow-x-auto pb-1">
          <div className="min-w-[620px]">
            {/* Time axis */}
            <div className="grid grid-cols-[132px_1fr] items-end">
              <div />
              <div className="relative h-7 border-b border-border">
                {ticks.map((tick, index) => (
                  <span
                    key={tick.at}
                    className={`absolute top-1 whitespace-nowrap text-[10px] font-semibold text-muted-foreground ${
                      index === 0
                        ? ""
                        : index === ticks.length - 1
                          ? "-translate-x-full"
                          : "-translate-x-1/2"
                    }`}
                    style={{ left: `${tick.at * 100}%` }}
                  >
                    {tickLabel(tick.date, spanMs)}
                  </span>
                ))}
              </div>
            </div>

            {lanes.map(({ resource, placed, rowCount }) => (
              <div
                key={resource.id}
                className="grid grid-cols-[132px_1fr] border-b border-border/60 last:border-b-0"
              >
                <div className="flex items-center py-2 pr-3 text-xs font-bold text-foreground">
                  {resource.name}
                </div>
                <div
                  className="relative py-2"
                  style={{ minHeight: rowCount * 26 + 16 }}
                >
                  {ticks.map((tick) => (
                    <span
                      key={tick.at}
                      aria-hidden="true"
                      className="absolute inset-y-1 w-px bg-border/50"
                      style={{ left: `${tick.at * 100}%` }}
                    />
                  ))}

                  {placed.map(({ event, row }) => {
                    const start = event.startDate.getTime();
                    const end = event.endDate.getTime();
                    const left =
                      ((start - model.startDate.getTime()) / spanMs) * 100;
                    const width = Math.max(1, ((end - start) / spanMs) * 100);
                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => onOpen?.(event.id)}
                        title={`${event.name}\n${fullLabel(
                          event.startDate
                        )} → ${fullLabel(event.endDate)}`}
                        aria-label={`Escrow ${event.id}: ${
                          event.name
                        }, ${fullLabel(event.startDate)} to ${fullLabel(
                          event.endDate
                        )}`}
                        className={`absolute z-10 flex h-5 min-w-2 items-center overflow-hidden rounded-full px-1.5 text-left text-[10px] font-bold text-white shadow-2xs transition-transform hover:scale-y-110 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-600 ${BAR_CLASS[event.eventColor]}`}
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          top: row * 26 + 8,
                        }}
                      >
                        <span className="truncate">{event.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
