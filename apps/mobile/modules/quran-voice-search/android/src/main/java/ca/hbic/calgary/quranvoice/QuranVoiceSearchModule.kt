package ca.hbic.calgary.quranvoice

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.exception.CodedException

class QuranVoiceSearchModule : Module() {
  private var recognizer: SpeechRecognizer? = null
  private val main = Handler(Looper.getMainLooper())
  private var generation = 0
  private val cap = Runnable { stop() }
  override fun definition() = ModuleDefinition {
    Name("QuranVoiceSearch")
    Events("onResult", "onEnd", "onError")
    Function("available") { _: String ->
      val context = appContext.reactContext
      context != null && Build.VERSION.SDK_INT >= 31 && SpeechRecognizer.isOnDeviceRecognitionAvailable(context)
    }
    AsyncFunction("start") { locale: String ->
      val context = appContext.reactContext ?: throw CodedException("Voice search is unavailable.")
      if (Build.VERSION.SDK_INT < 31 || !SpeechRecognizer.isOnDeviceRecognitionAvailable(context))
        throw CodedException("On-device voice search is unavailable. Typed search still works.")
      if (context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED)
        throw CodedException("Microphone permission is required for voice search.")
      stop(); generation += 1; val token = generation
      val speech = SpeechRecognizer.createOnDeviceSpeechRecognizer(context); recognizer = speech
      speech.setRecognitionListener(object : RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) {}
        override fun onBeginningOfSpeech() {}
        override fun onRmsChanged(rmsdB: Float) {}
        override fun onBufferReceived(buffer: ByteArray?) {}
        override fun onEndOfSpeech() {}
        override fun onEvent(eventType: Int, params: Bundle?) {}
        override fun onError(error: Int) {
          if (token == generation) { sendEvent("onError", mapOf("message" to "Could not hear a search. Retry or use typed search.")); stop() }
        }
        private fun emit(results: Bundle?, final: Boolean) {
          if (token != generation) return
          val text = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()
          if (!text.isNullOrBlank()) sendEvent("onResult", mapOf("text" to text, "final" to final))
          if (final) stop()
        }
        override fun onResults(results: Bundle?) { emit(results, true) }
        override fun onPartialResults(results: Bundle?) { emit(results, false) }
      })
      val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
        putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
        putExtra(RecognizerIntent.EXTRA_LANGUAGE, locale)
        putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
        putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
        putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
      }
      speech.startListening(intent); main.postDelayed(cap, 20_000)
    }.runOnQueue(expo.modules.kotlin.functions.Queues.MAIN)
    AsyncFunction("stop") { stop() }.runOnQueue(expo.modules.kotlin.functions.Queues.MAIN)
    OnActivityEntersBackground { main.post { stop() } }
    OnDestroy { main.post { stop() } }
  }
  private fun stop() {
    val ownedAudio = recognizer != null
    generation += 1; main.removeCallbacks(cap)
    recognizer?.cancel(); recognizer?.destroy(); recognizer = null
    if (ownedAudio) sendEvent("onEnd", emptyMap<String, Any>())
  }
}
