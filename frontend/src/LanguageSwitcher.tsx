import { useTranslation } from "react-i18next";

import i18n, { type AppLocale, normalizeLocale, pathForLocale, persistLocale } from "./i18n";

export function LanguageSwitcher() {
  const { t } = useTranslation("common");
  const activeLocale = normalizeLocale(i18n.language);

  function switchLocale(locale: AppLocale) {
    if (locale === activeLocale) return;
    persistLocale(locale);
    void i18n.changeLanguage(locale);
    const nextPath = pathForLocale(window.location.pathname, locale);
    window.history.replaceState(window.history.state, "", `${nextPath}${window.location.search}${window.location.hash}`);
  }

  return (
    <div className="language-switcher" aria-label={t("language.label")}>
      <button
        className={activeLocale === "ru" ? "language-switcher__option is-active" : "language-switcher__option"}
        type="button"
        onClick={() => switchLocale("ru")}
        aria-pressed={activeLocale === "ru"}
        title={t("language.switchToRu")}
      >
        {t("language.ru")}
      </button>
      <button
        className={activeLocale === "en" ? "language-switcher__option is-active" : "language-switcher__option"}
        type="button"
        onClick={() => switchLocale("en")}
        aria-pressed={activeLocale === "en"}
        title={t("language.switchToEn")}
      >
        {t("language.en")}
      </button>
    </div>
  );
}
