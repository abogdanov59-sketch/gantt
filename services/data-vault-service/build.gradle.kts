plugins {
    kotlin("jvm")
    kotlin("plugin.serialization")
    id("io.ktor.plugin")
    application
}

group = "com.example.platform"
version = "0.1.0"

application {
    mainClass.set("io.ktor.server.netty.EngineMain")
}

dependencies {
    implementation(project(":libs:common-models"))
    implementation(project(":libs:crypto-lib"))
    implementation(libs.bundles.ktor.server)
    implementation(libs.logback.classic)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.kafka.clients)

    testImplementation(kotlin("test"))
    testImplementation(libs.ktor.server.tests)
}

ktor {
    fatJar {
        archiveFileName.set("data-vault-service.jar")
    }
}
