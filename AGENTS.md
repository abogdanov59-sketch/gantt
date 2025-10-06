# Agent Instructions

## Required checks
- Always run `npm install` before making changes. If the install fails because the environment cannot download PrimeVue packages, note the exact failure message and suggest configuring the npm registry or credentials in the summary.
- After installing dependencies, run the following commands and include their results in the Testing section:
  - `npm run lint`
  - `npm run type-check`
  - `npm test`
  - `npm run build`
- If any command cannot be executed due to environment restrictions, state the limitation explicitly and recommend the remediation steps from the README troubleshooting section.

## Documentation updates
- When dependency installation issues occur, update documentation with clear remediation steps if they are missing.
