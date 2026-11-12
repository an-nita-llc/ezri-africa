import { describe, expect, it } from "vitest";
import {
  STATUS_COLORS,
  TAG_LANES,
  buildTimelineModel,
  type TimelineRow,
} from "./timeline-model";

const row = (over: Partial<TimelineRow> = {}): TimelineRow => ({
  id: "EZR-1",
  tag: "SCHOOL",
  status: "HELD",
  amount_usd: 60,
  recipient: "Mom",
  created_at: 1_790_000_000,
  expires_at: 1_790_000_600,
  ...over,
});

describe("buildTimelineModel", () => {
  it("always exposes the six fixed purpose lanes", () => {
    const model = buildTimelineModel([]);
    expect(model.resources.map((r) => r.id)).toEqual(
      TAG_LANES.map((l) => l.id)
    );
    expect(model.resources).toHaveLength(6);
    expect(model.events).toHaveLength(0);
  });

  it("falls back to a 24h window around now when empty", () => {
    const model = buildTimelineModel([]);
    expect(model.endDate.getTime() - model.startDate.getTime()).toBe(
      24 * 3_600_000
    );
  });

  it("positions events from creation to refund deadline in the tag lane", () => {
    const model = buildTimelineModel([row()]);
    expect(model.events).toHaveLength(1);
    const [e] = model.events;
    expect(e.resourceId).toBe("SCHOOL");
    expect(e.startDate.getTime()).toBe(1_790_000_000_000);
    expect(e.endDate.getTime()).toBe(1_790_000_600_000);
    expect(e.eventColor).toBe(STATUS_COLORS.HELD);
    expect(e.draggable).toBe(false);
  });

  it("maps every known status to its lane color, unknown to blue", () => {
    for (const [status, color] of Object.entries(STATUS_COLORS)) {
      const [e] = buildTimelineModel([row({ id: status, status })]).events;
      expect(e.eventColor).toBe(color);
    }
    const [e] = buildTimelineModel([row({ status: "WEIRD" })]).events;
    expect(e.eventColor).toBe("blue");
  });

  it("sends unknown tags to the GENERAL lane and guards bad dates", () => {
    const model = buildTimelineModel([
      row({ id: "a", tag: "PARTY" }),
      row({ id: "b", created_at: 100, expires_at: 50 }),
    ]);
    expect(model.events[0].resourceId).toBe("GENERAL");
    expect(model.events[1].endDate.getTime()).toBeGreaterThan(
      model.events[1].startDate.getTime()
    );
  });

  it("drops rows without a usable creation time", () => {
    expect(buildTimelineModel([row({ created_at: 0 })]).events).toHaveLength(0);
  });

  it("never lets ledger text become markup in event names", () => {
    const [e] = buildTimelineModel([
      row({ recipient: "<img src=x onerror=alert(1)>Mom" }),
    ]).events;
    expect(e.name).not.toMatch(/[<>&"']/);
    expect(e.name).toContain("Mom");
  });
});
