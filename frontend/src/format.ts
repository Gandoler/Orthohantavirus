import type { NewsItem } from "./api";

export function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Unknown";
  }
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function sortedNews(items: NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.published_at ?? a.fetched_at).getTime();
    const bTime = new Date(b.published_at ?? b.fetched_at).getTime();
    return bTime - aTime;
  });
}
