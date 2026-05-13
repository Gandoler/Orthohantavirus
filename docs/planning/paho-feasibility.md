# PAHO Adapter Feasibility

Last updated: 2026-05-13

## Verdict

Feasible as an official news/document adapter. Treat PAHO as a high-trust regional source for alerts, updates, and PDF reports. Do not assume it provides a stable granular case-count API.

## Sources Checked

- PAHO hantavirus topic page: `https://www.paho.org/en/topics/hantavirus`
- PAHO hantavirus epidemiological alert document page: `https://www.paho.org/en/documents/epidemiological-alert-hantavirus-pulmonary-syndrome-americas-region-19-december-2025`
- PAHO alert PDF: `https://www.paho.org/sites/default/files/2025-12/2025-12-19-epidemiological-alert-hantavirus-engfinal.pdf`
- PAHO documents listing: `https://www.paho.org/en/documents/node/69016`

## Useful Data

The December 2025 PAHO alert is directly relevant. It reports an Americas-region HPS situation through epidemiological week 47 of 2025 and references eight reporting countries. The source is suitable for:

- `NewsItem` records;
- `OutbreakEvent` or regional alert records;
- aggregated regional/country case counts only when values are explicit in parseable PDF text or tables.

## Adapter Plan

1. Add `PahoAdapter` under `backend/services/data_ingestion/adapters/paho.py`.
2. Fetch topic, documents, and alert/news pages with `httpx`.
3. Parse HTML metadata with `selectolax` or a small standard-library HTML parser if dependencies stay minimal.
4. Download relevant PDFs and extract text with the existing `extract_pdf_text` helper.
5. Emit:
   - `NewsItem` for topic/news/document pages;
   - `OutbreakEvent` for alerts with outbreak semantics;
   - `CaseAggregate` only for explicit country-level table values.
6. Add golden fixtures for one HTML document page and one PDF text extract.
7. Add parser warnings when the PDF mentions totals but country values are not reliably extractable.

## Acceptance Criteria

- dry-run produces at least one PAHO news/document item from fixtures;
- PDF text parser extracts title, publication date, source URL, regional totals, and affected countries;
- no country case aggregate is emitted unless the parser can identify country, period, cases, and deaths from the same table/context;
- source URLs and PAHO attribution are preserved in every emitted record.

## Risk Notes

- PAHO pages are Drupal-style HTML, so selectors may change.
- PDF figures/tables may need source-specific extraction rules.
- The adapter should not duplicate WHO DON items without a deterministic de-duplication rule.
