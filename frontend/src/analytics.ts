declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, string | number | boolean | null>) => void;
    };
  }
}

const umamiSrc = import.meta.env.VITE_UMAMI_SRC;
const umamiWebsiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID;

export function installAnalytics(): void {
  if (typeof document === "undefined") {
    return;
  }
  if (!umamiSrc || !umamiWebsiteId || document.querySelector("script[data-umami-loader]")) {
    return;
  }

  const script = document.createElement("script");
  script.defer = true;
  script.src = umamiSrc;
  script.dataset.websiteId = umamiWebsiteId;
  script.dataset.umamiLoader = "true";
  document.head.appendChild(script);
}

export function trackEvent(
  event: string,
  data: Record<string, string | number | boolean | null> = {},
): void {
  if (typeof window === "undefined") {
    return;
  }
  window.umami?.track(event, data);
}
