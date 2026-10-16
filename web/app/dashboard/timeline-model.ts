// Escrow-timeline data model (Bryntum Scheduler) — pure, DOM-free, unit tested.
// Resources = fixed purpose lanes (the lock taxonomy); events = escrows
// positioned from creation to refund deadline, colored by live status.
export interface TimelineRow {
  id: string;
  tag: string;
  status: string;
  amount_usd: number;
  recipient?: string;
  note?: string;
  created_at: number; // unix seconds (ledger)
  expires_at: number; // unix seconds (ledger)
}

export interface TimelineResource {
  id: string;
  name: string;
  eventLayout: "stack";
}

export type TimelineEventColor =
  | "gray"
  | "orange"
  | "red"
  | "green"
  | "teal"
  | "blue";

export interface TimelineEvent {
  id: string;
  resourceId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  eventColor: TimelineEventColor;
  eventStyle: "rounded";
  draggable: false;
}

export interface TimelineModel {
  resources: TimelineResource[];
  events: TimelineEvent[];
  startDate: Date;
  endDate: Date;
}

export const TAG_LANES: { id: string; name: string }[] = [
  { id: "FOOD", name: "Food" },
  { id: "SCHOOL", name: "School" },
  { id: "HEALTH", name: "Health" },
  { id: "RENT", name: "Rent" },
  { id: "EMERGENCY", name: "Emergency" },
  { id: "GENERAL", name: "General" },
];

const LANE_IDS = new Set(TAG_LANES.map((l) => l.id));

export const STATUS_COLORS: Record<string, TimelineEventColor> = {
  DRAFT: "gray",
  HELD: "orange",
  NEEDS_RETRY: "red",
  RELEASED: "green",
  REFUNDED: "teal",
  EXPIRED: "gray",
};

export const STATUS_LEGEND: { status: string; label: string; color: TimelineEventColor }[] = [
  { status: "DRAFT", label: "Draft", color: "gray" },
  { status: "HELD", label: "Held", color: "orange" },
  { status: "NEEDS_RETRY", label: "Action needed", color: "red" },
  { status: "RELEASED", label: "Released", color: "green" },
  { status: "REFUNDED", label: "Refunded", color: "teal" },
  { status: "EXPIRED", label: "Expired", color: "gray" },
];

/** Strip markup so ledger text can never become HTML inside event bars. */
function sanitize(text: string): string {
  return text.replace(/[<>&"']/g, "");
}

export function buildTimelineModel(rows: TimelineRow[]): TimelineModel {
  const resources: TimelineResource[] = TAG_LANES.map((lane) => ({
    id: lane.id,
    name: lane.name,
    eventLayout: "stack",
  }));

  let minStart = Infinity;
  let maxEnd = -Infinity;

  const events: TimelineEvent[] = rows.map((r) => {
    const startMs = Number(r.created_at || 0) * 1000;
    let endMs = Number(r.expires_at || 0) * 1000;
    if (!Number.isFinite(startMs) || startMs <= 0) return null;
    if (!Number.isFinite(endMs) || endMs <= startMs) endMs = startMs + 60_000;
    minStart = Math.min(minStart, startMs);
    maxEnd = Math.max(maxEnd, endMs);
    const amount = Number(r.amount_usd || 0);
    return {
      id: String(r.id),
      resourceId: LANE_IDS.has(r.tag) ? r.tag : "GENERAL",
      name: sanitize(`$${amount} → ${r.recipient || "receiver"}`),
      startDate: new Date(startMs),
      endDate: new Date(endMs),
      eventColor: STATUS_COLORS[r.status] ?? "blue",
      eventStyle: "rounded",
      draggable: false,
    };
  }).filter((e): e is TimelineEvent => e !== null);

  const now = Date.now();
  const startDate =
    events.length > 0 ? new Date(minStart - 3_600_000) : new Date(now - 12 * 3_600_000);
  const endDate =
    events.length > 0 ? new Date(maxEnd + 3_600_000) : new Date(now + 12 * 3_600_000);

  return { resources, events, startDate, endDate };
}
