import { expect, test } from "@playwright/test";

const regions = {
  type: "FeatureCollection",
  generated_at: "2026-05-13T00:00:00Z",
  features: [
    {
      type: "Feature",
      id: "US-AZ",
      geometry: { type: "Point", coordinates: [-111.09, 34.05] },
      properties: {
        region_code: "US-AZ",
        label: "Arizona",
        geo_precision: "admin1",
        confirmed_cases: 95,
        deaths: 38,
        sources: ["cdc"],
        confidence: ["official"],
        period_start: "1993-01-01",
        period_end: "2023-12-31",
        data_type: "reported_cases",
      },
    },
  ],
};

const outbreaks = {
  type: "FeatureCollection",
  generated_at: "2026-05-13T00:00:00Z",
  features: [
    {
      type: "Feature",
      id: "who-test",
      geometry: { type: "Point", coordinates: [-70.66, -33.45] },
      properties: {
        title: "Hantavirus outbreak update",
        source: "who",
        source_url: "https://www.who.int/emergencies/disease-outbreak-news",
        status: "active",
        pathogen: "andes_orthohantavirus",
        reported_at: "2026-05-08T00:00:00Z",
        confirmed_cases: 3,
        probable_cases: 0,
        deaths: 1,
        confidence: "official",
        location_label: "Chile",
        data_type: "outbreak_report",
      },
    },
  ],
};

const summary = {
  generated_at: "2026-05-13T00:00:00Z",
  sources: ["cdc", "who"],
  reported_case_records: 1,
  reported_cases_total: 95,
  reported_deaths_total: 38,
  outbreak_events: 1,
  news_items: 1,
};

const news = [
  {
    id: "who-test-news",
    source: "who",
    source_url: "https://www.who.int/emergencies/disease-outbreak-news",
    published_at: "2026-05-08T00:00:00Z",
    fetched_at: "2026-05-13T00:00:00Z",
    title: "Hantavirus outbreak update",
    summary: "Official outbreak update used by the browser smoke test.",
    tags: ["official", "hantavirus"],
    related_region_codes: [],
    related_outbreak_ids: ["who-test"],
    language: "en",
    confidence: "official",
  },
];

test.beforeEach(async ({ page }) => {
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.fulfill({ status: 204, body: "" }),
  );
  await page.route("http://localhost:8000/v1/map/regions", (route) =>
    route.fulfill({ json: regions }),
  );
  await page.route("http://localhost:8000/v1/map/outbreaks", (route) =>
    route.fulfill({ json: outbreaks }),
  );
  await page.route("http://localhost:8000/v1/stats/summary", (route) =>
    route.fulfill({ json: summary }),
  );
  await page.route("http://localhost:8001/v1/news", (route) => route.fulfill({ json: news }));
});

test("renders the map workspace and news feed", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Reported cases and official outbreak updates" })).toBeVisible();
  await expect(page.getByText("Live API data")).toBeVisible();
  await expect(page.getByLabel("News feed")).toContainText("Hantavirus outbreak update");
  await expect(page.getByLabel("Selected region")).toContainText("Arizona");
  await expect(page.locator(".map-container canvas")).toBeVisible();

  const newsPanelBox = await page.getByLabel("News feed").boundingBox();
  expect(newsPanelBox?.width).toBeGreaterThan(240);
  const viewport = page.viewportSize();
  if (viewport && viewport.width >= 900) {
    expect(newsPanelBox?.x).toBeLessThan(5);
  }
});
