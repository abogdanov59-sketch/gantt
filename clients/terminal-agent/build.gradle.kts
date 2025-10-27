plugins {
    kotlin("jvm")
    kotlin("plugin.serialization")
    application
}

group = "com.example.platform"
version = "0.1.0"

application {
    mainClass.set("com.example.platform.terminal.TerminalAgentKt")
}

dependencies {
    implementation(project(":libs:common-models"))
    implementation(project(":libs:crypto-lib"))
    implementation(libs.bundles.ktor.client)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.logback.classic)

    testImplementation(kotlin("test"))
}
