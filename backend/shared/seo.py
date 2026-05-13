from __future__ import annotations

from datetime import date, datetime
from html import escape
import json
from typing import Any
from urllib.parse import quote


DEFAULT_DESCRIPTION = (
    "Карта подтвержденных случаев хантавируса, сообщений об очагах "
    "и проверенных обновлений органов здравоохранения."
)

SUPPORTED_LOCALES = {"ru", "en"}


def canonical_url(base_url: str, path: str) -> str:
    return f"{base_url.rstrip('/')}/{path.lstrip('/')}"


def normalize_locale(locale: str | None) -> str:
    return "en" if str(locale or "").lower().startswith("en") else "ru"


def localized_path(path: str, locale: str) -> str:
    bare_path = "/" + path.lstrip("/")
    if bare_path == "/en":
        bare_path = "/"
    elif bare_path.startswith("/en/"):
        bare_path = bare_path[3:] or "/"
    if locale == "en":
        return "/en/" if bare_path == "/" else f"/en{bare_path}"
    return bare_path


def alternates(base_url: str, path: str) -> dict[str, str]:
    return {
        "ru": canonical_url(base_url, localized_path(path, "ru")),
        "en": canonical_url(base_url, localized_path(path, "en")),
        "x-default": canonical_url(base_url, localized_path(path, "ru")),
    }


def format_human_date(value: Any) -> str:
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, str):
        return value[:10]
    return "unknown"


def json_ld(payload: dict[str, Any]) -> str:
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":"))


def slug(value: str) -> str:
    return quote(value, safe="-_")


def html_document(
    *,
    title: str,
    description: str,
    canonical: str,
    h1: str,
    body: str,
    locale: str = "ru",
    updated_at: str | None = None,
    structured_data: dict[str, Any] | None = None,
) -> str:
    locale = normalize_locale(locale)
    base_url = canonical_base(canonical)
    path = canonical_path(canonical)
    alternate_links = "\n    ".join(
        f'<link rel="alternate" hreflang="{escape(lang)}" href="{escape(href)}" />'
        for lang, href in alternates(base_url, path).items()
    )
    nav = localized_nav(locale)
    eyebrow = "Ортхохантавирус.рф" if locale == "ru" else "Orthohantavirus Monitor"
    last_updated = "Обновлено" if locale == "ru" else "Last updated"
    schema = (
        f'<script type="application/ld+json">{json_ld(structured_data)}</script>'
        if structured_data
        else ""
    )
    updated = (
        f'<p class="freshness">{escape(last_updated)} <time datetime="{escape(updated_at)}">{escape(updated_at)}</time></p>'
        if updated_at
        else ""
    )
    return f"""<!doctype html>
<html lang="{escape(locale)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{escape(title)}</title>
    <meta name="description" content="{escape(description)}" />
    <meta name="robots" content="index,follow,max-image-preview:large" />
    <link rel="canonical" href="{escape(canonical)}" />
    {alternate_links}
    <meta property="og:type" content="article" />
    <meta property="og:locale" content="{"en_US" if locale == "en" else "ru_RU"}" />
    <meta property="og:locale:alternate" content="{"ru_RU" if locale == "en" else "en_US"}" />
    <meta property="og:title" content="{escape(title)}" />
    <meta property="og:description" content="{escape(description)}" />
    <meta property="og:url" content="{escape(canonical)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{escape(title)}" />
    <meta name="twitter:description" content="{escape(description)}" />
    {schema}
    <style>
      :root {{
        color-scheme: light dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-feature-settings: "ss01", "cv11", "tnum";
        background: #fafaf8;
        color: #0f1411;
      }}
      body {{
        margin: 0;
        min-height: 100vh;
        background: #fafaf8;
      }}
      main {{
        max-width: 1040px;
        margin: 0 auto;
        padding: 34px 20px 64px;
      }}
      article, header, nav, .freshness {{ max-width: 720px; }}
      a {{ color: #0b5946; text-underline-offset: 3px; }}
      h1 {{
        margin: 14px 0 16px;
        font-size: clamp(2rem, 5vw, 3.6rem);
        line-height: 1.02;
        letter-spacing: 0;
        font-weight: 600;
      }}
      h2 {{ margin-top: 32px; }}
      p, li {{ color: #3d4943; line-height: 1.72; }}
      .eyebrow {{
        color: #53615a;
        font-weight: 650;
        letter-spacing: 0;
      }}
      .panel {{
        border: 1px solid #e1e5e1;
        border-radius: 8px;
        background: #fffffd;
        padding: 18px;
      }}
      nav {{ display: flex; gap: 14px; flex-wrap: wrap; margin: 0 0 34px; padding-bottom: 14px; border-bottom: 1px solid #e1e5e1; }}
      @media (prefers-color-scheme: dark) {{
        :root, body {{ background: #0e1311; color: #e7ebe7; }}
        p, li {{ color: #a8b4ad; }}
        .panel {{ background: #141917; border-color: #2a332e; }}
        nav {{ border-color: #2a332e; }}
        a {{ color: #3fb28a; }}
      }}
    </style>
  </head>
  <body>
    <main>
      <nav aria-label="Internal links">{nav}</nav>
      <header>
      <p class="eyebrow">{escape(eyebrow)}</p>
      <h1>{escape(h1)}</h1>
      <p>{escape(description)}</p>
      {updated}
      </header>
      <article class="panel">{body}</article>
    </main>
  </body>
</html>"""


def xml_sitemap(base_url: str, paths: list[tuple[str, str | None]]) -> str:
    items = []
    for path, lastmod in paths:
        lastmod_tag = f"<lastmod>{escape(lastmod)}</lastmod>" if lastmod else ""
        changefreq_tag = "<changefreq>daily</changefreq>" if path == "/" else "<changefreq>weekly</changefreq>"
        for locale in ("ru", "en"):
            loc = canonical_url(base_url, localized_path(path, locale))
            alternate_tags = "".join(
                f'<xhtml:link rel="alternate" hreflang="{escape(lang)}" href="{escape(href)}" />'
                for lang, href in alternates(base_url, path).items()
            )
            items.append(f"<url><loc>{escape(loc)}</loc>{lastmod_tag}{changefreq_tag}{alternate_tags}</url>")
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + (
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
        'xmlns:xhtml="http://www.w3.org/1999/xhtml">'
        + "".join(items)
        + "</urlset>"
    )


def canonical_base(canonical: str) -> str:
    parts = canonical.split("/")
    return "/".join(parts[:3])


def canonical_path(canonical: str) -> str:
    parts = canonical.split("/")
    if len(parts) <= 3:
        return "/"
    return "/" + "/".join(parts[3:])


def localized_nav(locale: str) -> str:
    if locale == "en":
        return (
            '<a href="/en/">Interactive map</a>'
            '<a href="/en/about/">About</a>'
            '<a href="/en/methodology/">Methodology</a>'
            '<a href="/en/data-sources/">Data sources</a>'
            '<a href="/">RU</a>'
        )
    return (
        '<a href="/">Карта</a>'
        '<a href="/about/">О проекте</a>'
        '<a href="/methodology/">Методология</a>'
        '<a href="/data-sources/">Источники данных</a>'
        '<a href="/en/">EN</a>'
    )
