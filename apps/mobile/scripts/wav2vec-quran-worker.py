"""Real independent waveform-only Quran character CTC comparison.

No expected ayah, language model, forced alignment or online inference. The
canonical-trained checkpoint may still restore mistakes; measure, do not assume.
"""
import base64
import hashlib
import json
import sys
from pathlib import Path


def main():
    root = Path(sys.argv[1]).resolve()
    if root != Path("output/quran-development/wav2vec-quran-comparison").resolve():
        raise ValueError("Explicit ignored comparison directory required")
    sys.path.insert(0, str(Path("output/quran-development/qwen-comparison/libraries").resolve()))
    import numpy as np
    import torch
    import transformers
    from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

    manifest = json.loads((root / "assets/verified-manifest.json").read_text())
    if (manifest["repository"] != "rabah2026/wav2vec2-large-xlsr-53-arabic-quran-v_final"
            or manifest["revision"] != "b03a268c6ba1a693752307325ab376c86c3b12da"
            or manifest["license"] != "Apache-2.0"
            or manifest["verifiedSha256"]["model.safetensors"] != "bf65674a26eb4ef7042cedade96c3c8f8cbd04f3a7d1a68eadceec8ed0f99ecb"):
        raise ValueError("Pinned Quran model provenance required")
    for name, expected in manifest["verifiedSha256"].items():
        if Path(name).name != name:
            raise ValueError("Unexpected asset path")
        with (root / "assets" / name).open("rb") as stream:
            if hashlib.file_digest(stream, "sha256").hexdigest() != expected:
                raise ValueError("Unverified model asset")
    if transformers.__version__ != "5.19.0":
        raise ValueError("Pinned comparison runtime required")
    mode = sys.argv[2]
    if mode not in ("auto", "cpu-f32", "mps-f32"):
        raise ValueError("Explicit supported runtime required")
    device = "cpu" if mode == "cpu-f32" or not torch.backends.mps.is_available() else "mps"
    if mode == "mps-f32" and device != "mps":
        raise ValueError("Requested MPS runtime unavailable")
    torch.set_num_threads(2)
    processor = Wav2Vec2Processor.from_pretrained(root / "assets", local_files_only=True, trust_remote_code=False)
    model = Wav2Vec2ForCTC.from_pretrained(root / "assets", local_files_only=True,
        trust_remote_code=False, dtype=torch.float32, attn_implementation="eager").to(device).eval()
    print(json.dumps({"ready": True, "device": device, "dtype": "torch.float32", "decoding": "greedy-character-ctc",
        "versions": {"torch": torch.__version__, "numpy": np.__version__, "transformers": transformers.__version__},
        "canonicalPrompt": False, "forcedAlignment": False}), flush=True)
    for line in sys.stdin:
        if len(line) > 192000 * 6:
            raise ValueError("Request exceeds bounded comparison")
        request = json.loads(line)
        if set(request) != {"pcm"}:
            raise ValueError("Only PCM is accepted, not an expected answer")
        data = bytearray(base64.b64decode(request["pcm"], validate=True))
        if not 64000 <= len(data) <= 192000 * 4 or len(data) % 4:
            raise ValueError("Bounded 16 kHz mono float PCM required")
        pcm = np.frombuffer(data, dtype="<f4")
        if not np.isfinite(pcm).all() or np.abs(pcm).max() > 1.00001:
            raise ValueError("Invalid actual acoustic samples")
        try:
            inputs = processor(pcm, sampling_rate=16000, return_tensors="pt", return_attention_mask=True).to(device)
            with torch.inference_mode():
                logits = model(**inputs).logits
                ids = logits.argmax(dim=-1)
            text = processor.batch_decode(ids, skip_special_tokens=True)[0]
            print(json.dumps({"text": text, "generatedTokens": int(ids.shape[1]), "truncated": False,
                "wordTimestamps": None, "acousticConfidence": None}, ensure_ascii=False), flush=True)
            del inputs, logits, ids
        finally:
            pcm.fill(0)
            del data, pcm, request


if __name__ == "__main__":
    main()
