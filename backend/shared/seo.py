from __future__ import annotations

from datetime import date, datetime
from html import escape
import json
from typing import Any
from urllib.parse import quote


DEFAULT_DESCRIPTION = (
    "Orthohantavirus Monitor tracks verified hantavirus cases, outbreaks, "
    "and public health updates on an interactive surveillance map."
)


def canonical_url(base_url: str, path: str) -> str:
    return f"{base_url.rstrip('/')}/{path.lstrip('/')}"


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
    updated_at: str | None = None,
    structured_data: dict[str, Any] | None = None,
) -> str:
    schema = (
        f'<script type="application/ld+json">{json_ld(structured_data)}</script>'
        if structured_data
        else ""
    )
    updated = (
        f'<p class="freshness">Last updated <time datetime="{escape(updated_at)}">{escape(updated_at)}</time></p>'
        if updated_at
        else ""
    )
    return f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{escape(title)}</title>
    <meta name="description" content="{escape(description)}" />
    <link rel="canonical" href="{escape(canonical)}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="{escape(title)}" />
    <meta property="og:description" content="{escape(description)}" />
    <meta property="og:url" content="{escape(canonical)}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="{escape(title)}" />
    <meta name="twitter:description" content="{escape(description)}" />
    {schema}
    <style>
      :root {{
        color-scheme: light dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f5f7f4;
        color: #12201b;
      }}
      body {{
        margin: 0;
        min-height: 100vh;
        background: linear-gradient(180deg, #f5f7f4 0%, #eaf3f2 100%);
      }}
      main {{
        max-width: 860px;
        margin: 0 auto;
        padding: 48px 20px 64px;
      }}
      a {{ color: #0f6b65; }}
      h1 {{
        margin: 14px 0 16px;
        font-size: clamp(2rem, 5vw, 3.6rem);
        line-height: 1.02;
        letter-spacing: 0;
      }}
      h2 {{ margin-top: 32px; }}
      p, li {{ color: #38524c; line-height: 1.72; }}
      .eyebrow {{
        color: #0f766e;
        font-weight: 800;
        letter-spacing: .08em;
        text-transform: uppercase;
      }}
      .panel {{
        border: 1px solid rgba(25, 73, 66, .16);
        border-radius: 8px;
        background: rgba(255,255,255,.78);
        padding: 18px;
      }}
      nav {{ display: flex; gap: 14px; flex-wrap: wrap; margin-top: 28px; }}
      @media (prefers-color-scheme: dark) {{
        :root {{ background: #0b1413; color: #edf5f2; }}
        body {{ background: linear-gradient(180deg, #0b1413 0%, #101f22 100%); }}
        p, li {{ color: #b6c9c4; }}
        .panel {{ background: rgba(16, 31, 34, .82); border-color: rgba(151, 175, 170, .2); }}
        a {{ color: #5eead4; }}
      }}
    </style>
  </head>
  <body>
    <main>
      <p class="eyebrow">Orthohantavirus Monitor</p>
      <h1>{escape(h1)}</h1>
      <p>{escape(description)}</p>
      {updated}
      <section class="panel">{body}</section>
      <nav aria-label="Internal links">
        <a href="/">Interactive map</a>
        <a href="/about/">About</a>
        <a href="/methodology/">Methodology</a>
        <a href="/data-sources/">Data sources</a>
      </nav>
    </main>
  </body>
</html>"""


def xml_sitemap(base_url: str, paths: list[tuple[str, str | None]]) -> str:
    items = []
    for path, lastmod in paths:
        loc = canonical_url(base_url, path)
        lastmod_tag = f"<lastmod>{escape(lastmod)}</lastmod>" if lastmod else ""
        items.append(f"<url><loc>{escape(loc)}</loc>{lastmod_tag}</url>")
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + (
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        + "".join(items)
        + "</urlset>"
    )
