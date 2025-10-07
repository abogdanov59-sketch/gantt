# Gantt Module

This repository contains an installable Vue 3 library that implements the construction-focused Gantt chart module described in the accompanying [technical specification](docs/technical-spec.md). The package bundles grid, timeline, worker-based CPM engine, and supporting utilities so it can be embedded in any PrimeVue + TailwindCSS project.

## Getting Started

Install dependencies and build the library using your preferred package manager. The module expects the
following peer packages in the host application: `vue@^3.4`, `primevue@^4.4`, `tailwindcss@^3.4`, and
`primeicons@^7`.

```bash
npm install
npm run build
```

To run the automated tests:

```bash
npm test
```

### Troubleshooting installs and tests

The project depends on the PrimeVue component suite and its theme package. If `npm install` fails with
messages such as `E401: Unable to authenticate, need: Bearer authorization_uri` or `registry access to
@primevue/themes is forbidden`, ensure the following:

1. You are signed in to npm and have access to the PrimeVue packages.
2. Your `.npmrc` or environment variables point to the public npm registry for the PrimeVue scope:

   ```bash
   npm config set @primevue:registry https://registry.npmjs.org/
   ```

3. If your organization mirrors npm packages, add the appropriate auth token:

   ```bash
   npm set //registry.npmjs.org/:_authToken="<YOUR_TOKEN>"
   ```

After dependencies install successfully, run the full verification suite before opening a pull request:

```bash
npm run lint
npm run type-check
npm test
npm run build
```

Document any deviations or environment-specific workarounds in your change summary so others can reproduce the steps.

## Usage Example

```ts
import { createApp, ref } from 'vue'
import PrimeVue from 'primevue/config'
import { GanttModule } from '@gantt/construction-scheduler'
import '@gantt/construction-scheduler/dist/style.css'

const app = createApp({
  setup() {
    const model = ref({
      project: {
        id: 'p1',
        name: 'Site A',
        calendarId: 'cal_proj',
        statusDate: '2025-01-31T00:00:00Z',
        settings: {
          progressMode: 'duration',
          nearCriticalThresholdDays: 2
        }
      },
      calendars: [/* ... */],
      tasks: [/* ... */],
      dependencies: [/* ... */]
    })

    return { model }
  },
  template: `<GanttModule v-model="model" />`
})

app.use(PrimeVue)
app.mount('#app')
```

Additional runnable examples covering basic usage, resource allocation, and progress tracking
are available under [`examples/`](examples/README.md). Each example has its own Vite config so
you can launch them individually from the project root:

```bash
npm run dev:example:basic      # http://localhost:5174
npm run dev:example:resources  # http://localhost:5175
npm run dev:example:progress   # http://localhost:5176
```

## Scripts

- `npm run dev` – run the library playground (coming soon).
- `npm run build` – build the distributable library bundle with Vite.
- `npm test` – run Vitest unit tests for the scheduling engine.
- `npm run type-check` – validate the TypeScript definitions.
- `npm run dev:example:*` – launch the example applications listed above.

## Project Structure

- `src/components` – Vue components composing the grid, timeline, dependency layer, and toolbar hooks.
- `src/composables` – composition utilities exposing the scheduling API and worker bridge.
- `src/utils` – calendar engine, CPM scheduler, UUID helper, and future support functions.
- `src/worker` – web worker entry points for offloading CPM calculations.
- `tests` – Vitest unit tests and fixtures.

Refer to the [technical specification](docs/technical-spec.md) for an in-depth breakdown of features, non-functional requirements, and roadmap milestones.
