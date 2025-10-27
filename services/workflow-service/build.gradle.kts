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
    implementation(libs.bundles.ktor.server)
    implementation(libs.logback.classic)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.flowable.engine)
    implementation(libs.flowable.dmn)
    implementation(libs.h2)

    testImplementation(kotlin("test"))
    testImplementation(libs.ktor.server.tests)
}

ktor {
    fatJar {
        archiveFileName.set("workflow-service.jar")
    }
}
