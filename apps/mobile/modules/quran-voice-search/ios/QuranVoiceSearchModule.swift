import ExpoModulesCore
import Speech
import AVFoundation

public class QuranVoiceSearchModule: Module {
    private let engine = AVAudioEngine()
    private var task: SFSpeechRecognitionTask?
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var cap: Timer?
    private var tapInstalled = false
    private var generation = 0
    public func definition() -> ModuleDefinition {
        Name("QuranVoiceSearch")
        Events("onResult", "onEnd", "onError")
        Function("available") { (locale: String) -> Bool in
            SFSpeechRecognizer(locale: Locale(identifier: locale))?.supportsOnDeviceRecognition == true
        }
        AsyncFunction("start") { (locale: String, promise: Promise) in
            self.stop(); let authorizationToken = self.generation
            SFSpeechRecognizer.requestAuthorization { status in
                DispatchQueue.main.async {
                    guard authorizationToken == self.generation else { promise.reject("VOICE_CANCELLED", "Voice search cancelled."); return }
                    guard status == .authorized else {
                        promise.reject("VOICE_PERMISSION", "Speech permission was declined. Typed Quran search still works."); return
                    }
                    do { try self.begin(locale); promise.resolve(nil) }
                    catch { promise.reject("VOICE_UNAVAILABLE", "On-device voice search is unavailable for this language. Typed search still works.") }
                }
            }
        }.runOnQueue(.main)
        AsyncFunction("stop") { self.stop() }.runOnQueue(.main)
        OnAppEntersBackground { DispatchQueue.main.async { self.stop() } }
        OnDestroy { DispatchQueue.main.async { self.stop() } }
    }
    private func begin(_ locale: String) throws {
        stop(); generation += 1; let token = generation
        guard AVAudioSession.sharedInstance().recordPermission == .granted,
              let recognizer = SFSpeechRecognizer(locale: Locale(identifier: locale)),
              recognizer.isAvailable, recognizer.supportsOnDeviceRecognition else { throw NSError(domain: "HBICVoice", code: 1) }
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.record, mode: .measurement, options: [.duckOthers])
        try session.setActive(true, options: .notifyOthersOnDeactivation)
        let req = SFSpeechAudioBufferRecognitionRequest()
        req.requiresOnDeviceRecognition = true
        req.shouldReportPartialResults = true
        request = req
        let input = engine.inputNode, format = input.outputFormat(forBus: 0)
        guard format.sampleRate > 0, format.channelCount > 0 else { stop(); throw NSError(domain: "HBICVoice", code: 2) }
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in req.append(buffer) }
        tapInstalled = true
        task = recognizer.recognitionTask(with: req) { result, error in
            DispatchQueue.main.async {
                guard token == self.generation else { return }
                if let result {
                    self.sendEvent("onResult", ["text": result.bestTranscription.formattedString, "final": result.isFinal])
                    if result.isFinal { self.stop() }
                } else if error != nil { self.sendEvent("onError", ["message": "Could not hear a search. Please try again or type."]); self.stop() }
            }
        }
        engine.prepare()
        do { try engine.start() } catch { stop(); throw error }
        cap = Timer.scheduledTimer(withTimeInterval: 20, repeats: false) { _ in self.stop() }
    }
    private func stop() {
        let ownedAudio = engine.isRunning || tapInstalled || task != nil
        generation += 1; cap?.invalidate(); cap = nil
        engine.stop()
        if tapInstalled { engine.inputNode.removeTap(onBus: 0); tapInstalled = false }
        request?.endAudio(); task?.cancel(); request = nil; task = nil
        if ownedAudio { try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation) }
        if ownedAudio { sendEvent("onEnd", [:]) }
    }
}
