"""Independent local waveform-only baseline, never an expected-ayah prompt.

Official MIT Whisper weights through the existing isolated Transformers runtime.
No API, user recording, reference forcing, invented word times or native export.
"""
import base64
import hashlib
import json
import sys
from pathlib import Path


def main():
    root = Path(sys.argv[1]).resolve()
    if root != Path("output/quran-development/whisper-turbo-comparison").resolve():
        raise ValueError("Explicit ignored comparison directory required")
    sys.path.insert(0, str(Path("output/quran-development/qwen-comparison/libraries").resolve()))
    import numpy as np
    import torch
    import transformers
    from transformers import AutoProcessor, WhisperForConditionalGeneration

    manifest = json.loads((root / "assets/verified-manifest.json").read_text())
    if (manifest["repository"] != "openai/whisper-large-v3-turbo"
            or manifest["revision"] != "41f01f3fe87f28c78e2fbf8b568835947dd65ed9"
            or manifest["license"] != "MIT"
            or manifest["verifiedSha256"]["model.safetensors"] != "542566a422ae4f3fd23f1ba11add198fca01bbf82e66e6a2857b3f608b1eb9d1"):
        raise ValueError("Pinned official model provenance required")
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
        raise ValueError("Requested MPS runtime is unavailable")
    torch.set_num_threads(2)
    dtype = torch.float16 if device == "mps" and mode == "auto" else torch.float32
    processor = AutoProcessor.from_pretrained(root / "assets", local_files_only=True, trust_remote_code=False)
    model = WhisperForConditionalGeneration.from_pretrained(root / "assets", local_files_only=True,
        trust_remote_code=False, dtype=dtype, attn_implementation="sdpa").to(device).eval()
    print(json.dumps({"ready": True, "device": device, "dtype": str(dtype), "beamWidth": 5,
        "versions": {"torch": torch.__version__, "numpy": np.__version__, "transformers": transformers.__version__},
        "canonicalPrompt": False, "forcedAlignment": False}), flush=True)
    for line in sys.stdin:
        if len(line) > 192000 * 6:
            raise ValueError("Request exceeds bounded whole-utterance comparison")
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
            inputs = processor(pcm, sampling_rate=16000, return_tensors="pt", return_attention_mask=True).to(device, dtype)
            with torch.inference_mode():
                output = model.generate(**inputs, language="ar", task="transcribe", do_sample=False,
                    num_beams=5, max_new_tokens=128, return_timestamps=False)
            text = processor.batch_decode(output, skip_special_tokens=True)[0]
            eos = model.generation_config.eos_token_id
            eos = [eos] if isinstance(eos, int) else eos
            truncated = output.shape[1] >= 128 and int(output[0, -1]) not in (eos or [])
            print(json.dumps({"text": text, "generatedTokens": output.shape[1], "truncated": truncated,
                "wordTimestamps": None, "acousticConfidence": None}, ensure_ascii=False), flush=True)
            del inputs, output
        finally:
            pcm.fill(0)
            del data, pcm, request


if __name__ == "__main__":
    main()
