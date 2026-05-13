import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { deflateSync } from "node:zlib";

const baseUrl = process.env.QA_BASE_URL ?? "http://127.0.0.1:5173";
const outputDir = path.resolve(process.cwd(), process.env.QA_SCREENSHOT_DIR ?? "../docs/qa/screenshots");
const themeKey = "orthohantavirus-theme";
const deterministicTile = makePngTile();

const regions = {
  type: "FeatureCollection",
  generated_at: "2026-05-13T00:00:00Z",
  features: [
    region("US-AZ", "Arizona", [-111.09, 34.05], 95, 38, "cdc"),
    region("US-CO", "Colorado", [-105.54, 39.0], 132, 42, "cdc"),
    region("FI", "Finland", [25.75, 61.92], 806, 0, "ecdc"),
    region("DE", "Germany", [10.45, 51.16], 220, 2, "ecdc"),
    region("CL", "Chile", [-70.66, -33.45], 34, 8, "who"),
    region("AR", "Argentina", [-63.62, -38.42], 77, 18, "who"),
  ],
};

const outbreaks = {
  type: "FeatureCollection",
  generated_at: "2026-05-13T00:00:00Z",
  features: [
    outbreak("who-andes-chile", "Andes virus outbreak update", [-70.66, -33.45], "Chile", 3, 1),
    outbreak("who-patagonia-cluster", "Regional hantavirus cluster", [-71.31, -41.13], "Patagonia", 8, 2),
  ],
};

const summary = {
  generated_at: "2026-05-13T00:00:00Z",
  sources: ["cdc", "ecdc", "who"],
  reported_case_records: 6,
  reported_cases_total: 1364,
  reported_deaths_total: 108,
  outbreak_events: 2,
  news_items: 3,
};

const news = [
  newsItem("who-andes-chile-news", "WHO", "Andes virus outbreak update", "CL", "official"),
  newsItem("cdc-us-surveillance-news", "CDC", "Updated US hantavirus surveillance summary", "US-AZ", "surveillance"),
  newsItem("ecdc-eu-annual-news", "ECDC", "European annual epidemiological report published", "FI", "annual-report"),
];

function region(id, label, coordinates, confirmedCases, deaths, source) {
  return {
    type: "Feature",
    id,
    geometry: { type: "Point", coordinates },
    properties: {
      region_code: id,
      label,
      geo_precision: id.includes("-") ? "admin1" : "country",
      confirmed_cases: confirmedCases,
      deaths,
      sources: [source],
      confidence: ["official"],
      period_start: "1993-01-01",
      period_end: "2023-12-31",
      data_type: "reported_cases",
    },
  };
}

function outbreak(id, title, coordinates, location, confirmedCases, deaths) {
  return {
    type: "Feature",
    id,
    geometry: { type: "Point", coordinates },
    properties: {
      title,
      source: "who",
      source_url: "https://www.who.int/emergencies/disease-outbreak-news",
      status: "active",
      pathogen: "andes_orthohantavirus",
      reported_at: "2026-05-08T00:00:00Z",
      confirmed_cases: confirmedCases,
      probable_cases: 0,
      deaths,
      confidence: "official",
      location_label: location,
      data_type: "outbreak_report",
    },
  };
}

function newsItem(id, source, title, regionCode, tag) {
  return {
    id,
    source: source.toLowerCase(),
    source_url: "https://example.com/source",
    published_at: "2026-05-08T00:00:00Z",
    fetched_at: "2026-05-13T00:00:00Z",
    title,
    summary: "Verified public health update included in the visual QA dataset.",
    tags: ["official", tag],
    related_region_codes: [regionCode],
    related_outbreak_ids: [],
    language: "en",
    confidence: "official",
  };
}

async function installRoutes(page) {
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.fulfill({ contentType: "image/png", body: deterministicTile }),
  );
  await page.route("**/v1/map/regions", (route) => route.fulfill({ json: regions }));
  await page.route("**/v1/map/outbreaks", (route) => route.fulfill({ json: outbreaks }));
  await page.route("**/v1/stats/summary", (route) => route.fulfill({ json: summary }));
  await page.route("**/v1/news", (route) => route.fulfill({ json: news }));
}

async function capture(browser, { name, viewport, theme }) {
  const page = await browser.newPage({ viewport });
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(error.message);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      consoleErrors.push(`${response.status()} ${response.url()}`);
    }
  });
  await installRoutes(page);
  await page.addInitScript(
    ([key, value]) => localStorage.setItem(key, value),
    [themeKey, theme],
  );
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator(".map-container canvas, .fallback-map").first().waitFor({ state: "visible" });
  await page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: false });
  await page.close();
  return consoleErrors.map((message) => ({ screenshot: name, message }));
}

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch();
const errors = [];

for (const scenario of [
  { name: "desktop-light", viewport: { width: 1440, height: 960 }, theme: "light" },
  { name: "desktop-dark", viewport: { width: 1440, height: 960 }, theme: "dark" },
  { name: "mobile-light", viewport: { width: 390, height: 844 }, theme: "light" },
  { name: "mobile-dark", viewport: { width: 390, height: 844 }, theme: "dark" },
]) {
  errors.push(...(await capture(browser, scenario)));
}

await browser.close();
await writeFile(
  path.join(outputDir, "console-errors.json"),
  JSON.stringify({ generated_at: new Date().toISOString(), errors }, null, 2),
);

if (errors.length > 0) {
  console.error(`Captured ${errors.length} browser console errors. See console-errors.json.`);
  process.exitCode = 1;
}

function makePngTile() {
  const width = 256;
  const height = 256;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = rowStart + 1 + x * 4;
      const isGrid = x % 64 === 0 || y % 64 === 0;
      raw[offset] = isGrid ? 202 : 237;
      raw[offset + 1] = isGrid ? 216 : 244;
      raw[offset + 2] = isGrid ? 210 : 241;
      raw[offset + 3] = 255;
    }
  }
  const header = Buffer.from("89504e470d0a1a0a", "hex");
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    header,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
