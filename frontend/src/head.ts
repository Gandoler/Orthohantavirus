import { type AppLocale, localeAlternates, normalizeLocale, pathForLocale, PUBLIC_BASE_URL } from "./i18n";

type HeadInput = {
  locale: AppLocale;
  title: string;
  description: string;
  path?: string;
  robots?: string;
  type?: "website" | "article";
};

export function updateDocumentHead({
  locale,
  title,
  description,
  path = window.location.pathname,
  robots = "index,follow,max-image-preview:large",
  type = "website",
}: HeadInput): void {
  const normalizedLocale = normalizeLocale(locale);
  const canonical = `${PUBLIC_BASE_URL}${pathForLocale(path, normalizedLocale)}`;

  document.documentElement.lang = normalizedLocale;
  document.title = title;

  upsertMeta({ name: "description", content: description });
  upsertMeta({ name: "robots", content: robots });
  upsertLink({ rel: "canonical", href: canonical });

  for (const [hreflang, href] of Object.entries(localeAlternates(path))) {
    upsertLink({ rel: "alternate", hreflang, href });
  }

  upsertMeta({ property: "og:type", content: type });
  upsertMeta({ property: "og:site_name", content: normalizedLocale === "ru" ? "Ортхохантавирус.рф" : "Orthohantavirus Monitor" });
  upsertMeta({ property: "og:title", content: title });
  upsertMeta({ property: "og:description", content: description });
  upsertMeta({ property: "og:url", content: canonical });
  upsertMeta({ property: "og:locale", content: normalizedLocale === "ru" ? "ru_RU" : "en_US" });
  upsertMeta({ property: "og:locale:alternate", content: normalizedLocale === "ru" ? "en_US" : "ru_RU" });
  upsertMeta({ name: "twitter:card", content: "summary_large_image" });
  upsertMeta({ name: "twitter:title", content: title });
  upsertMeta({ name: "twitter:description", content: description });
}

function upsertMeta(input: { name?: string; property?: string; content: string }): void {
  const selector = input.name ? `meta[name="${input.name}"]` : `meta[property="${input.property}"]`;
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    if (input.name) element.name = input.name;
    if (input.property) element.setAttribute("property", input.property);
    document.head.append(element);
  }
  element.content = input.content;
}

function upsertLink(input: { rel: string; href: string; hreflang?: string }): void {
  const selector = input.hreflang
    ? `link[rel="${input.rel}"][hreflang="${input.hreflang}"]`
    : `link[rel="${input.rel}"]:not([hreflang])`;
  let element = document.head.querySelector<HTMLLinkElement>(selector);
  if (!element) {
    element = document.createElement("link");
    element.rel = input.rel;
    if (input.hreflang) element.hreflang = input.hreflang;
    document.head.append(element);
  }
  element.href = input.href;
}
