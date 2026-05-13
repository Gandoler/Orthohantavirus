import { beforeEach, describe, expect, it } from "vitest";

import i18n, { pathForLocale, stripLocalePrefix } from "./i18n";

describe("i18n", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("ru");
  });

  it("uses Russian as the default interface language", () => {
    expect(i18n.t("map:layers.cases")).toBe("Случаи");
  });

  it("switches to English resources", async () => {
    await i18n.changeLanguage("en");
    expect(i18n.t("map:layers.cases")).toBe("Cases");
  });

  it("builds locale-prefixed paths without losing the current route", () => {
    expect(pathForLocale("/methodology/", "en")).toBe("/en/methodology/");
    expect(pathForLocale("/en/methodology/", "ru")).toBe("/methodology/");
    expect(stripLocalePrefix("/en/")).toBe("/");
  });
});
