# Stage 01: Foundation

## Goal

Create the repository foundation: Docker-first local development, backend service skeletons, shared contracts, and frontend skeleton.

## Exit Criteria

- `docker compose up --build` starts the base stack;
- backend services expose `/health`;
- frontend renders a placeholder app;
- MinIO bucket initialization works;
- shared contracts can be imported by all backend services;
- basic lint/test commands exist.

## Deliverables

- monorepo folder structure;
- `.env.example`;
- local `docker-compose.yml`;
- backend Dockerfile;
- frontend Dockerfile/dev setup;
- shared Pydantic contracts;
- S3 storage wrapper;
- first backend and frontend tests.

## Backlog

| ID | Task | Area | Priority | Status |
| --- | --- | --- | --- | --- |
| OHV-005 | Scaffold monorepo and Docker Compose stack | infra | P0 | todo |
| OHV-006 | Implement shared Pydantic contracts | backend | P0 | todo |
| OHV-007 | Implement S3 storage wrapper and MinIO init | backend | P0 | todo |
| OHV-010 | Implement map API health and metadata endpoints | backend | P0 | todo |
| OHV-011 | Implement news API health endpoint | news | P0 | todo |

## Acceptance Criteria

- [ ] `docker compose up --build` starts frontend, map API, news service, and MinIO.
- [ ] `GET /health` works for map API and news service.
- [ ] MinIO bucket is created automatically.
- [ ] Backend tests run with `pytest`.
- [ ] Frontend checks run with `pnpm test` or documented equivalent.
- [ ] `.env.example` contains all variables needed for local start.

## Technical Notes

- Use one backend image initially.
- Use separate service commands for `map-api`, `news-service`, and `data-ingestion`.
- Keep S3 access behind `backend/shared/storage`.
- Keep contracts under `backend/shared/contracts`.

## Risks

- Too much infrastructure too early can slow down parser development.
- Shared contracts can become overdesigned before real source data is parsed.

## Stage Gate

Do not start broad ingestion work until local storage and contracts are stable enough to write repeatable parser tests.
