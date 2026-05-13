# Planning Workspace

This folder is the working planning layer for the Orthohantavirus Map project.

Use it for:

- stage plans;
- backlog items;
- open decisions;
- implementation notes;
- release readiness checks.

The architecture document explains what the system should become. These planning files explain how to get there in controlled stages.

## Files

```text
docs/planning/
├── README.md
├── roadmap.md
├── backlog.md
├── decisions.md
├── status-log.md
├── test-plan.md
├── remaining-work.md
├── source-inventory.md
├── ecdc-feasibility.md
├── paho-feasibility.md
├── rospotrebnadzor-feasibility.md
├── risk-layer-feasibility.md
├── region-codes.md
├── stages
│   ├── 00-discovery.md
│   ├── 01-foundation.md
│   ├── 02-data-ingestion.md
│   ├── 03-map-api-news-api.md
│   ├── 04-frontend-mvp.md
│   ├── 05-admin-observability.md
│   ├── 06-production-deploy.md
│   └── 07-scale-and-risk-layers.md
└── templates
    ├── backlog-item.md
    └── decision-record.md
```

## Status Values

Use these status values consistently:

```text
todo
ready
in_progress
blocked
review
done
deferred
cancelled
```

## Priority Values

```text
P0 - blocking or critical for the current stage
P1 - important for the current stage
P2 - useful, can wait
P3 - idea or later improvement
```

## Backlog Item Format

Each backlog item should have:

- stable id;
- title;
- stage;
- area;
- priority;
- status;
- owner, if known;
- acceptance criteria;
- notes and links.

Example id:

```text
OHV-001
```

Use `OHV` as the project prefix until a real issue tracker is introduced.

## Planning Workflow

1. Add rough ideas to `backlog.md`.
2. Move ready work into the matching stage file.
3. Keep stage files focused on deliverables, not random notes.
4. When a decision affects architecture or implementation, add it to `decisions.md`.
5. At the end of a stage, update `roadmap.md` with actual status and remaining risks.

## Stage Gate Rule

A stage is complete only when:

- required deliverables are implemented or explicitly deferred;
- acceptance criteria are checked;
- major risks are documented;
- deployment or local verification steps are written down;
- the next stage has enough ready backlog to start.
