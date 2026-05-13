import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import adminEn from "./locales/en/admin.json";
import commonEn from "./locales/en/common.json";
import mapEn from "./locales/en/map.json";
import newsEn from "./locales/en/news.json";
import seoEn from "./locales/en/seo.json";
import adminRu from "./locales/ru/admin.json";
import commonRu from "./locales/ru/common.json";
import mapRu from "./locales/ru/map.json";
import newsRu from "./locales/ru/news.json";
import seoRu from "./locales/ru/seo.json";

export const DEFAULT_LOCALE = "ru";
export const SUPPORTED_LOCALES = ["ru", "en"] as const;
export const LOCALE_STORAGE_KEY = "orthohantavirus-locale";
export const LOCALE_COOKIE_NAME = "orthohantavirus-locale";
export const PUBLIC_BASE_URL = "https://xn--80aagyweapgkddrtb.xn--p1ai";

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

const hasBrowserRuntime = typeof window !== "undefined" && typeof document !== "undefined";

const resources = {
  ru: {
    common: commonRu,
    map: mapRu,
    news: newsRu,
    admin: adminRu,
    seo: seoRu,
  },
  en: {
    common: commonEn,
    map: mapEn,
    news: newsEn,
    admin: adminEn,
    seo: seoEn,
  },
};

export function normalizeLocale(value: string | null | undefined): AppLocale {
  return value?.toLowerCase().startsWith("en") ? "en" : "ru";
}

export function localeFromPath(pathname = hasBrowserRuntime ? window.location.pathname : "/"): AppLocale {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "ru";
}

export function stripLocalePrefix(pathname: string): string {
  if (pathname === "/en") return "/";
  if (pathname.startsWith("/en/")) return pathname.slice(3) || "/";
  return pathname || "/";
}

export function pathForLocale(pathname: string, locale: AppLocale): string {
  const barePath = stripLocalePrefix(pathname);
  if (locale === "en") {
    return barePath === "/" ? "/en/" : `/en${barePath}`;
  }
  return barePath;
}

export function localeAlternates(pathname: string): Record<AppLocale | "x-default", string> {
  return {
    ru: `${PUBLIC_BASE_URL}${pathForLocale(pathname, "ru")}`,
    en: `${PUBLIC_BASE_URL}${pathForLocale(pathname, "en")}`,
    "x-default": `${PUBLIC_BASE_URL}${pathForLocale(pathname, "ru")}`,
  };
}

export function persistLocale(locale: AppLocale): void {
  if (!hasBrowserRuntime) return;
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function readPersistedLocale(): AppLocale | null {
  if (!hasBrowserRuntime) return null;
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored === "ru" || stored === "en") return stored;

  const cookieLocale = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${LOCALE_COOKIE_NAME}=`))
    ?.split("=")[1];
  return cookieLocale === "ru" || cookieLocale === "en" ? cookieLocale : null;
}

export function syncLocalePathBeforeMount(): AppLocale {
  if (!hasBrowserRuntime) return DEFAULT_LOCALE;
  return localeFromPath(window.location.pathname);
}

if (hasBrowserRuntime) {
  i18n.use(LanguageDetector);
}

void i18n.use(initReactI18next).init({
    resources,
    lng: syncLocalePathBeforeMount(),
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...SUPPORTED_LOCALES],
    ns: ["common", "map", "news", "admin", "seo"],
    defaultNS: "common",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["path", "localStorage", "cookie"],
      lookupFromPathIndex: 0,
      lookupLocalStorage: LOCALE_STORAGE_KEY,
      lookupCookie: LOCALE_COOKIE_NAME,
      caches: ["localStorage", "cookie"],
      cookieMinutes: 60 * 24 * 365,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
