import { describe, expect, it } from "vitest";

import { formatDate, formatNumber, sortedNews } from "./format";

describe("format helpers", () => {
  it("formats null-safe numbers", () => {
    expect(formatNumber(1234)).toBe("1,234");
    expect(formatNumber(null)).toBe("0");
  });

  it("formats dates", () => {
    expect(formatDate("2026-05-08T18:00:00Z")).toContain("2026");
    expect(formatDate(null)).toBe("Unknown");
  });

  it("sorts news newest first", () => {
    const sorted = sortedNews([
      {
        id: "old",
        source: "who",
        source_url: "https://www.who.int",
        published_at: "2026-01-01T00:00:00Z",
        fetched_at: "2026-01-01T00:00:00Z",
        title: "Old",
        summary: null,
        tags: [],
        related_region_codes: [],
        related_outbreak_ids: [],
        language: "en",
        confidence: "official",
      },
      {
        id: "new",
        source: "who",
        source_url: "https://www.who.int",
        published_at: "2026-05-01T00:00:00Z",
        fetched_at: "2026-05-01T00:00:00Z",
        title: "New",
        summary: null,
        tags: [],
        related_region_codes: [],
        related_outbreak_ids: [],
        language: "en",
        confidence: "official",
      },
    ]);

    expect(sorted[0].id).toBe("new");
  });
});
