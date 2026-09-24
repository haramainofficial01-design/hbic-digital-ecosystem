plugins {
  id("com.android.application")
  id("org.jetbrains.kotlin.android")
  id("org.jetbrains.kotlin.plugin.compose")
}

android {
  namespace = "ca.hbic.calgary.app"
  compileSdk = 36

  defaultConfig {
    applicationId = "ca.hbic.calgary.app"
    minSdk = 30
    targetSdk = 36
    versionCode = 36015101
    versionName = "1.5.1-wear.1"
  }

  buildFeatures { compose = true }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }
  kotlinOptions { jvmTarget = "17" }

  sourceSets["main"].res.srcDir("../../mobile/android/app/src/main/res")

  buildTypes {
    getByName("release") {
      isMinifyEnabled = true
      isShrinkResources = true
      proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
    }
  }
}

dependencies {
  // Wear Material 3 1.6.2 is built against Compose 1.9.0. Keep the BOM on
  // that compatible line while the phone project remains on compileSdk 36.
  val composeBom = platform("androidx.compose:compose-bom:2025.08.00")
  implementation(composeBom)
  implementation("androidx.activity:activity-compose:1.13.0")
  implementation("androidx.compose.ui:ui")
  implementation("androidx.compose.ui:ui-tooling-preview")
  implementation("androidx.wear.compose:compose-material3:1.6.2")
  implementation("androidx.wear.compose:compose-foundation:1.6.2")
  implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.4")
  implementation("androidx.work:work-runtime-ktx:2.10.4")
  implementation("com.google.android.gms:play-services-wearable:20.0.1")
  implementation("androidx.wear.tiles:tiles:1.6.2")
  implementation("androidx.wear.protolayout:protolayout:1.4.2")
  implementation("androidx.wear.protolayout:protolayout-material:1.4.2")
  implementation("androidx.wear.watchface:watchface-complications-data-source-ktx:1.2.1")
  implementation("com.google.guava:guava:33.4.8-android")

  debugImplementation("androidx.compose.ui:ui-tooling")
  debugImplementation("androidx.compose.ui:ui-test-manifest")
  testImplementation("junit:junit:4.13.2")
  testImplementation("org.json:json:20250517")
}
