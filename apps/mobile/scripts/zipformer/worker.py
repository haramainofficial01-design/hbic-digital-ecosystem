"""Isolated streaming Quran acoustics experiment, not a shipped assessment.

Quran-Lab No-Profit License 1.2 applies to this experiment; see LICENSE.
PCM only reaches ASR. No expected reference, language model or forced alignment.
Automatic feedback can be wrong and never replaces a qualified Quran teacher.
"""
import base64
import hashlib
import json
import sys
from pathlib import Path


def main():
    root = Path(sys.argv[1]).resolve()
    if root != Path("output/quran-development/zipformer-comparison").resolve():
        raise ValueError("Explicit isolated experimental directory required")
    sys.path.insert(0, str(root / "libraries"))
    import numpy as np
    import onnxruntime as ort
    import kaldi_native_fbank as knf

    variant = sys.argv[3] if len(sys.argv) > 3 else "v3"
    if variant not in ("v3", "v3.1"):
        raise ValueError("Explicit approved streaming variant required")
    research_benchmark = len(sys.argv) > 4 and sys.argv[4] == "research-benchmark"
    if len(sys.argv) > 4 and not research_benchmark:
        raise ValueError("Explicit research-only waveform scope required")
    max_samples = 16000 * 90 if research_benchmark else 192000
    model_name = "zipformer_p_arabic_v3.int8.onnx" if variant == "v3" else "zipformer_p_arabic_v3.1.int8.onnx"
    model_hash = "6a5ddafa9c5e5c01260d30264031b341785bdc152e9ef1d569b41c8c278508eb" if variant == "v3" else "31755836528da336a6192121cd7bc82cb41752dddb65566fd000b89c8686da6b"
    manifest_name = "verified-manifest.json" if variant == "v3" else "verified-manifest-v31.json"
    manifest = json.loads((root / "assets" / manifest_name).read_text())
    if (manifest["repository"] != "Quran-Lab/zipformer_p-arabic-v3"
            or manifest["revision"] != "3da514fc833b22c902ee466a7710cf399896f2f0"
            or manifest["license"] != "Quran-Lab No-Profit License 1.2"
            or manifest["verifiedSha256"][model_name] != model_hash):
        raise ValueError("Pinned approved model provenance required")
    for name, expected in manifest["verifiedSha256"].items():
        if Path(name).name != name:
            raise ValueError("Unexpected model asset path")
        with (root / "assets" / name).open("rb") as stream:
            if hashlib.file_digest(stream, "sha256").hexdigest() != expected:
                raise ValueError("Unverified approved model asset")
    if ort.__version__ != "1.24.3" or knf.__version__ != "1.22.3":
        raise ValueError("Pinned acoustic runtime required")
    scale = int(sys.argv[2])
    if scale not in (1, 32768):
        raise ValueError("Explicit disclosed fbank input-scale experiment required")
    options = ort.SessionOptions()
    options.intra_op_num_threads = 2
    options.inter_op_num_threads = 1
    session = ort.InferenceSession(str(root / "assets" / model_name), options, providers=["CPUExecutionProvider"])
    meta = session.get_modelmeta().custom_metadata_map
    if meta.get("model_type") != "zipformer2" or meta.get("T") != "61" or meta.get("decode_chunk_len") != "48":
        raise ValueError("Exact streaming interface required")
    inputs = session.get_inputs()
    outputs = session.get_outputs()
    if len(inputs) != 99 or len(outputs) != 99 or inputs[0].shape != ["N", 61, 80] or outputs[0].name != "log_probs":
        raise ValueError("Exact 99-input/output streaming contract required")
    tokens = {}
    for line in (root / "assets/tokens.txt").read_text().splitlines():
        symbol, number = line.rsplit(" ", 1)
        tokens[int(number)] = symbol
    if set(tokens) != set(range(251)) or tokens[250] != "<blank>":
        raise ValueError("Authoritative tokens.txt required; blank is 250, not zero")
    print(json.dumps({"ready": True, "variant": variant, "device": "cpu", "versions": {"onnxruntime": ort.__version__, "kaldiNativeFbank": knf.__version__},
        "featureType": "kaldi-fbank-povey", "inputScale": scale, "chunkFrames": 48, "blankId": 250,
        "canonicalPrompt": False, "forcedAlignment": False, "wordRecognitionQualified": False}), flush=True)
    for line in sys.stdin:
        if len(line) > max_samples * 6:
            raise ValueError("Request exceeds bounded acoustic comparison")
        request = json.loads(line)
        if set(request) != {"pcm"}:
            raise ValueError("Only waveform is accepted, not a reference answer")
        data = bytearray(base64.b64decode(request["pcm"], validate=True))
        if not (16000 if research_benchmark else 64000) <= len(data) <= max_samples * 4 or len(data) % 4:
            raise ValueError("Bounded 16 kHz mono float PCM required")
        pcm = np.frombuffer(data, dtype="<f4")
        if not np.isfinite(pcm).all() or np.abs(pcm).max() > 1.00001:
            raise ValueError("Invalid real acoustic samples")
        features = None
        states = {}
        chunks = []
        try:
            opts = knf.FbankOptions()
            opts.frame_opts.samp_freq = 16000
            opts.frame_opts.dither = 0
            opts.frame_opts.snip_edges = False
            opts.frame_opts.window_type = "povey"
            opts.mel_opts.num_bins = 80
            fbank = knf.OnlineFbank(opts)
            # Fixed settling tail, disclosed and not another recitation.
            wave = np.concatenate((pcm * scale, np.zeros(9600, dtype=np.float32)))
            fbank.accept_waveform(16000, wave.tolist())
            fbank.input_finished()
            features = np.stack([fbank.get_frame(i) for i in range(fbank.num_frames_ready)]).astype(np.float32)
            wave.fill(0)
            for info in inputs[1:]:
                shape = [1 if d == "N" else d for d in info.shape]
                if not all(isinstance(d, int) and d > 0 for d in shape):
                    raise ValueError("Unresolved streaming state dimension")
                states[info.name] = np.zeros(shape, dtype=np.int64 if info.type == "tensor(int64)" else np.float32)
            for start in range(0, len(features), 48):
                block = np.full((1, 61, 80), np.log(1e-10), dtype=np.float32)
                available = min(61, len(features) - start)
                block[0, :available] = features[start:start + available]
                values = session.run(None, {"x": block, **states})
                probs = values[0]
                if probs.shape != (1, 12, 251) or not np.isfinite(probs).all():
                    raise ValueError("Invalid actual streaming posterior")
                chunks.append(probs[0].copy())
                for info, value in zip(outputs[1:], values[1:]):
                    key = info.name.removeprefix("new_")
                    if key not in states or value.shape != states[key].shape:
                        raise ValueError("Streaming state contract changed")
                    states[key].fill(0)
                    states[key] = value
                block.fill(0)
            acoustic = np.concatenate(chunks)
            ids = acoustic.argmax(axis=1).tolist()
            sequence = []
            previous = -1
            for token in ids:
                if token != 250 and token != previous:
                    sequence.append(token)
                previous = token
            print(json.dumps({"phonemes": "".join(tokens[i] for i in sequence), "tokenIds": sequence,
                "timeSteps": len(acoustic), "vocabSize": 251, "blankId": 250,
                "logprobs": base64.b64encode(acoustic.astype("<f4").tobytes()).decode(),
                "addedQuietSamples": 9600, "referenceConditioned": False}, ensure_ascii=False), flush=True)
            acoustic.fill(0)
        finally:
            pcm.fill(0)
            if features is not None:
                features.fill(0)
            for state in states.values():
                state.fill(0)
            for chunk in chunks:
                chunk.fill(0)
            del data, pcm, request


if __name__ == "__main__":
    main()
