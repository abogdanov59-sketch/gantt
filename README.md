# Modular Asset Platform MVP

This repository contains a Kotlin/Java based foundation for a modular, security-first asset lifecycle platform. The codebase provides service skeletons, cryptographic utilities, workflow orchestration, and developer tooling that align with the architectural goals described in the specification.

## Project layout

```
.
├── build.gradle.kts           # Root Gradle configuration
├── settings.gradle.kts        # Multi-module declaration
├── gradle/libs.versions.toml  # Version catalog
├── libs/
│   ├── common-models          # Shared DTOs and envelope models
│   └── crypto-lib             # Envelope encryption, HKDF, blind index helpers
├── services/
│   ├── identity-service       # Tenant and policy skeleton
│   ├── kms-service            # In-memory KMS with wrap/unwrap/derive APIs
│   ├── data-vault-service     # Encrypted asset store with blind indexes
│   ├── sandbox-service        # Session lifecycle and SSK derivation
│   ├── workflow-service       # Flowable BPMN/DMN orchestration facade
│   ├── blockchain-gateway     # Hyperledger Fabric gateway scaffold
│   ├── audit-service          # Immutable audit chain
│   └── api-gateway            # Aggregation façade with HTTP client
└── clients/
    └── terminal-agent         # CLI skeleton for terminal submissions
```

Each service is a Ktor application using Kotlin serialization and structured logging. The `workflow-service` embeds Flowable engines and autodeploys BPMN/DMN artifacts on startup. The `crypto-lib` module provides AES-GCM envelope support, AES key wrapping, HKDF-based session key derivation, and HMAC blind index helpers.

## Getting started

1. Ensure Java 21+ and Gradle 8.14+ are available (Gradle Wrapper can be generated with `gradle wrapper`).
2. Build the monorepo:
   ```bash
   ./gradlew build
   ```
3. Run an individual service, for example the KMS service:
   ```bash
   ./gradlew :services:kms-service:run
   ```
4. Example asset creation (after starting the KMS and Data Vault services):
   ```bash
   curl -X POST http://localhost:8082/vault/assets \
     -H 'Content-Type: application/json' \
     -d '{
       "tenantId": "tenant-a",
       "ownerOrg": "org-1",
       "type": "ORDER",
       "metadata": "sample",
       "payload": "Hello world",
       "searchableFields": {"orderNumber": "PO-001"}
     }'
   ```

## Highlights

- **Security primitives** – AES-256-GCM envelope encryption, AES key wrap, HKDF, blind indexes.
- **In-memory KMS** – Issuing, rotating, and deriving tenant keys to emulate HSM-backed operations.
- **Sandbox lifecycle** – Session creation with TTL, SSK derivation, and closure semantics.
- **Workflow orchestration** – Flowable BPMN/DMN deployment with REST APIs for process and decision execution.
- **Ledger gateway** – Placeholder Fabric transaction submission service.
- **Audit chain** – WORM audit log with hash chaining.
- **API façade** – Sample aggregator that orchestrates vault interactions.
- **Terminal agent** – Command-line client that signs payloads and posts to the gateway.

## Next steps

- Replace in-memory implementations with real integrations (Keycloak, Infisical, Hyperledger Fabric, PostgreSQL, Kafka, MinIO).
- Add Docker Compose environment and Testcontainers-based integration tests.
- Extend API surface with full DTO coverage (orders, shipments, lab reports, grants).
- Harden security (mTLS, JWT validation, rate limiting) and add observability (tracing, metrics).

The code provides a scaffold for iterating towards the full modular platform described in the specification while keeping cryptographic guarantees and service boundaries explicit.
