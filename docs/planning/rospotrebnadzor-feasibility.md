# Rospotrebnadzor Parsing Feasibility

Last updated: 2026-05-13

## Verdict

Feasible only as a staged, manual-review-first source family. There is useful official regional information, but no single clean national API was found for GLPS/HFRS case counts. Regional sites use different CMS layouts, article structures, and PDF formats.

## Sources Checked

- Kostroma regional page with explicit 2024 and January-March 2025 GLPS counts: `https://44.rospotrebnadzor.ru/osnovnye_napravlenij/profilaktika_infekci/6580/`
- Moscow prevention article without useful counts: `https://77.rospotrebnadzor.ru/index.php/press-centr/press-relizy/14075-profilaktika-gemorragicheskoj-likhoradki-s-pochechnym-sindromom-18-03-2025`
- Rospotrebnadzor consumer-rights portal regional news example: `https://zpp.rospotrebnadzor.ru/news/regional/573020`
- Regional annual report PDF example with GLPS sections: `https://39.rospotrebnadzor.ru/sites/default/files/gosdoklad-2025_na_sayt.pdf`

## Useful Data

Potentially useful records exist at multiple levels:

- annual regional totals;
- partial-year regional totals;
- municipality/district lists;
- prevention/news notices with no numeric data;
- annual state-report PDF sections with epidemiological summaries.

## Adapter Plan

1. Create a source registry instead of one generic crawler:
   - region code;
   - base URL;
   - source type: article list, article page, PDF report, or portal feed;
   - parser profile;
   - publication trust and review policy.
2. Add candidate extraction rules for Russian terms:
   - `ГЛПС`;
   - `геморрагическая лихорадка с почечным синдромом`;
   - `хантавирус`.
3. Parse HTML pages and PDFs into intermediate candidate records.
4. Mark every numeric extraction as `manual_review_required` until the parser has source-specific fixture coverage.
5. Emit public `CaseAggregate` records only after review or after parser confidence rules are accepted for a specific regional source.

## Acceptance Criteria

- registry supports at least three regional source profiles;
- fixture tests cover one useful HTML page, one prevention-only page, and one annual-report PDF text extract;
- parser distinguishes prevention text from numeric epidemiological data;
- all unreviewed numeric extracts stay out of public projections;
- emitted records preserve original Russian source URL and extracted text context.

## Risk Notes

- Many pages contain useful prevention text but no case data.
- District names are not ISO-coded; they require a separate Russian admin mapping.
- PDF reports can change layout annually.
- Automatic publication would be risky without a manual-review queue.
