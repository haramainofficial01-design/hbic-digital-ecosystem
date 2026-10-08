/* Development Hermes evaluator. GET-only loopback corpus; real native ONNX,
 * never fake feedback, microphone access, HBIC accounts, or saved audio.
 * Invoke using the local CDP helper and poll __hbicRecitationQualification.
 */
(function () {
  function module(name) {
    var found = Array.from(globalThis.__r.getModules()).find(function (value) {return value[1].verboseName === name;});
    if (!found) throw Error('Quran development module not loaded: ' + name);
    return globalThis.__r(found[0]);
  }
  var engine = module('src/quran/reciteAssistEngine.ts'), tracking = module('src/quran/recitationTracking.ts');
  var report = globalThis.__hbicRecitationQualification = {ready: null, microphoneUsed: false,
    scope: 'Controlled publicly licensed waveform edits, NOT natural learner qualification', results: [], progress: []};
  var started = Date.now();
  engine.acquireReciteAssist(function (message) {report.progress.push(message);}).then(function (lease) {
    report.preparationMs = Date.now() - started;
    return fetch('http://127.0.0.1:3011/cases').then(function (response) {
      if (!response.ok) throw Error('Loopback evaluation corpus unavailable'); return response.json();
    }).then(function (cases) {
      if (globalThis.__hbicRecitationCaseLimit) cases = cases.slice(0, globalThis.__hbicRecitationCaseLimit);
      return cases.reduce(function (previous, entry) {
        return previous.then(function () {
          return fetch('http://127.0.0.1:3011/audio/' + entry.index).then(function (response) {
            if (!response.ok) throw Error('Evaluation waveform unavailable'); return response.arrayBuffer();
          }).then(function (bytes) {
            entry.category = entry.name.split(' ')[0]; entry.positive = entry.expected !== null;
            entry.sourceId = entry.sourceHash;
            var repeatedWord = entry.expectedIndex !== null ? tracking.recitationDisplayWords(entry.text)[entry.expectedIndex] : '';
            var source = new Float32Array(bytes), total = entry.paddedTotalSamples;
            if (!Number.isSafeInteger(total) || total < source.length || total > 16000 * 120 || total % 40000) throw Error('Invalid evaluation duration');
            var pcm = new Float32Array(total); pcm.set(source); source.fill(0);
            var tracker = new tracking.RecitationTracker(), observations = [], heard = '', anyAlert = false, detected = false, latency = [];
            var task = Promise.resolve();
            for (var end = 40000; end <= total; end += 40000) (function (boundary) {
              task = task.then(function () {
                var start = Math.max(0, boundary - 96000), slice = pcm.slice(start, boundary), begin = Date.now();
                return lease.recognize(slice, start).then(function (result) {
                  var duration = Date.now() - begin, feedback = tracker.observe(entry.text, result), tracked = tracker.snapshot();
                  anyAlert = anyAlert || feedback.differences.length > 0; latency.push(duration);
                  var repeated = entry.category === 'repetition' && tracked.some(function (word, index) {
                    return index > 0 && tracking.recitationLexeme(word.text) === tracking.recitationLexeme(repeatedWord)
                      && tracking.recitationLexeme(tracked[index - 1].text) === tracking.recitationLexeme(word.text);
                  });
                  detected = detected || feedback.differences.some(function (difference) {
                    return difference.kind === entry.category && (entry.category === 'repetition' ? repeated : difference.index === entry.expectedIndex);
                  });
                  heard = tracked.map(function (word) {return word.text;}).join(' ');
                  observations.push({endSample: boundary, text: result.text, quality: result.quality, feedback: feedback, milliseconds: duration});
                }).finally(function () {slice.fill(0);});
              });
            })(end);
            return task.then(function () {
              report.results.push({name: entry.name, category: entry.category, sourceId: entry.sourceId, split: entry.split,
                positive: entry.positive, expectedIndex: entry.expectedIndex, anyAlert: anyAlert, detected: detected,
                heard: heard, latencyMs: latency, observations: observations});
            }).finally(function () {pcm.fill(0);});
          });
        });
      }, Promise.resolve());
    }).finally(function () {return lease.dispose();}).then(function () {
      report.ready = true; report.diagnostics = engine.reciteAssistDiagnostics();
      report.elapsedMs = Date.now() - started;
    });
  }).catch(function (error) {report.ready = false; report.error = String(error);});
  return 'Actual native recitation qualification started; no microphone enabled';
})()
