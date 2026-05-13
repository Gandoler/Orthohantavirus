import type { NewsItem } from "./api";
import type { AppLocale } from "./i18n";

export function formatNumber(value: number | null | undefined, locale: AppLocale | string = "en"): string {
  return new Intl.NumberFormat(numberLocale(locale)).format(value ?? 0);
}

export function formatDate(
  value: string | null | undefined,
  locale: AppLocale | string = "en",
  fallback = "Unknown",
): string {
  if (!value) {
    return fallback;
  }
  return new Intl.DateTimeFormat(dateLocale(locale), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatPeriod(
  start: string | null | undefined,
  end: string | null | undefined,
  locale: AppLocale | string = "en",
  fallback = "period pending",
): string {
  if (!start && !end) return fallback;
  if (!start) return formatDate(end, locale, fallback);
  if (!end || start.slice(0, 10) === end.slice(0, 10)) return formatDate(start, locale, fallback);
  return `${formatDate(start, locale, fallback)} - ${formatDate(end, locale, fallback)}`;
}

export function sortedNews(items: NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.published_at ?? a.fetched_at).getTime();
    const bTime = new Date(b.published_at ?? b.fetched_at).getTime();
    return bTime - aTime;
  });
}

function numberLocale(locale: AppLocale | string): string {
  return locale.toLowerCase().startsWith("ru") ? "ru-RU" : "en-US";
}

function dateLocale(locale: AppLocale | string): string {
  return locale.toLowerCase().startsWith("ru") ? "ru-RU" : "en";
}
