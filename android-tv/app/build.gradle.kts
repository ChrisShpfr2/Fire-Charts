plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val terminalUrl = providers.gradleProperty("TERMINAL_URL")
    .orElse(System.getenv("TERMINAL_URL") ?: "https://ais-pre-foywkngep6ipdhdrjifkll-853935803100.europe-west2.run.app")
    .get()

android {
    namespace = "com.apex4k.financialtv"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.apex4k.financialtv"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        buildConfigField("String", "TERMINAL_URL", "\"$terminalUrl\"")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        buildConfig = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.webkit:webkit:1.11.0")
}
