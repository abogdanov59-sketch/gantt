# Gantt Module Examples

The `examples` directory contains small Vue 3 applications that demonstrate how to integrate
the construction scheduling Gantt module in different scenarios. Each example is self-contained
and focuses on a specific feature set from the technical specification.

## Available Examples

### Basic Timeline (`examples/basic`)
A minimal configuration that renders a short schedule with three activities and a milestone.
It highlights how to bind the component with `v-model`, listen for calculation events, and
control zoom levels.

### Resource Allocation (`examples/resource-allocation`)
Extends the basic example by assigning resources, costs, and baselines. It showcases how to
consume the exposed component API to add tasks and assignments at runtime.

### Progress Tracking (`examples/progress-tracking`)
Demonstrates multiple baselines, progress updates using duration percent complete, and
status-date driven late-task highlighting.

## Running an Example

1. Install dependencies in the project root (requires network access):

   ```bash
   npm install
   ```

2. From the project root, start Vite with the desired example entry point. For instance, to run
   the basic example:

   ```bash
   npm run dev -- --config examples/basic/vite.config.ts
   ```

   Each example exposes its own `vite.config.ts` file referencing the library source via
   relative paths, so they can be executed without publishing the package first.

3. Open the provided local URL in the browser.

> **Tip:** The examples intentionally avoid additional dependencies so they can serve as
> blueprints for integrating the module into a host application with PrimeVue and Tailwind
> already configured.
