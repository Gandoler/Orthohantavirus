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
| OHV-005 | Scaffold monorepo and Docker Compose stack | infra | P0 | done |
| OHV-006 | Implement shared Pydantic contracts | backend | P0 | done |
| OHV-007 | Implement S3 storage wrapper and MinIO init | backend | P0 | done |
| OHV-010 | Implement map API health and metadata endpoints | backend | P0 | done |
| OHV-011 | Implement news service health endpoint and feed contract placeholder | news | P0 | done |
| OHV-022 | Verify local Docker Compose runtime | infra | P0 | done |

## Acceptance Criteria

- [x] `docker compose up --build` starts frontend, map API, news service, and MinIO.
- [x] `GET /health` works for map API and news service in endpoint tests.
- [x] MinIO bucket is created automatically.
- [x] Backend tests run with `pytest`.
- [x] Frontend checks run with documented `pnpm build`.
- [x] `.env.example` contains all variables needed for local start.

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

## Current Status

Status: done

Implementation is in place, static verification passes, and Docker runtime verification passed after Docker Desktop was started.
