import { describe, expect, it, vi } from "vitest";

import { trackEvent } from "./analytics";

describe("analytics", () => {
  it("does not throw when Umami is absent", () => {
    expect(() => trackEvent("region_select", { region_code: "US-AZ" })).not.toThrow();
  });

  it("passes coarse event payloads to Umami when present", () => {
    vi.stubGlobal("window", {});
    const track = vi.fn();
    window.umami = { track };

    trackEvent("news_open", { news_id: "who-test" });

    expect(track).toHaveBeenCalledWith("news_open", { news_id: "who-test" });
    vi.unstubAllGlobals();
  });
});
