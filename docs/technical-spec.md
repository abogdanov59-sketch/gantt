# Technical Specification: Isolated Gantt Chart Module for Construction Scheduling

## 1. Purpose and Goals
- Build an isolated, reusable Gantt Chart module for construction project scheduling compliant with industry-standard practices (MS Project, Oracle Primavera P6, Asta Powerproject, Project Libre, Smartsheet).
- Support creation, visualization, and management of calendar-network schedules, including CPM, constraints, calendars, dependencies, resources, costs, baselines, and progress tracking.
- Deliver high performance and accessibility for large datasets.
- Provide a clean API for embedding in any Vue 3 application, using PrimeVue components and TailwindCSS for styling.

## 2. Technology Stack
- Framework: Vue.js 3 (Composition API, TypeScript).
- UI library: PrimeVue (DataTable, Dialog, ContextMenu, Dropdowns, Calendar inputs, etc.).
- Styling: TailwindCSS (utility classes, config-driven theming).
- Build: Vite for development; library build with ESM and UMD, tree-shakeable.
- Performance: Virtualized rendering, Web Worker for heavy calculations (CPM, leveling, EVM).

## 3. Scope
### In Scope
- Gantt timeline visualization with two-pane layout: left Tree Grid (WBS) + right Timeline.
- Full CPM scheduling with calendars, constraints, and dependency types (FS/SS/FF/SF) with leads/lags.
- Multi-level WBS, milestones, LOE (level-of-effort), and hammock tasks.
- Calendars (global, project, resource, activity) with working time, shifts, exceptions, holidays.
- Baselines (multiple, up to 10) with variance calculations.
- Progress (% Duration Complete, % Physical Complete, % Work Complete) and updates by Remaining Duration/Work.
- Resource assignments (labor, equipment, material), costs, and basic resource leveling.
- Earned Value Management (EV, PV, AC, SPI, CPI, CV, SV, EAC, ETC, TCPI).
- Grouping/sorting/filtering, codes/classifications, custom fields.
- Import/Export: JSON, CSV, Microsoft Project XML. Optional: Primavera P6 XML (preferred incremental target).
- Printing and PDF export.
- Accessibility (WCAG 2.1 AA), i18n/l10n, RTL support.
- API for integration, events, methods, and slots for customization.

### Out of Scope (v1)
- Full P6 XER binary import/export.
- Deep BIM/4D integration; only provide hooks for external integration.
- Advanced optimization algorithms beyond basic resource leveling.

## 4. User Personas and Use Cases
- **Planner/Scheduler**: Build and maintain construction schedules, track baselines, perform what-if analysis, update progress weekly.
- **Site Manager**: Update actuals (dates, quantities, % complete), view lookahead (2–6 weeks), monitor critical/near-critical paths.
- **Project Controls**: Manage resources, costs, EVM, prepare prints and reports for stakeholders.
- **Executive**: View high-level timelines and milestone status.

## 5. Functional Requirements
### 5.1 WBS and Tasks
- Multi-level WBS hierarchy with unlimited depth, indent/outdent, collapse/expand, drag-and-drop, and keyboard reordering.
- Task types: normal, milestone, level-of-effort (LOE), hammock, recurring, split tasks.
- Rich field set (ID, UID, WBS code, descriptions, calendars, constraints, deadlines, percent complete, actuals, priority, codes, custom fields, segments, flags).
- Validation for hierarchy integrity, constraints feasibility, and unique IDs.

### 5.2 Dependencies
- Support FS/SS/FF/SF link types, leads/lags (time- and percent-based), multiple predecessors/successors, calendared lags, and validation for cycles and forbidden links.

### 5.3 Calendars
- Hierarchical calendars (global, project, resource, task) with working periods, exceptions, shifts, timezone awareness, and non-working timeline shading.

### 5.4 CPM Scheduling and Float
- Forward/backward pass respecting calendars and constraints, critical path identification, configurable near-critical threshold, float calculations, and deadline/constraint violation flags with worker-based recalculation.

### 5.5 Baselines
- Up to 10 baselines per project with snapshot data, visual overlays, variance columns, and baseline management actions.

### 5.6 Progress and Updating
- Support duration/physical/work progress models, multiple update modes, status date management, progress lines, out-of-sequence warnings, late task highlighting, and configurable lookahead windows.

### 5.7 Resources and Costs
- Resource types (labor, equipment, material), properties, assignments with calendars and roles, scheduling formulas, overallocation detection, basic leveling, cost aggregation, and EVM metrics (PV, EV, AC, SV, CV, SPI, CPI, EAC, ETC, TCPI).

### 5.8 Grid and Timeline
- PrimeVue DataTable grid with virtualization, inline editing, grouping, filtering, column controls.
- High-performance timeline with virtualized rendering, zoom, task bars (with progress/baselines/splits), dependency lines, non-working shading, status/now lines, constraint icons, critical highlighting, swimlanes, and rich interactions (drag, link creation, tooltips, context menus).

### 5.9 Editing, Undo/Redo, and Validation
- Inline/in-place editing, CRUD operations, WBS indent/outdent, copy/paste, undo/redo stack (>=50), transaction grouping, validation feedback.

### 5.10 Filters, Grouping, Sorting, Search
- Quick search, advanced filters, grouping by WBS or codes with aggregates, saved views.

### 5.11 Import/Export and Printing
- Import/export JSON, CSV (with mapping), Microsoft Project XML (best effort), optional Primavera P6 XML target, image/PDF export, print preview with layout controls.

### 5.12 Internationalization and Localization
- Externalized strings, locale-aware formatting, RTL support, timezone-aware scheduling.

### 5.13 Accessibility
- WCAG 2.1 AA compliance with keyboard navigation, ARIA roles, focus management, screen reader support.

### 5.14 Performance and Scale
- Target up to 50k tasks/250k dependencies with virtualization, canvas rendering, web workers, incremental recalculation, memory guardrails, and performance metrics.

### 5.15 Security and Reliability
- No unsafe eval/innerHTML, sanitized tooltips, robust error handling, safe parsers, deterministic IDs, import validation.

## 6. Data Model (TypeScript Interfaces)
- Detailed interfaces for Task, Dependency, Calendar, Resource, Assignment, BaselineSnapshot, and Project including required fields, optional properties, and embedded structures for constraints, progress, actuals, codes, and flags.

## 7. Public API
### Vue Component: `GanttModule`
- **Props**: `modelValue` (project, tasks, dependencies, calendars, optional resources/assignments), `options` (read-only, virtualization, baseline/critical toggles, zoom, leveling, undo stack, theming, locale/RTL/timezone), `columns`, and `templates` for custom rendering.
- **Emits**: updates, lifecycle (`ready`, `error`), task/dependency CRUD events, assignment changes, selection/viewport/zoom changes, import/export completion, calculation completion.
- **Methods**: CRUD helpers, baseline management, recalculation, critical path, zooming/scroller controls, import/export utilities, printing/PDF, EVM metrics, resource leveling.

### Slots
- Toolbar, left/right headers, rowTemplate, barTemplate for host customization.

## 8. UI and UX Requirements
- Two-pane layout with resizable splitter, PrimeVue components for editors/menus, Tailwind utility styling, smooth interactions, keyboard shortcuts.

## 9. Algorithms and Calculation Details
- CPM with constraint handling and calendared lags, resource leveling heuristics, EVM formulas, web worker offloading, debounced recalculation.

## 10. Import/Export Mapping
- JSON 1:1 with data model, CSV mapping wizard, Microsoft Project XML parsing/mapping with logging of unsupported features.

## 11. Error Handling and Logging
- Standardized error codes, warning vs blocking handling, telemetry hooks.

## 12. Accessibility
- ARIA roles, keyboard operations, focus styles, skip links, high-contrast mode support.

## 13. Internationalization
- Externalized strings, localized formats, RTL mirroring and dependency arrow adjustments.

## 14. Performance Acceptance Criteria
- Rendering and computation benchmarks (initial render <2s for 10k tasks, recalcs <200ms, memory <500MB).

## 15. Development and Architecture
- Component breakdown (GanttModule, GanttGrid, GanttTimeline, DependencyLayer, TimeRuler, overlays, WorkerBridge).
- Composables-based state management with change tracking and configurable debouncing.
- Canvas-based timeline rendering with hit-testing and caching.
- Tailwind theming with CSS variables for critical styling aspects.

## 16. Testing
- Vitest unit tests for algorithms and import/export, Vue Test Utils component tests, Playwright E2E for core flows and performance smoke tests, CI-enforced performance metrics.

## 17. Documentation
- API reference, data model guide, usage examples, import/export mappings, theming/customization, accessibility/shortcuts guides.

## 18. Build and Packaging
- ESM/UMD outputs with type definitions, peer dependencies (`vue`, `primevue`, `tailwindcss`), minimal CSS base, tree-shakeable modules, sourcemaps.

## 19. Security and Compliance
- Sanitization, CSP-friendly design, offline operation, guarded large file import, licensing compliance.

## 20. Acceptance Criteria
- Feature parity with MS Project/Primavera basics, performance targets, complete API, accessibility compliance, reliable import/export, high test coverage.

## 21. Delivery Plan and Milestones
1. Core data model, grid, timeline basics, CRUD, zoom/pan, JSON import/export, baselines, i18n, accessibility foundations.
2. Dependencies with leads/lags, calendars, CPM, float, critical path, non-working shading.
3. Resource model, assignments, costs, leveling, EVM.
4. Microsoft Project XML import/export, print/PDF, performance hardening, large dataset optimizations.
5. Theming, RTL, advanced filters/grouping, saved views, documentation, examples.

## 22. Risks and Mitigations
- Complex calendars/constraints (robust engine/tests), performance (canvas/workers/virtualization), import fidelity (documentation/logging), accessibility (keyboard alternatives, ARIA live regions).

## 23. Code Conventions
- TypeScript strict mode, ESLint/Prettier, Composition API with script setup, avoid direct DOM, event/method naming conventions.

## 24. Example Data Snippet (JSON)
```json
{
  "project": { "id": "p1", "name": "Site A", "calendarId": "cal_proj", "statusDate": "2025-01-31T00:00:00Z" },
  "calendars": [
    {
      "id": "cal_proj",
      "name": "5x8",
      "workWeek": {
        "1": { "working": true, "periods": [{ "start": "08:00", "end": "12:00" }, { "start": "13:00", "end": "17:00" }] },
        "2": { "working": true, "periods": [{ "start": "08:00", "end": "12:00" }, { "start": "13:00", "end": "17:00" }] },
        "3": { "working": true, "periods": [{ "start": "08:00", "end": "12:00" }, { "start": "13:00", "end": "17:00" }] },
        "4": { "working": true, "periods": [{ "start": "08:00", "end": "12:00" }, { "start": "13:00", "end": "17:00" }] },
        "5": { "working": true, "periods": [{ "start": "08:00", "end": "12:00" }, { "start": "13:00", "end": "17:00" }] }
      }
    }
  ],
  "tasks": [
    { "id": "t1", "name": "Mobilization", "type": "task", "start": "2025-02-03T08:00:00Z", "finish": "2025-02-05T17:00:00Z", "percentComplete": { "mode": "duration", "value": 0 } },
    { "id": "t2", "name": "Excavation", "type": "task", "start": "2025-02-06T08:00:00Z", "finish": "2025-02-12T17:00:00Z" },
    { "id": "t3", "name": "Foundation", "type": "task", "start": "2025-02-13T08:00:00Z", "finish": "2025-02-20T17:00:00Z" },
    { "id": "m1", "name": "Foundation Complete", "type": "milestone", "start": "2025-02-20T17:00:00Z", "finish": "2025-02-20T17:00:00Z" }
  ],
  "dependencies": [
    { "id": "d1", "predecessorId": "t1", "successorId": "t2", "type": "FS" },
    { "id": "d2", "predecessorId": "t2", "successorId": "t3", "type": "FS", "lag": { "value": 1, "unit": "d" } },
    { "id": "d3", "predecessorId": "t3", "successorId": "m1", "type": "FS" }
  ],
  "resources": [
    { "id": "r1", "name": "Concrete Crew", "type": "labor", "maxUnits": 1 },
    { "id": "r2", "name": "Excavator", "type": "equipment", "maxUnits": 1 }
  ],
  "assignments": [
    { "id": "a1", "taskId": "t2", "resourceId": "r2", "units": 1 },
    { "id": "a2", "taskId": "t3", "resourceId": "r1", "units": 1 }
  ]
}
```
