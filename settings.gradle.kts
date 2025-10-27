pluginManagement {
    repositories {
        gradlePluginPortal()
        mavenCentral()
    }
}

rootProject.name = "modular-platform"

include(
    "libs:common-models",
    "libs:crypto-lib",
    "services:identity-service",
    "services:kms-service",
    "services:data-vault-service",
    "services:sandbox-service",
    "services:workflow-service",
    "services:blockchain-gateway",
    "services:audit-service",
    "services:api-gateway",
    "clients:terminal-agent"
)
